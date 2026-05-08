export interface GitHubFile {
  path: string;
  content: string;
}

export class GitHubSyncError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GitHubSyncError';
  }
}

export const githubSyncService = {
  async request(endpoint: string, method: string, token: string, body?: any, logCallback?: (msg: string) => void) {
    const url = `https://api.github.com${endpoint}`;
    
    // Use AbortController for a 15-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    if (logCallback) logCallback(`> Executing ${method} ${url}...`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
          let errorMsg = `GitHub API Error: ${response.status} ${response.statusText}`;
          try {
              const errorData = await response.json();
              if (errorData.message) errorMsg += ` - ${errorData.message}`;
          } catch (e) {}
          throw new GitHubSyncError(errorMsg, response.status);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new GitHubSyncError(`GitHub API Timeout: The request to ${url} took longer than 15 seconds.`, 408);
      }
      throw e;
    }
  },

  async testConnection(owner: string, repo: string, token: string) {
    // Just fetch repo details to test token and access
    await this.request(`/repos/${owner}/${repo}`, 'GET', token);
  },

  async pushAtomic(owner: string, repo: string, branch: string, token: string, files: GitHubFile[], logCallback: (msg: string) => void) {
    try {
      logCallback(`[1/5] Fetching latest commit for branch '${branch}'...`);
      let latestCommitSha: string | null = null;
      let baseTreeSha: string | null = null;

      try {
        const refData = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, 'GET', token, undefined, logCallback);
        latestCommitSha = refData.object.sha;
        logCallback(`✓ Latest commit SHA: ${latestCommitSha.substring(0,7)}`);
      } catch (error: any) {
        if (error.status === 409 && error.message.includes('Git Repository is empty')) {
          logCallback(`ℹ️ Repository is empty. Initializing...`);
          await this.request(`/repos/${owner}/${repo}/contents/README.md`, 'PUT', token, {
            message: 'Initialize repository',
            content: btoa('# Initialized by System Sync\n'),
            branch: branch
          }, logCallback);
          const refData = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, 'GET', token, undefined, logCallback);
          latestCommitSha = refData.object.sha;
          logCallback(`✓ Initial commit SHA: ${latestCommitSha.substring(0,7)}`);
        } else {
          throw error;
        }
      }

      if (latestCommitSha) {
        logCallback(`[2/5] Fetching base tree SHA...`);
        const commitData = await this.request(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, 'GET', token, undefined, logCallback);
        baseTreeSha = commitData.tree.sha;
        logCallback(`✓ Base tree SHA: ${baseTreeSha.substring(0,7)}`);
      } else {
        logCallback(`[2/5] Skipping base tree fetch (initial commit).`);
      }

      logCallback(`[3/5] Creating new tree with ${files.length} files...`);
      const treeParams: any = {
        // Ensure path doesn't start with /
        tree: files.map(file => ({
          path: file.path.replace(/^\/+/, ''), 
          mode: '100644', // Make sure it's 100644
          type: 'blob',
          content: file.content
        }))
      };
      if (baseTreeSha) {
        treeParams.base_tree = baseTreeSha;
      }
      const newTreeData = await this.request(`/repos/${owner}/${repo}/git/trees`, 'POST', token, treeParams, logCallback);
      const newTreeSha = newTreeData.sha;
      logCallback(`✓ New tree created successfully. SHA: ${newTreeSha.substring(0,7)}`);

      logCallback(`[4/5] Creating new commit...`);
      const commitParams: any = {
        message: `Auto-sync from Admin Panel (${new Date().toISOString()})`,
        tree: newTreeSha,
      };
      if (latestCommitSha) {
        commitParams.parents = [latestCommitSha];
      }
      const newCommitData = await this.request(`/repos/${owner}/${repo}/git/commits`, 'POST', token, commitParams, logCallback);
      const newCommitSha = newCommitData.sha;
      logCallback(`✓ New commit created. SHA: ${newCommitSha.substring(0,7)}`);

      if (latestCommitSha) {
        logCallback(`[5/5] Updating branch reference '${branch}'...`);
        await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, 'PATCH', token, {
          sha: newCommitSha,
          force: false
        }, logCallback);
        logCallback(`✓ Branch updated. Atomic sync complete!`);
      } else {
        logCallback(`[5/5] Creating branch reference '${branch}'...`);
        await this.request(`/repos/${owner}/${repo}/git/refs`, 'POST', token, {
          ref: `refs/heads/${branch}`,
          sha: newCommitSha
        }, logCallback);
        logCallback(`✓ Branch created. Atomic sync complete!`);
      }

    } catch (error: any) {
      logCallback(`ERROR: ${error.message}`);
      throw error;
    }
  }
};
