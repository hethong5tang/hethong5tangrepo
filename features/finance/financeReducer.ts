
import { Transaction, TransactionStatus, TransactionType, FundType, FundTransaction, MilestoneBonusRequestStatus, WithdrawalStatus } from './types';
import { FinanceAction, FinanceState } from './financeTypes';

export const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case 'ADD_WITHDRAWAL_REQUEST': 
      return {
        ...state,
        withdrawalRequests: [action.payload, ...state.withdrawalRequests],
      };
    
    case 'PROCESS_WITHDRAWAL_REJECT': {
        const request = action.payload;
        const newTransaction: Transaction = {
            id: `txn_reject_${request.id}`,
            userId: request.userId,
            user: request.user,
            date: new Date().toISOString().split('T')[0],
            type: TransactionType.Withdrawal,
            description: `Yêu cầu rút tiền thất bại (${request.paymentMethod.toUpperCase()})`,
            amount: -request.amount,
            status: TransactionStatus.Failed,
        };
        return {
            ...state,
            withdrawalRequests: state.withdrawalRequests.map(r =>
                r.id === request.id ? { ...r, status: WithdrawalStatus.Rejected, updatedAt: new Date().toISOString().split('T')[0] } : r
            ),
            allTransactions: [newTransaction, ...state.allTransactions]
        };
    }

    case 'PROCESS_WITHDRAWAL_APPROVE': {
        const request = action.payload;
        const date = new Date().toISOString().split('T')[0];
        const taxAmount = Math.floor(request.amount * 0.1);
        const actualPayout = request.amount - taxAmount;
        
        const payoutTransaction: Transaction = {
            id: `txn_approve_${request.id}`,
            userId: request.userId,
            user: request.user,
            date,
            type: TransactionType.Payout,
            description: `Ví Admin chi trả rút tiền (${request.paymentMethod.toUpperCase()}) - (Đã trừ thuế)`,
            amount: -actualPayout,
            status: TransactionStatus.Completed,
        };

        const taxTransaction: Transaction = {
            id: `txn_tax_${request.id}`,
            userId: request.userId,
            user: request.user,
            date,
            type: TransactionType.TaxDeduction,
            description: `Khấu trừ Thuế TNCN 10% cho lệnh rút #${request.id}`,
            amount: -taxAmount,
            status: TransactionStatus.Completed,
        };

        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.Admin] = {
            ...updatedFundStatus[FundType.Admin],
            balance: updatedFundStatus[FundType.Admin].balance - request.amount,
            totalOut: updatedFundStatus[FundType.Admin].totalOut + request.amount,
        };

        // NEW: Di chuyển thuế TNCN vào quỹ riêng
        updatedFundStatus[FundType.TNCN_TAX] = {
            ...updatedFundStatus[FundType.TNCN_TAX],
            balance: (updatedFundStatus[FundType.TNCN_TAX]?.balance || 0) + taxAmount,
            totalIn: (updatedFundStatus[FundType.TNCN_TAX]?.totalIn || 0) + taxAmount,
        };

        const newFundTx: FundTransaction = {
            id: `ft_wd_${Date.now()}`,
            date,
            fund: FundType.Admin,
            type: 'outflow',
            amount: -request.amount,
            description: `Chi trả rút tiền cho ${request.user.name} (Gồm Thuế TNCN 10%)`
        };

        const taxFundTx: FundTransaction = {
            id: `ft_tax_tncn_${Date.now()}`,
            date,
            fund: FundType.TNCN_TAX,
            type: 'inflow',
            amount: taxAmount,
            description: `Thuế TNCN trích từ lệnh rút #${request.id} của ${request.user.name}`
        };

        return {
            ...state,
            withdrawalRequests: state.withdrawalRequests.map(r =>
                r.id === request.id ? { ...r, status: WithdrawalStatus.Approved, updatedAt: date } : r
            ),
            allTransactions: [payoutTransaction, taxTransaction, ...state.allTransactions],
            fundStatus: updatedFundStatus,
            fundTransactions: [newFundTx, taxFundTx, ...state.fundTransactions]
        };
    }

    case 'BATCH_PROCESS_WITHDRAWALS': {
        const { ids, decision, requests } = action.payload;
        const date = new Date().toISOString().split('T')[0];
        let totalAmountToDeduct = 0;
        
        const newTransactions: Transaction[] = requests.map(request => {
            if (decision === 'approve') totalAmountToDeduct += request.amount;
            return {
                id: `txn_batch_${decision}_${request.id}_${Date.now()}`,
                userId: request.userId,
                user: request.user,
                date,
                type: decision === 'approve' ? TransactionType.Payout : TransactionType.Withdrawal,
                description: decision === 'approve' 
                    ? `Ví Admin chi trả rút tiền hàng loạt` 
                    : `Yêu cầu rút tiền thất bại - Hàng loạt`,
                amount: -request.amount,
                status: decision === 'approve' ? TransactionStatus.Completed : TransactionStatus.Failed,
            };
        });

        const idSet = new Set(ids);
        const updatedFundStatus = { ...state.fundStatus };
        const newFundTxs: FundTransaction[] = [];

        if (decision === 'approve' && totalAmountToDeduct > 0) {
            updatedFundStatus[FundType.Admin] = {
                ...updatedFundStatus[FundType.Admin],
                balance: updatedFundStatus[FundType.Admin].balance - totalAmountToDeduct,
                totalOut: updatedFundStatus[FundType.Admin].totalOut + totalAmountToDeduct,
            };
            newFundTxs.push({
                id: `ft_batch_wd_${Date.now()}`,
                date,
                fund: FundType.Admin,
                type: 'outflow',
                amount: -totalAmountToDeduct,
                description: `Chi trả rút tiền hàng loạt (${requests.length} lệnh)`
            });
        }

        return {
            ...state,
            withdrawalRequests: state.withdrawalRequests.map(r =>
                idSet.has(r.id) ? { 
                    ...r, 
                    status: decision === 'approve' ? WithdrawalStatus.Approved : WithdrawalStatus.Rejected, 
                    updatedAt: date 
                } : r
            ),
            allTransactions: [...newTransactions, ...state.allTransactions],
            fundStatus: updatedFundStatus,
            fundTransactions: [...newFundTxs, ...state.fundTransactions]
        };
    }

    case 'ADD_DEPOSIT_REQUEST':
        return {
            ...state,
            depositRequests: [action.payload, ...state.depositRequests],
        };

    case 'PROCESS_DEPOSIT_APPROVE': {
        const request = action.payload;
        const date = new Date().toISOString().split('T')[0];

        const newTransaction: Transaction = {
            id: `txn_dep_${request.id}`,
            userId: request.userId,
            user: request.user,
            date,
            type: TransactionType.Deposit,
            description: `Nạp tiền thành công (${request.paymentMethod === 'bank_transfer' ? 'CK Ngân hàng' : 'Momo'}) - Mã GD: ${request.transferCode}`,
            amount: request.amount,
            status: TransactionStatus.Completed,
        };

        // Note: Admin wallet doesn't necessarily increase on user deposit (it's user's money), 
        // but for tracking total system inflow, we might track it separately or not change Admin Profit wallet.
        // Assuming Admin Wallet tracks PROFIT only, we don't add deposit here.
        
        return {
            ...state,
            depositRequests: state.depositRequests.map(r => 
                r.id === request.id ? { ...r, status: 'completed' } : r
            ),
            allTransactions: [newTransaction, ...state.allTransactions]
        };
    }

    case 'PROCESS_DEPOSIT_REJECT': {
         const request = action.payload;
         return {
            ...state,
            depositRequests: state.depositRequests.map(r => 
                r.id === request.id ? { ...r, status: 'failed' } : r
            ),
        };
    }
    
    case 'APPLY_FEE_PAYMENT_CHANGES': {
        const { changes, newUser } = action.payload;
        const { newTransactions, newFundTransactions, fundUpdates, feeAmount, sourceEventId } = changes;
        const date = new Date().toISOString().split('T')[0];
        
        const feeTransaction: Transaction = {
            id: `txn_fee_${Date.now()}`,
            userId: newUser.id,
            user: { name: newUser.name, avatar: newUser.avatar },
            date,
            type: TransactionType.ParticipationFee,
            description: `Phí tham gia gói ${newUser.membershipTier}`,
            amount: -feeAmount,
            status: TransactionStatus.Completed,
            sourceEventId,
        };

        const updatedFundStatus = { ...state.fundStatus };
        
        Object.keys(fundUpdates).forEach(key => {
            const fundKey = key as FundType;
            updatedFundStatus[fundKey] = {
                ...updatedFundStatus[fundKey],
                balance: (updatedFundStatus[fundKey]?.balance || 0) + (fundUpdates[fundKey]?.balanceChange || 0),
                totalIn: (updatedFundStatus[fundKey]?.totalIn || 0) + (fundUpdates[fundKey]?.totalInChange || 0),
            };
        });

        return {
            ...state,
            allTransactions: [feeTransaction, ...newTransactions, ...state.allTransactions],
            fundTransactions: [...newFundTransactions, ...state.fundTransactions],
            fundStatus: updatedFundStatus,
        };
    }

    case 'REMOVE_TRANSACTIONS_BY_USER_IDS': {
        const { userIds } = action.payload;
        const userIdsSet = new Set(userIds);
        return {
            ...state,
            allTransactions: state.allTransactions.filter(t => !userIdsSet.has(t.userId)),
            withdrawalRequests: state.withdrawalRequests.filter(r => !userIdsSet.has(r.userId)),
            depositRequests: state.depositRequests.filter(d => !userIdsSet.has(d.userId)),
        };
    }

    case 'ADD_TRANSACTION': {
        const tx = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        
        if (tx.type === TransactionType.AdminAdjustment && tx.status === TransactionStatus.Completed) {
            updatedFundStatus[FundType.Admin] = {
               ...updatedFundStatus[FundType.Admin],
               balance: updatedFundStatus[FundType.Admin].balance - tx.amount,
               totalOut: tx.amount > 0 ? updatedFundStatus[FundType.Admin].totalOut + tx.amount : updatedFundStatus[FundType.Admin].totalOut,
               totalIn: tx.amount < 0 ? updatedFundStatus[FundType.Admin].totalIn + Math.abs(tx.amount) : updatedFundStatus[FundType.Admin].totalIn,
           };
       }

        return {
            ...state,
            allTransactions: [tx, ...state.allTransactions],
            fundStatus: updatedFundStatus
        };
    }

    case 'PROCESS_SUPPORT_FUND_PAYOUT': {
        const { totalPayout, transactions } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.Support] = {
            ...updatedFundStatus[FundType.Support],
            balance: updatedFundStatus[FundType.Support].balance - totalPayout,
            totalOut: updatedFundStatus[FundType.Support].totalOut + totalPayout,
        };

        return {
            ...state,
            allTransactions: [...transactions, ...state.allTransactions],
            fundStatus: updatedFundStatus,
            fundTransactions: [
                {
                    id: `ft_out_${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    fund: FundType.Support,
                    type: 'outflow',
                    amount: -totalPayout,
                    description: `Chi hỗ trợ cho ${action.payload.userCount} thành viên`
                },
                ...state.fundTransactions
            ]
        };
    }

    case 'PROCESS_LEADER_FUND_PAYOUT': {
        const { amount, description } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.LeaderBonus] = {
            ...updatedFundStatus[FundType.LeaderBonus],
            balance: updatedFundStatus[FundType.LeaderBonus].balance - amount,
            totalOut: updatedFundStatus[FundType.LeaderBonus].totalOut + amount,
        };

        return {
            ...state,
            fundStatus: updatedFundStatus,
            fundTransactions: [
                {
                    id: `ft_out_lb_${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    fund: FundType.LeaderBonus,
                    type: 'outflow',
                    amount: -amount,
                    description
                },
                ...state.fundTransactions
            ]
        };
    }

    case 'PROCESS_LEADER_FUND_BATCH_PAYOUT': {
        const { totalAmount, transactions, fundTransaction } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.LeaderBonus] = {
            ...updatedFundStatus[FundType.LeaderBonus],
            balance: updatedFundStatus[FundType.LeaderBonus].balance - totalAmount,
            totalOut: updatedFundStatus[FundType.LeaderBonus].totalOut + totalAmount,
        };

        return {
            ...state,
            fundStatus: updatedFundStatus,
            allTransactions: [...transactions, ...state.allTransactions],
            fundTransactions: [fundTransaction, ...state.fundTransactions]
        };
    }

    case 'PROCESS_SUPPORT_FUND_BATCH_PAYOUT': {
        const { totalAmount, transactions, fundTransaction } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.Support] = {
            ...updatedFundStatus[FundType.Support],
            balance: updatedFundStatus[FundType.Support].balance - totalAmount,
            totalOut: updatedFundStatus[FundType.Support].totalOut + totalAmount,
        };

        return {
            ...state,
            fundStatus: updatedFundStatus,
            allTransactions: [...transactions, ...state.allTransactions],
            fundTransactions: [fundTransaction, ...state.fundTransactions]
        };
    }

    case 'PROCESS_ADMIN_WALLET_BATCH_PAYOUT': {
        const { totalAmount, transactions, fundTransaction } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.Admin] = {
            ...updatedFundStatus[FundType.Admin],
            balance: updatedFundStatus[FundType.Admin].balance - totalAmount,
            totalOut: updatedFundStatus[FundType.Admin].totalOut + totalAmount,
        };

        return {
            ...state,
            fundStatus: updatedFundStatus,
            allTransactions: [...transactions, ...state.allTransactions],
            fundTransactions: [fundTransaction, ...state.fundTransactions]
        };
    }

    case 'PROCESS_MILESTONE_BONUS_APPROVE': {
        const { request, transaction, fundTransaction } = action.payload;
        const updatedFundStatus = { ...state.fundStatus };
        updatedFundStatus[FundType.LeaderBonus] = {
            ...updatedFundStatus[FundType.LeaderBonus],
            balance: updatedFundStatus[FundType.LeaderBonus].balance - request.bonusAmount,
            totalOut: updatedFundStatus[FundType.LeaderBonus].totalOut + request.bonusAmount,
        };

        return {
            ...state,
            milestoneBonusRequests: state.milestoneBonusRequests.map(r => 
                r.id === request.id ? { ...r, status: MilestoneBonusRequestStatus.Approved } : r
            ),
            allTransactions: [transaction, ...state.allTransactions],
            fundStatus: updatedFundStatus,
            fundTransactions: [fundTransaction, ...state.fundTransactions]
        };
    }

    case 'PROCESS_MILESTONE_BONUS_REJECT': {
        const { request, fundTransaction } = action.payload;
        return {
            ...state,
            milestoneBonusRequests: state.milestoneBonusRequests.map(r => 
                r.id === request.id ? { ...r, status: MilestoneBonusRequestStatus.Rejected } : r
            ),
            fundTransactions: [fundTransaction, ...state.fundTransactions]
        };
    }

    default: return state;
  }
};
