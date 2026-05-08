import React from 'react';
import GitHubSyncManager from '../../components/admin/GitHubSyncManager';

const GitHubSyncPage: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span>GitHub Sync</span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Push changes directly to GitHub to trigger Vercel deployment and database sync.
                        </p>
                    </div>
                </div>

                <GitHubSyncManager />
            </div>
        </div>
    );
};

export default GitHubSyncPage;
