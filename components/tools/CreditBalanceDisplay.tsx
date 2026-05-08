
import React from 'react';
import { SparklesIcon, PlusIcon } from '../Icons';

const CreditBalanceDisplay: React.FC<{ balance: number, onAdd: () => void }> = ({ balance, onAdd }) => (
    <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full pl-3 pr-1 py-1">
        <SparklesIcon className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">{balance.toLocaleString('vi-VN')}</span>
        <button 
            onClick={onAdd} 
            className="p-1 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors ml-1" 
            title="Đổi thêm Credit"
        >
            <PlusIcon className="h-3 w-3 text-white" />
        </button>
    </div>
);

export default CreditBalanceDisplay;
