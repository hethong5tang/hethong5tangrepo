import React, { useState, useMemo, useEffect } from 'react';
import { SupportTicket, TicketCategory, TicketStatus } from '../../features/support/types';
import Modal from '../../components/Modal';
import { LifebuoyIcon, PaperAirplaneIcon, PlusIcon, XCircleIcon } from '../../components/Icons';
import { useAuth } from '../../features/auth/useAuth';
import { useSupport } from '../../features/support/useSupport';
import { useActions } from '../../features/actions/useActions';

const CreateTicketModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreateTicket: (title: string, category: TicketCategory, content: string) => void;
}> = ({ isOpen, onClose, onCreateTicket }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<TicketCategory>(TicketCategory.Other);
    const [content, setContent] = useState('');

    const handleCreate = () => {
        if (title && content) {
            onCreateTicket(title, category, content);
            onClose();
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setCategory(TicketCategory.Other);
            setContent('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tạo Yêu cầu Hỗ trợ mới" confirmText="Gửi Yêu cầu" onConfirm={handleCreate}>
            <div className="space-y-4">
                <div className="relative group">
                    <input type="text" placeholder="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)} className="block w-full px-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                    {title && (
                        <button type="button" onClick={() => setTitle('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <XCircleIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                    <option value={TicketCategory.Finance}>Vấn đề Nạp/Rút tiền</option>
                    <option value={TicketCategory.Technical}>Lỗi Kỹ thuật</option>
                    <option value={TicketCategory.Commission}>Hỏi về Hoa hồng</option>
                    <option value={TicketCategory.Other}>Khác</option>
                </select>
                <div className="relative group">
                    <textarea placeholder="Nội dung chi tiết..." value={content} onChange={e => setContent(e.target.value)} rows={5} className="block w-full px-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                     {content && (
                        <button type="button" onClick={() => setContent('')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <XCircleIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const SupportPage: React.FC = () => {
    const { loggedInUser } = useAuth();
    const { supportState } = useSupport();
    const { handleCreateTicket, handleAddTicketReply } = useActions();

    const tickets = useMemo(() => {
        if (!loggedInUser) return [];
        return supportState.supportTickets.filter(t => t.userId === loggedInUser.id);
    }, [supportState.supportTickets, loggedInUser]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets.length > 0 ? tickets[0].id : null);
    const [reply, setReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    
    const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedTicketId), [tickets, selectedTicketId]);

    const handleSendReply = async () => {
        if (!selectedTicket || !reply.trim() || !loggedInUser) return;
        setIsReplying(true);
        await new Promise(res => setTimeout(res, 500));
        handleAddTicketReply(selectedTicket.id, reply, 'user', loggedInUser);
        setReply('');
        setIsReplying(false);
    };

    const handleCreate = (title: string, category: TicketCategory, content: string) => {
        if (loggedInUser) {
            handleCreateTicket(title, category, content, loggedInUser);
        }
    };

    return (
        <div className="space-y-6">
            <CreateTicketModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreateTicket={handleCreate} />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Hỗ trợ</h2>
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 h-[75vh] flex">
                {/* Left Pane: Ticket List */}
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold">Yêu cầu của bạn</h2>
                        <button onClick={() => setIsCreateModalOpen(true)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><PlusIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-4 border-b border-slate-200/50 dark:border-slate-700/50 cursor-pointer ${selectedTicketId === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ticket.title}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-slate-500">{new Date(ticket.updatedAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Pane: Conversation */}
                <div className="w-2/3 flex flex-col">
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100">{selectedTicket.title}</h3>
                            </div>
                            <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                                {selectedTicket.messages.map(msg => (
                                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                        {msg.sender === 'admin' && <img src={msg.userAvatar} alt="Admin" className="h-8 w-8 rounded-full" />}
                                        <div className={`max-w-[85%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-white dark:bg-slate-700'}`}>
                                            <p className="text-sm text-slate-800 dark:text-slate-200">{msg.content}</p>
                                            <p className="text-xs text-slate-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleString('vi-VN')}</p>
                                        </div>
                                        {msg.sender === 'user' && <img src={msg.userAvatar} alt={msg.userName} className="h-8 w-8 rounded-full" />}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="relative group">
                                     <textarea
                                        value={reply}
                                        onChange={e => setReply(e.target.value)}
                                        onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                        rows={2}
                                        className="w-full pr-20 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập trả lời..."
                                    />
                                    {reply && (
                                        <button type="button" onClick={() => setReply('')} className="absolute top-2 right-12 flex items-center pr-3 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSendReply}
                                        disabled={isReplying || !reply.trim()}
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

export default SupportPage;