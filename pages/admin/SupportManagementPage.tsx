
import React, { useState, useMemo, useEffect } from 'react';
import { SupportTicket, TicketStatus, TicketMessage, TicketCategory } from '../../features/support/types';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { LifebuoyIcon, PaperAirplaneIcon, CheckCircleIcon, ArrowPathIcon, ExclamationCircleIcon, MagnifyingGlassIcon, PlusIcon, XCircleIcon } from '../../components/Icons';
import { useSupport } from '../../features/support/useSupport';
import { useActions } from '../../features/actions/useActions';

const TICKETS_PER_PAGE = 8;

const statusInfo: Record<TicketStatus, { label: string; bg: string; text: string; icon: React.FC<{className?:string}> }> = {
  [TicketStatus.New]: { label: 'Mới', bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', icon: PlusIcon },
  [TicketStatus.InProgress]: { label: 'Đang xử lý', bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', icon: ArrowPathIcon },
  [TicketStatus.Resolved]: { label: 'Đã giải quyết', bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', icon: CheckCircleIcon },
};

const categoryLabels: Record<TicketCategory, string> = {
    [TicketCategory.Finance]: 'Tài chính',
    [TicketCategory.Technical]: 'Kỹ thuật',
    [TicketCategory.Commission]: 'Hoa hồng',
    [TicketCategory.Other]: 'Khác',
};

interface SupportManagementPageProps {}

const SupportManagementPage: React.FC<SupportManagementPageProps> = () => {
    const { supportState: { supportTickets: tickets } } = useSupport();
    const { handleAddTicketReply: onAddReply, handleUpdateTicketStatus: onUpdateStatus } = useActions();
    const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleResetFilters = () => {
        setStatusFilter('all');
        setSearchTerm('');
    };
    const isFilterActive = statusFilter !== 'all' || searchTerm !== '';

    const ticketStats = useMemo(() => ({
        new: tickets.filter(t => t.status === TicketStatus.New).length,
        inProgress: tickets.filter(t => t.status === TicketStatus.InProgress).length,
        resolved: tickets.filter(t => t.status === TicketStatus.Resolved).length,
    }), [tickets]);

    const filteredTickets = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return tickets
            .filter(t => statusFilter === 'all' || t.status === statusFilter)
            .filter(t => 
                !searchLower ||
                t.user.name.toLowerCase().includes(searchLower) ||
                t.title.toLowerCase().includes(searchLower)
            )
            .sort((a, b) => {
                // Priority Sort: New > InProgress > Resolved
                const score = (status: TicketStatus) => {
                    if (status === TicketStatus.New) return 3;
                    if (status === TicketStatus.InProgress) return 2;
                    return 1;
                };
                const scoreDiff = score(b.status) - score(a.status);
                if (scoreDiff !== 0) return scoreDiff;
                
                // Then sort by Updated Date
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
    }, [tickets, statusFilter, searchTerm]);

    const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedTicketId), [tickets, selectedTicketId]);
    
    useEffect(() => {
        // If there's no selected ticket or the selected one is no longer in the filtered list,
        // update the selection.
        const isSelectedTicketVisible = filteredTickets.some(t => t.id === selectedTicketId);

        if (!isSelectedTicketVisible) {
            // Select the first ticket of the new filtered list, or null if empty.
            setSelectedTicketId(filteredTickets.length > 0 ? filteredTickets[0].id : null);
        }
    }, [filteredTickets, selectedTicketId]);


    const handleSendReply = async () => {
        if (!selectedTicket || !replyContent.trim()) return;
        setIsReplying(true);
        await new Promise(res => setTimeout(res, 500));
        onAddReply(selectedTicket.id, replyContent, 'admin', null); // Admin doesn't need user object
        const updatedStatus = selectedTicket.status === TicketStatus.New ? TicketStatus.InProgress : selectedTicket.status;
        if(selectedTicket.status !== updatedStatus) {
            onUpdateStatus(selectedTicket.id, updatedStatus);
        }
        setReplyContent('');
        setIsReplying(false);
    };

    const handleStatusChange = (ticketId: string, status: TicketStatus) => {
        onUpdateStatus(ticketId, status);
    };

    const StatusBadge: React.FC<{status: TicketStatus}> = ({ status }) => {
        const info = statusInfo[status] || statusInfo[TicketStatus.New];
        return <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${info.bg} ${info.text}`}><info.icon className="h-3 w-3"/>{info.label}</span>;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Yêu cầu Hỗ trợ</h2>
            
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 h-[75vh] flex">
                {/* Left Pane */}
                <div className="w-2/5 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-xs text-blue-800 dark:text-blue-200">Mới</p><p className="font-bold text-blue-600 dark:text-blue-400">{ticketStats.new}</p></div>
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><p className="text-xs text-yellow-800 dark:text-yellow-200">Đang xử lý</p><p className="font-bold text-yellow-600 dark:text-yellow-400">{ticketStats.inProgress}</p></div>
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><p className="text-xs text-green-800 dark:text-green-200">Đã giải quyết</p><p className="font-bold text-green-600 dark:text-green-400">{ticketStats.resolved}</p></div>
                        </div>
                        <div className="relative mt-4 group">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
                             <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm theo tên, tiêu đề..." className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-md bg-white/50 dark:bg-slate-700/50 dark:border-slate-600 dark:text-white" />
                             {searchTerm && (
                                <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-md bg-white/50 dark:bg-slate-700/50 dark:border-slate-600 dark:text-white sm:text-sm"
                            >
                                <option value="all">Tất cả Trạng thái</option>
                                {Object.values(TicketStatus).map(s => <option key={s} value={s}>{statusInfo[s].label}</option>)}
                            </select>
                            {isFilterActive && <button onClick={handleResetFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-5 w-5" /></button>}
                        </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                            Tìm thấy {filteredTickets.length} yêu cầu
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredTickets.map(ticket => (
                            <div key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className={`p-4 border-b border-slate-200/50 dark:border-slate-700/50 cursor-pointer ${selectedTicketId === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{ticket.title}</p>
                                    <StatusBadge status={ticket.status} />
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                                    <span>{ticket.user.name}</span>
                                    <span>{new Date(ticket.updatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Pane */}
                <div className="w-3/5 flex flex-col">
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <img src={selectedTicket.user.avatar} alt={selectedTicket.user.name} className="h-8 w-8 rounded-full" />
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{selectedTicket.user.name}</h3>
                                        <p className="text-xs text-slate-500">{categoryLabels[selectedTicket.category]}</p>
                                    </div>
                                </div>
                                <select 
                                    value={selectedTicket.status} 
                                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                                    className="text-xs rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {Object.values(TicketStatus).map(s => <option key={s} value={s}>{statusInfo[s].label}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                                {selectedTicket.messages.map(msg => (
                                     <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'admin' ? 'justify-end' : ''}`}>
                                        {msg.sender === 'user' && <img src={msg.userAvatar} alt={msg.userName} className="h-8 w-8 rounded-full" />}
                                        <div className={`max-w-[85%] p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-white dark:bg-slate-700'}`}>
                                            <p className="text-sm text-slate-800 dark:text-slate-200">{msg.content}</p>
                                            <p className="text-xs text-slate-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleString('vi-VN')}</p>
                                        </div>
                                        {msg.sender === 'admin' && <img src={msg.userAvatar} alt="Admin" className="h-8 w-8 rounded-full" />}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                 <div className="relative group">
                                    <textarea
                                        value={replyContent}
                                        onChange={e => setReplyContent(e.target.value)}
                                        onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                        rows={3}
                                        className="w-full pr-20 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập nội dung trả lời..."
                                    />
                                     {replyContent && (
                                        <button type="button" onClick={() => setReplyContent('')} className="absolute top-2 right-12 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSendReply}
                                        disabled={isReplying || !replyContent.trim()}
                                        className="absolute bottom-2 right-2 p-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                                    >
                                        <PaperAirplaneIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <LifebuoyIcon className="h-12 w-12 mb-2" />
                            <p>Chọn một yêu cầu để xem chi tiết</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportManagementPage;
