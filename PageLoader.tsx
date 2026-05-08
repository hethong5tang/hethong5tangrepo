
import React from 'react';

const PageLoader: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
                <div className="w-16 h-16 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center p-12">
             <div className="w-10 h-10 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
        </div>
    );
};

export default PageLoader;
