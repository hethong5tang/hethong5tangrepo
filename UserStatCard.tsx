import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from './Icons';

interface UserStatCardProps {
  title: string;
  value: string;
  change?: number; // Percentage change
  icon: React.ReactElement<{ className?: string }>;
}

const UserStatCard: React.FC<UserStatCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change !== undefined && change >= 0;
  const isNeutral = change === undefined;

  const getChangeText = () => {
    if (change === undefined) return null;
    if (change === Infinity) return <span className="text-green-500">+100.0%</span>;
    if (change === -Infinity) return <span className="text-red-500">-100.0%</span>;
    return (
        <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
    );
  };

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400">
          {React.cloneElement(icon, { className: "h-6 w-6" })}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
      {!isNeutral && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
            )}
            {getChangeText()}
            <span className="ml-1">so với kỳ trước</span>
        </p>
      )}
    </div>
  );
};

export default React.memo(UserStatCard);