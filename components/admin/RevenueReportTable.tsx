import React, { useMemo } from 'react';
import { ChartBarIcon } from '../Icons';

interface ReportData {
  name: string;
  'Phí Tham Gia': number;
  'Phí Duy Trì': number;
}

interface RevenueReportTableProps {
  data: ReportData[];
}

const RevenueReportTable: React.FC<RevenueReportTableProps> = ({ data }) => {
    const totals = useMemo(() => {
        const participation = data.reduce((sum, item) => sum + item['Phí Tham Gia'], 0);
        const maintenance = data.reduce((sum, item) => sum + item['Phí Duy Trì'], 0);
        const grandTotal = participation + maintenance;
        return { participation, maintenance, grandTotal };
    }, [data]);

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Báo cáo Doanh thu Nhanh</h3>
            
            <div className="overflow-x-auto flex-grow">
                {data.length > 0 && (totals.grandTotal > 0) ? (
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left">Thời gian</th>
                                <th scope="col" className="px-4 py-3 text-right">Phí Tham gia</th>
                                <th scope="col" className="px-4 py-3 text-right">Phí Duy trì</th>
                                <th scope="col" className="px-4 py-3 text-right">Tổng cộng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                            {data.map((item, index) => {
                                const rowTotal = item['Phí Tham Gia'] + item['Phí Duy Trì'];
                                if(rowTotal === 0) return null; // Hide rows with no revenue
                                return (
                                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                                        <td className="px-4 py-3 text-right">{item['Phí Tham Gia'].toLocaleString('vi-VN')}đ</td>
                                        <td className="px-4 py-3 text-right">{item['Phí Duy Trì'].toLocaleString('vi-VN')}đ</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">{rowTotal.toLocaleString('vi-VN')}đ</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 dark:border-slate-600">
                            <tr className="font-bold text-slate-900 dark:text-white">
                                <td className="px-4 py-3 text-left">Tổng cộng</td>
                                <td className="px-4 py-3 text-right">{totals.participation.toLocaleString('vi-VN')}đ</td>
                                <td className="px-4 py-3 text-right">{totals.maintenance.toLocaleString('vi-VN')}đ</td>
                                <td className="px-4 py-3 text-right">{totals.grandTotal.toLocaleString('vi-VN')}đ</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                         <ChartBarIcon className="h-12 w-12 text-slate-400 mb-2"/>
                         <p>Không có dữ liệu doanh thu để báo cáo.</p>
                     </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(RevenueReportTable);
