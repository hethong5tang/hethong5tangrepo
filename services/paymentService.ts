import { supabase } from './supabaseClient';

export interface PaymentRequest {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  net_amount?: number;
  fee?: number;
  tax?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: 'momo' | 'bank_transfer' | 'vnpay';
  bank_account_number?: string;
  bank_account_name?: string;
  bank_name?: string;
  momo_phone?: string;
  transaction_code?: string;
  order_code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const createDepositRequest = async (
  userId: string,
  amount: number,
  paymentMethod: 'momo' | 'bank_transfer'
) => {
  const orderCode = `DEP_${Date.now()}_${userId.slice(0, 5)}`.toUpperCase();
  const { data, error } = await supabase.from('payment_requests').insert({
    user_id: userId,
    type: 'deposit',
    amount,
    status: 'pending',
    payment_method: paymentMethod,
    order_code: orderCode,
    description: `Nạp tiền qua ${paymentMethod}`,
  }).select().single();

  if (error) throw error;
  return data as PaymentRequest;
};

export const createWithdrawRequest = async (
  userId: string,
  amount: number,
  paymentMethod: 'momo' | 'bank_transfer',
  accountInfo: {
    bank_account_number?: string;
    bank_account_name?: string;
    bank_name?: string;
    momo_phone?: string;
  }
) => {
  const orderCode = `WIT_${Date.now()}_${userId.slice(0, 5)}`.toUpperCase();
  const tax = amount * 0.10; // Thuế TNCN 10%
  const netAmount = amount - tax;

  const { data, error } = await supabase.from('payment_requests').insert({
    user_id: userId,
    type: 'withdraw',
    amount,
    net_amount: netAmount,
    tax,
    status: 'pending',
    payment_method: paymentMethod,
    order_code: orderCode,
    description: `Yêu cầu rút tiền qua ${paymentMethod}`,
    ...accountInfo
  }).select().single();

  if (error) throw error;
  return data as PaymentRequest;
};

export const getPaymentRequests = async (userId: string) => {
    const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PaymentRequest[];
};
