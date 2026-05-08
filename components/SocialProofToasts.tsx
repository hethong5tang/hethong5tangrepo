import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../features/users/useUser';
import { useFinance } from '../features/finance/useFinance';
import { useLandingPageContent } from '../features/landing/useLandingPageContent';
import { AdminManagedUser, UserStatus } from '../features/users/types';
import { Transaction, TransactionType } from '../features/finance/types';
import { SparklesIcon, CheckCircleIcon, ArrowUpCircleIcon } from './Icons';
import { SocialProofItem } from '../features/landing/types';

function getRandomItem<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
};

const flattenUsers = (users: AdminManagedUser[]): AdminManagedUser[] => {
    return users.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
};

export const SocialProofToasts: React.FC = () => {
    const { state: { content } } = useLandingPageContent();
    const { userState } = useUser();
    const { financeState } = useFinance();
    const [isVisible, setIsVisible] = useState(false);
    const [currentToast, setCurrentToast] = useState<string | null>(null);
    const [toastIcon, setToastIcon] = useState<React.ReactNode | null>(null);

    const templates: SocialProofItem[] = content.socialProof?.items || [];

    const activeUsers: AdminManagedUser[] = useMemo(() => flattenUsers(userState.allUsers).filter(u => u.status === UserStatus.Active), [userState.allUsers]);
    
    const randomAmounts = useMemo(() => 
        financeState.allTransactions
            .filter(t => t.amount > 0 && (
                t.type === TransactionType.CommissionParticipation ||
                t.type === TransactionType.CommissionMaintenance ||
                t.type === TransactionType.LeaderBonus ||
                t.type === TransactionType.Deposit
            ))
            .map(t => t.amount),
    [financeState.allTransactions]);

    const recentWithdrawalAmounts = useMemo(() =>
        financeState.allTransactions
            .filter(t => t.type === TransactionType.Payout && t.status === 'completed')
            .map(t => Math.abs(t.amount)),
    [financeState.allTransactions]);


    useEffect(() => {
        if (!content.socialProof.enabled || templates.length === 0) {
            setIsVisible(false);
            return;
        }

        const generateToast = () => {
            const templateItem = getRandomItem(templates);
            if (!templateItem) return;

            let toastText = templateItem.content;
            let icon: React.ReactNode = <SparklesIcon className="h-5 w-5 text-indigo-400" />;

            const namePlaceholder = '{name}';
            const amountPlaceholder = '{amount}';

            if (toastText.includes(namePlaceholder)) {
                const user = getRandomItem(activeUsers);
                if (user) {
                    toastText = toastText.replace(namePlaceholder, `<strong class="font-semibold text-white">${user.name}</strong>`);
                } else {
                    return; 
                }
            }

            if (toastText.includes(amountPlaceholder)) {
                let amount: number | undefined;
                if (toastText.includes('rút')) {
                     amount = getRandomItem(recentWithdrawalAmounts);
                } else {
                     amount = getRandomItem(randomAmounts);
                }

                if (amount) {
                    toastText = toastText.replace(amountPlaceholder, amount.toLocaleString('vi-VN'));
                } else {
                    return; 
                }
            }
            
            if(toastText.includes('rút')) {
                icon = <ArrowUpCircleIcon className="h-6 w-6 text-red-400" />;
            } else if (toastText.includes('hoa hồng') || toastText.includes('nhận được') || toastText.includes('nạp')) {
                icon = <CheckCircleIcon className="h-6 w-6 text-green-400" />;
            } else {
                 icon = <SparklesIcon className="h-6 w-6 text-indigo-400" />;
            }

            setCurrentToast(toastText);
            setToastIcon(icon);
            setIsVisible(true);
        };

        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                generateToast();
            }, 500);
        }, 5000);

        const initialTimeout = setTimeout(generateToast, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialTimeout);
        };

    }, [content.socialProof.enabled, templates, activeUsers, randomAmounts, recentWithdrawalAmounts]);

    if (!currentToast || !content.socialProof.enabled) return null;
    
    const finalHtml = currentToast
        .replace(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)đ/g, '<span class="font-bold text-green-400">$1đ</span>')
        .replace(/(\bPro\b|\bMaster\b)/g, '<span class="font-bold text-blue-400">$1</span>');

    return (
         <div 
            className={`fixed bottom-6 right-6 z-40 w-full max-w-sm rounded-xl bg-gradient-to-r from-blue-500 to-green-500 p-px shadow-2xl transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
        >
            <div className="rounded-[11px] bg-slate-800/90 p-4 backdrop-blur-md flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center border border-slate-600">
                    {toastIcon}
                </div>
                <div className="flex-1 pt-0.5">
                    <p 
                        className="text-sm text-slate-300"
                        dangerouslySetInnerHTML={{ __html: finalHtml }} 
                    />
                    <p className="text-xs text-slate-500 mt-1">vừa xong</p>
                </div>
            </div>
        </div>
    );
};
