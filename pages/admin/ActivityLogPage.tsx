import React, { useState, useMemo } from 'react';
import { useLogging } from '../../features/logging/useLogging';
import { LogEntry, LoggableAction } from '../../features/logging/types';
import Pagination from '../../components/Pagination';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import { DocumentMagnifyingGlassIcon, MagnifyingGlassIcon, XCircleIcon, ArrowPathIcon, CalendarDaysIcon } from '../../components/Icons';

const ActivityLogPage: React.FC = () => {
    const { loggingState } = useLogging();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<LoggableAction | 'all'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const uniqueActionTypes = useMemo(() => {
        const actions = new Set(loggingState.logs.map(log => log.actionType));
        return Array.from(actions).sort();
    }, [loggingState.logs]);

    const filteredLogs = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return loggingState.logs.filter(log => {
            const matchesSearch = searchLower === '' || 
                                  log.userName.toLowerCase().includes(searchLower) ||
                                  log.userId.toLowerCase().includes(searchLower) ||
                                  log.details.toLowerCase().includes(searchLower);
            const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
            const matchesDate = (!dateFilter.start || log.timestamp >= dateFilter.start) && 
                                (!dateFilter.end || log.timestamp.split('T')[0] <= dateFilter.end);
            return matchesSearch && matchesAction && matchesDate;
        });
    }, [loggingState.logs, searchTerm, actionFilter, dateFilter]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    const resetFilters = () => {
        setSearchTerm('');
        setActionFilter('all');
        setDateFilter({ start: '', end: '' });
        setCurrentPage(1);
    };

    const isFilterActive = searchTerm !== '' || actionFilter !== 'all' || dateFilter.start !== '' || dateFilter.end !== '';
    
    const statusColors: Record<LogEntry['status'], string> = {
        success: 'text-green-500',
        failure: 'text-red-500',
        info: 'text-blue-500',
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nhật ký Hoạt động Hệ thống</h2>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                 <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="relative flex-grow min-w-[250px] sm:min-w-[300px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" placeholder="Tìm theo tên, ID, chi tiết..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white" />
                        {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}
                    </div>
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)} className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                        <option value="all">Tất cả Hành động</option>
                        {uniqueActionTypes.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter(f => ({...f, start: e.target.value}))} className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm" />
                    <input type="date" value={dateFilter.end} onChange={e => setDateFilter(f => ({...f, end: e.target.value}))} className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm" />
                    {isFilterActive && <button onClick={resetFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-5 w-5" /></button>}
                </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Thời gian</th>
                                <th scope="col" className="px-6 py-3">Người thực hiện</th>
                                <th scope="col" className="px-6 py-3">Hành động</th>
                                <th scope="col" className="px-6 py-3">Chi tiết</th>
                                <th scope="col" className="px-6 py-3">Địa chỉ IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map(log => (
                                <tr key={log.id} className="border-b border-slate-200/50 dark:border-slate-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{new Date(log.timestamp).toLocaleDateString('vi-VN')}</span>
                                            <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{log.userName} <span className="text-xs text-slate-400">({log.userId})</span></td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[log.status]} bg-opacity-10 bg-current`}>
                                            {log.actionType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-sm break-words">{log.details}</td>
                                    <td className="px-6 py-4 font-mono">{log.ipAddress}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                            <p className="font-semibold">Không tìm thấy bản ghi nào.</p>
                            <p className="text-sm mt-1">{isFilterActive ? 'Hãy thử thay đổi bộ lọc.' : 'Chưa có hoạt động nào được ghi nhận.'}</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                     <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                        <div className="flex items-center gap-4">
                             <RowsPerPageSelector value={itemsPerPage} onChange={setItemsPerPage} />
                             <div className="text-sm text-slate-600 dark:text-slate-400">Hiển thị {filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} đến {Math.min(currentPage * itemsPerPage, filteredLogs.length)} trên {filteredLogs.length} bản ghi</div>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogPage;