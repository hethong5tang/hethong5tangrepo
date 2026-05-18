
import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../Icons';

const FinanceStatCard: React.FC<{
  title: string;
  value: number;
  change?: number;
  icon: React.ReactElement;
  color: 'green' | 'purple' | 'blue' | 'orange';
}> = ({ title, value, change, icon, color }) => {
  const isPositive = change !== undefined && change >= 0;
  
  const colorClasses = {
    green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  };

  const currentColors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm ring-1 ring-black/5 p-4 flex items-center justify-between transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${currentColors.bg} ${currentColors.text}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: "h-5 w-5" })}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{value.toLocaleString('vi-VN')}đ</p>
            {change !== undefined && (
                <span className={`text-xs font-semibold flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '↑' : '↓'}{Math.abs(change).toFixed(1)}%
                </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FinanceStatCard);
