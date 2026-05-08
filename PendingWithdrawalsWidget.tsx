import React, { useMemo } from 'react';
import { WithdrawalRequest } from '../../features/finance/types';
import { CheckCircleIcon, XCircleIcon } from '../Icons';

const PendingWithdrawalsWidget: React.FC<{ requests: WithdrawalRequest[], onProcess: (id: string, decision: 'approve' | 'reject') => void, onNavigate: (page: string) => void }> = ({ requests, onProcess, onNavigate }) => {
    const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending').slice(0, 5), [requests]);

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
            <h3 className="text-lg font-semibold mb-4">Yêu cầu Rút tiền đang chờ</h3>
            <div className="space-y-4">
                {pendingRequests.length > 0 ? pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={req.user.avatar} alt={req.user.name} className="h-10 w-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{req.user.name}</p>
                                <p className="text-sm text-slate-500">{req.amount.toLocaleString('vi-VN')}đ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onProcess(req.id, 'reject')} className="p-2 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50"><XCircleIcon className="h-5 w-5"/></button>
                            <button onClick={() => onProcess(req.id, 'approve')} className="p-2 text-green-500 rounded-full hover:bg-green-100 dark:hover:bg-green-800/50"><CheckCircleIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Không có yêu cầu nào.</p>
                )}
            </div>
            {requests.filter(r => r.status === 'pending').length > 0 && 
                <button onClick={() => onNavigate('Tài chính')} className="mt-4 w-full text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Xem tất cả
                </button>
            }
        </div>
    );
};

export default React.memo(PendingWithdrawalsWidget);