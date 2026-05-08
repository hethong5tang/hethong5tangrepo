import React from 'react';

interface RowsPerPageSelectorProps {
    value: number;
    onChange: (value: number) => void;
    options?: number[];
}

const RowsPerPageSelector: React.FC<RowsPerPageSelectorProps> = ({
    value,
    onChange,
    options = [10, 20, 50],
}) => {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <label htmlFor="rows-per-page">Hiển thị:</label>
            <select
                id="rows-per-page"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                {options.map(option => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            <span>mục</span>
        </div>
    );
};

export default RowsPerPageSelector;