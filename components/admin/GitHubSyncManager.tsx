import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../ToastProvider';
import { 
    CodeBracketIcon, 
    ArrowsUpDownIcon, 
    CheckCircleIcon,
    XCircleIcon
} from '../Icons';
import { encryptionService } from '../../services/encryptionService';
import { githubSyncService, GitHubFile } from '../../services/githubSyncService';

const GitHubSyncManager: React.FC = () => {
    const { addToast } = useToast();
    const [patInfo, setPatInfo] = useState('');
    const [owner, setOwner] = useState('hethong5tang');
    const [repo, setRepo] = useState('hethong5tangrepo');
    const [branch, setBranch] = useState('main');
    
    // Status
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
    const [logs, setLogs] = useState<string[]>([
        'System initialized.',
        'Ready to establish GitHub connection...'
    ]);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load encrypted token from storage
        const savedPat = localStorage.getItem('GITHUB_PAT_ENC');
        if (savedPat) {
            setPatInfo(encryptionService.decrypt(savedPat));
        }
        const savedOwner = localStorage.getItem('GITHUB_OWNER');
        if (savedOwner) setOwner(savedOwner);
        const savedRepo = localStorage.getItem('GITHUB_REPO');
        if (savedRepo) setRepo(savedRepo);
    }, []);

    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleSaveConfig = () => {
        if (patInfo) {
            localStorage.setItem('GITHUB_PAT_ENC', encryptionService.encrypt(patInfo));
        }
        localStorage.setItem('GITHUB_OWNER', owner);
        localStorage.setItem('GITHUB_REPO', repo);
    };

    const handleTestConnection = async () => {
        if (!patInfo || !owner || !repo) {
            addToast('error', 'Vui lòng điền đủ PAT, Owner và Repo');
            return;
        }
        setIsTesting(true);
        setTestSuccess(null);
        addLog('Testing connection...');
        
        try {
            await githubSyncService.testConnection(owner, repo, patInfo);
            setTestSuccess(true);
            addLog('✓ Connection successful! PAT is valid and has access to repo.');
            addToast('success', 'Kết nối GitHub thành công!');
            handleSaveConfig();
        } catch (error: any) {
            setTestSuccess(false);
            addLog(`ERROR: ${error.message}`);
            addToast('error', 'Kết nối thất bại. Xem log để biết chi tiết.');
        } finally {
            setIsTesting(false);
        }
    };

    const gatherWorkspaceFiles = async (): Promise<GitHubFile[]> => {
        const files: GitHubFile[] = [];
        
        // Dynamically load all project strings for sync 
        const globs = import.meta.glob([
            '/*.{ts,tsx,json,html,md,css}',
            '/components/**/*.{ts,tsx,css}',
            '/services/**/*.{ts,tsx}',
            '/pages/**/*.{ts,tsx}',
            '/src/**/*.{ts,tsx,css,json}',
            '/features/**/*.{ts,tsx}',
            '/utils/**/*.{ts,tsx}',
            '/contexts/**/*.{ts,tsx}',
            '/hooks/**/*.{ts,tsx}',
            '/data/**/*.{ts,tsx}',
            '/api/**/*.{ts,tsx}',
            '!/node_modules/**',
            '!/dist/**',
            '!/.git/**'
        ], { query: '?raw', import: 'default' });

        for (const path in globs) {
            if (globs.hasOwnProperty(path)) {
                try {
                    const content = (await globs[path]()) as string;
                    let cleanPath = path.replace(/^\/+/, '');
                    files.push({ path: cleanPath, content });
                } catch (e) {
                    console.warn('Could not load workspace file', path);
                }
            }
        }

        // Must ensure we push deploy-worker.yml for Vercel integration
        const hasDeployWorker = files.some(f => f.path.includes('deploy-worker.yml'));
        if (!hasDeployWorker) {
            files.push({
                path: '.github/workflows/deploy-worker.yml',
                content: `name: Deploy to Vercel/Supabase
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install Dependencies
        run: npm install
        
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
          
      - name: Build Project Artifacts
        run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
          
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
`
            });
            addLog('Added required .github/workflows/deploy-worker.yml file');
        }

        return files;
    };

    const handleSync = async () => {
        const trimmedPat = patInfo?.trim();
        const trimmedOwner = owner?.trim();
        const trimmedRepo = repo?.trim();
        const trimmedBranch = branch?.trim();

        if (!trimmedPat || !trimmedOwner || !trimmedRepo) {
            addToast('error', 'Vui lòng kiểm tra lại cấu hình GitHub');
            return;
        }

        setIsSyncing(true);
        setLogs([]);
        addLog('Starting GitHub Atomic Sync Process...');

        try {
            handleSaveConfig();
            addLog('Gathering local workspace files...');
            const files = await gatherWorkspaceFiles();
            addLog(`Found ${files.length} valid source files.`);
            
            await githubSyncService.pushAtomic(trimmedOwner, trimmedRepo, trimmedBranch, trimmedPat, files, addLog);
            addToast('success', 'Đã Push to GitHub Vercel Deploy. Xem Repo!');
        } catch (error: any) {
            addToast('error', 'Quá trình Sync thất bại.');
        } finally {
            setIsSyncing(false);
        }
    };

    const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono";

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden mt-8">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-800 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <CodeBracketIcon className="h-6 w-6 text-indigo-500" />
                        GitHub Atomic Sync
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Auto-push source code changes to trigger Vercel deployment.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <span>Target: </span>
                    <span className="text-indigo-600 dark:text-indigo-400">{branch}</span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-5">
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 block">
                            Personal Access Token (PAT)
                        </label>
                        <input 
                            type="password" 
                            placeholder="ghp_****************************"
                            value={patInfo}
                            onChange={(e) => setPatInfo(e.target.value)}
                            className={inputClasses}
                        />
                        <p className="text-[10px] text-slate-500 mt-1 italic">
                            Token is encrypted client-side via XOR Cipher standard before saving.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 block">
                                hethong5tang
                            </label>
                            <input 
                                type="text" 
                                value={owner}
                                onChange={(e) => setOwner(e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 block">
                                Repository Name
                            </label>
                            <input 
                                type="text" 
                                value={repo}
                                onChange={(e) => setRepo(e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 block">
                            Target Branch
                        </label>
                        <input 
                            type="text" 
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className={inputClasses}
                        />
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={handleTestConnection}
                            disabled={isTesting || isSyncing}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 flex-sub"
                        >
                            {isTesting ? (
                                <ArrowsUpDownIcon className="h-5 w-5 animate-spin" />
                            ) : testSuccess === true ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : testSuccess === false ? (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                            ) : (
                                <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" />
                            )}
                            Test Connection
                        </button>

                        <button 
                            onClick={handleSync}
                            disabled={isSyncing || isTesting}
                            className={`flex-1 relative overflow-hidden group px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-xl transition-all ${isSyncing ? 'bg-indigo-400 cursor-not-allowed opacity-80' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transform hover:-translate-y-0.5'}`}
                        >
                            {isSyncing ? (
                                <div className="flex items-center justify-center gap-2">
                                    <ArrowsUpDownIcon className="h-5 w-5 animate-spin" />
                                    SYNCING IN PROGRESS...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <CodeBracketIcon className="h-5 w-5" />
                                    PUSH CHANGES (ATOMIC)
                                    
                                    <div className="absolute top-0 -left-full w-full h-full bg-white opacity-20 group-hover:animate-shine"></div>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Black Console */}
                <div className="relative rounded-xl border border-slate-700 bg-[#0A0A0B] shadow-2xl overflow-hidden flex flex-col h-72">
                    <div className="bg-slate-900 px-4 py-2 text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 border-b border-slate-800">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                        <span className="ml-2">— Sync Console</span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 font-mono text-xs text-green-400 tracking-tight leading-relaxed space-y-1">
                        {logs.map((log, idx) => (
                            <div key={idx} className={log.includes('ERROR:') ? 'text-red-400' : log.includes('✓') ? 'text-emerald-300' : ''}>
                                {log}
                            </div>
                        ))}
                        <div ref={consoleEndRef} />
                    </div>
                    {isSyncing && (
                        <div className="absolute bottom-4 right-4 flex items-center justify-center space-x-1">
                            <div className="h-2 w-2 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GitHubSyncManager;
