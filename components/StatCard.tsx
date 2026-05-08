
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from './Icons';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactElement<{ className?: string }>;
  trendData: { name: string; value: number }[];
  isCurrency?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, isCurrency = false, trendData }) => {
  if (!trendData || trendData.length < 2) {
      return (
          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                   <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                      {React.cloneElement(icon, { className: "h-5 w-5" })}
                  </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
              <div className="mt-4 text-xs h-12 text-slate-400 flex items-end">Không có dữ liệu xu hướng.</div>
          </div>
      );
  }
    
  const lastValue = trendData[trendData.length - 1].value;
  const firstValue = trendData[0].value;

  const changeValue = lastValue - firstValue;
  const changePercentage = firstValue !== 0 ? (changeValue / firstValue) * 100 : (lastValue > 0 ? Infinity : 0);

  const isPositive = changeValue >= 0;

  const formatChangeValue = (val: number) => {
    if (isCurrency) {
      return `${val >= 0 ? '+' : ''}${val.toLocaleString('vi-VN')}đ`;
    }
    return `${val >= 0 ? '+' : ''}${val.toLocaleString('vi-VN')}`;
  };

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/20">
        <div>
            <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                 <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    {React.cloneElement(icon, { className: "h-5 w-5" })}
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
        </div>
        
        <div className="flex justify-between items-end mt-4 h-12">
            <div>
                 <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
                    <span>
                      {changePercentage === Infinity ? '+∞%' : `${changePercentage >= 0 ? '+' : ''}${changePercentage.toFixed(1)}%`}
                    </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatChangeValue(changeValue)} vs 30 ngày
                </p>
            </div>
            <div className="h-10 w-20">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={isPositive ? '#22c55e' : '#ef4444'} 
                            strokeWidth={2} 
                            dot={false} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default React.memo(StatCard);
