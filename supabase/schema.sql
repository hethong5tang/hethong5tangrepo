-- DDL: Data Definition Language
-- CHÚ Ý: Chạy toàn bộ mã này trong công cụ "SQL Editor" của trang quản trị Supabase.

-- ==========================================
-- 1. BẢNG CẬP NHẬT CẤU HÌNH (SETTINGS)
-- ==========================================
-- Lưu trữ các công thức linh hoạt để Admin có thể thay đổi sau này mà không cần code lại.
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Khởi tạo tỉ lệ 20/80 (Phân bổ chuẩn)
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'commission_rates',
    '{"fund_admin": 0.10, "fund_leader": 0.05, "fund_support": 0.05, "f1": 0.40, "f2": 0.16, "f3": 0.12, "f4": 0.08, "f5": 0.04}',
    'Tỉ lệ phân bổ hoa hồng (20% cho quỹ, 80% cho hệ thống 5 tầng)'
) ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- 2. BẢNG NGƯỜI DÙNG (USERS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(), -- Kết nối trực tiếp với bảng Auth của Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' hoặc 'admin'
    status VARCHAR(50) DEFAULT 'active', -- 'active' hoặc 'banned'
    ref_code VARCHAR(20) UNIQUE NOT NULL, -- Mã giới thiệu của bản thân (Mã mời người khác)
    referred_by UUID REFERENCES public.users(id), -- ID của tuyến trên (F1 của người này)
    balance NUMERIC(15, 2) DEFAULT 0, -- Số dư ví (Có thể rút tiền từ đây)
    total_commission NUMERIC(15, 2) DEFAULT 0, -- Tổng hoa hồng đã nhận từ trước đến nay
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 3. BẢNG QUỸ HỆ THỐNG (FUNDS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.funds (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0,
    total_in NUMERIC(15, 2) DEFAULT 0,
    total_out NUMERIC(15, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Khởi tạo 3 Quỹ cố định
INSERT INTO public.funds (id, name, balance) VALUES
('admin', 'Ví Admin (Lợi nhuận)', 0),
('leader', 'Quỹ Thưởng Leader', 10000000), -- Yêu cầu khởi tạo 10 triệu cho leader
('support', 'Quỹ Hỗ Trợ (Chưa có F1)', 0)
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- 4. BẢNG GIAO DỊCH NGƯỜI DÙNG (TRANSACTIONS)
-- ==========================================
-- Lưu lịch sử nạp/rút/hoa hồng của members.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdraw', 'commission', 'fee'
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'rejected'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 5. BẢNG GIAO DỊCH QUỸ (FUND TRANSACTIONS)
-- ==========================================
-- Lịch sử dòng tiền vào, ra của 3 Quỹ hệ thống
CREATE TABLE IF NOT EXISTS public.fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id VARCHAR(50) REFERENCES public.funds(id),
    type VARCHAR(50) NOT NULL, -- 'inflow', 'outflow'
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 6. HÀM XỬ LÝ 100% TIỀN CHUẨN XÁC VÀ TỰ ĐỘNG (RPC - RPC Function)
-- ==========================================
-- Hàm này sẽ được code Frontend (SupabaseAdapter) gọi khi 1 user Mua Gói Đầu Tư/Phí Tham Gia
-- ƯU ĐIỂM: DB tự tính, không lo frontend bị lag dãn đến sai lệch tiền, hack tiền chặn ở mức SQL!

CREATE OR REPLACE FUNCTION process_package_purchase(
    p_buyer_id UUID,
    p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Cho phép override quyền, bỏ qua RLS để update các bảng
AS $$
DECLARE
    v_rates JSONB;
    v_f1 UUID; v_f2 UUID; v_f3 UUID; v_f4 UUID; v_f5 UUID;
    v_amt_admin NUMERIC; v_amt_leader NUMERIC; v_amt_support NUMERIC;
    v_amt_f1 NUMERIC; v_amt_f2 NUMERIC; v_amt_f3 NUMERIC; v_amt_f4 NUMERIC; v_amt_f5 NUMERIC;
BEGIN
    -- [A] Lấy cấu hình các tỉ lệ chia từ bảng Settings
    SELECT value INTO v_rates FROM public.system_settings WHERE key = 'commission_rates';
    
    -- Chia tỉ lệ 20%
    v_amt_admin := p_amount * (v_rates->>'fund_admin')::NUMERIC;
    v_amt_leader := p_amount * (v_rates->>'fund_leader')::NUMERIC;
    v_amt_support := p_amount * (v_rates->>'fund_support')::NUMERIC;
    
    -- Chia tỉ lệ 80% (Theo Tầng)
    v_amt_f1 := p_amount * (v_rates->>'f1')::NUMERIC;
    v_amt_f2 := p_amount * (v_rates->>'f2')::NUMERIC;
    v_amt_f3 := p_amount * (v_rates->>'f3')::NUMERIC;
    v_amt_f4 := p_amount * (v_rates->>'f4')::NUMERIC;
    v_amt_f5 := p_amount * (v_rates->>'f5')::NUMERIC;

    -- [B] Bơm tiền (20%) vào các Quỹ Trung Tâm
    UPDATE public.funds SET balance = balance + v_amt_admin, total_in = total_in + v_amt_admin WHERE id = 'admin';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('admin', 'inflow', v_amt_admin, 'Thu phí từ gói User: ' || p_buyer_id);
    
    UPDATE public.funds SET balance = balance + v_amt_leader, total_in = total_in + v_amt_leader WHERE id = 'leader';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('leader', 'inflow', v_amt_leader, 'Thu phí từ gói User: ' || p_buyer_id);
    
    -- Quỹ hỗ trợ nhận 5% cố định trước. NẾU các nhánh F bị khuyết, phần đó sẽ dồn thêm vào quỹ này sau.
    UPDATE public.funds SET balance = balance + v_amt_support, total_in = total_in + v_amt_support WHERE id = 'support';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_support, 'Thu phí từ gói User: ' || p_buyer_id);

    -- [C] Trích xuất phả hệ 5 Tầng của Người mua
    SELECT referred_by INTO v_f1 FROM public.users WHERE id = p_buyer_id;
    IF v_f1 IS NOT NULL THEN
        SELECT referred_by INTO v_f2 FROM public.users WHERE id = v_f1;
    END IF;
    IF v_f2 IS NOT NULL THEN
        SELECT referred_by INTO v_f3 FROM public.users WHERE id = v_f2;
    END IF;
    IF v_f3 IS NOT NULL THEN
        SELECT referred_by INTO v_f4 FROM public.users WHERE id = v_f3;
    END IF;
    IF v_f4 IS NOT NULL THEN
        SELECT referred_by INTO v_f5 FROM public.users WHERE id = v_f4;
    END IF;

    -- [D] Chia tiền các tầng (F1->F5). Nếu Ai bị "Mất Điểm" do KHÔNG TỒN TẠI HỆ THỐNG TRÊN, tiền sẽ Rơi về Quỹ Hỗ Trợ
    
    -- Tầng 1
    IF v_f1 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f1, total_commission = total_commission + v_amt_f1 WHERE id = v_f1;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f1, 'commission', v_amt_f1, 'Hoa hồng F1 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f1, total_in = total_in + v_amt_f1 WHERE id = 'support';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_f1, 'Hoa hồng F1 dư thừa (Trống tuyến)');
    END IF;

    -- Tầng 2
    IF v_f2 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f2, total_commission = total_commission + v_amt_f2 WHERE id = v_f2;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f2, 'commission', v_amt_f2, 'Hoa hồng F2 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f2, total_in = total_in + v_amt_f2 WHERE id = 'support';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_f2, 'Hoa hồng F2 dư thừa (Trống tuyến)');
    END IF;

    -- Tầng 3
    IF v_f3 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f3, total_commission = total_commission + v_amt_f3 WHERE id = v_f3;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f3, 'commission', v_amt_f3, 'Hoa hồng F3 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f3, total_in = total_in + v_amt_f3 WHERE id = 'support';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_f3, 'Hoa hồng F3 dư thừa (Trống tuyến)');
    END IF;

    -- Tầng 4
    IF v_f4 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f4, total_commission = total_commission + v_amt_f4 WHERE id = v_f4;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f4, 'commission', v_amt_f4, 'Hoa hồng F4 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f4, total_in = total_in + v_amt_f4 WHERE id = 'support';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_f4, 'Hoa hồng F4 dư thừa (Trống tuyến)');
    END IF;

    -- Tầng 5
    IF v_f5 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f5, total_commission = total_commission + v_amt_f5 WHERE id = v_f5;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f5, 'commission', v_amt_f5, 'Hoa hồng F5 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f5, total_in = total_in + v_amt_f5 WHERE id = 'support';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_f5, 'Hoa hồng F5 dư thừa (Trống tuyến)');
    END IF;

END;
$$;

-- ==========================================
-- 8. CẤU HÌNH KHO LƯU TRỮ (SUPABASE STORAGE)
-- ==========================================
-- Khởi tạo các Buckets để chứa file
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true), ('proofs', 'transaction_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Thiết lập RLS cho Storage (Sử dụng bảng storage.objects)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy cho bucket 'avatars' (Công khai xem nhưng hạn chế ghi)
CREATE POLICY "Ai cũng có thể xem ảnh đại diện"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "User có thể upload ảnh đại diện của mình"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User có thể cập nhật/xóa ảnh đại diện của mình"
ON storage.objects FOR ALL USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy cho bucket 'proofs' (Ảnh bằng chứng giao dịch - Bảo mật cao hơn)
CREATE POLICY "Admin có thể xem mọi bằng chứng giao dịch"
ON storage.objects FOR SELECT USING (
    bucket_id = 'proofs' AND public.is_admin()
);

CREATE POLICY "User có thể xem bằng chứng của chính mình"
ON storage.objects FOR SELECT USING (
    bucket_id = 'proofs' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User upload bằng chứng giao dịch"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'proofs' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Tạo hàm kiểm tra quyền Admin (Security Definer giúp tránh lỗi lặp vô hạn đệ quy khi query bảng users)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Bật RLS cho toàn bộ các bảng
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;

-- 7.1 SYSTEM_SETTINGS
DROP POLICY IF EXISTS "Bất kỳ ai cũng có thể xem cài đặt hệ thống" ON public.system_settings;
CREATE POLICY "Bất kỳ ai cũng có thể xem cài đặt hệ thống" 
ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin có toàn quyền quản lý bảng settings" ON public.system_settings;
CREATE POLICY "Admin có toàn quyền quản lý bảng settings" 
ON public.system_settings FOR ALL USING (public.is_admin());


-- 7.2 USERS
DROP POLICY IF EXISTS "User xem được dữ liệu của chính mình" ON public.users;
CREATE POLICY "User xem được dữ liệu của chính mình" 
ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "User tự tạo record của chính mình (Lúc đăng ký)" ON public.users;
CREATE POLICY "User tự tạo record của chính mình (Lúc đăng ký)" 
ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User có thể cập nhật thông tin của chính mình" ON public.users;
CREATE POLICY "User có thể cập nhật thông tin của chính mình" 
ON public.users FOR UPDATE USING (auth.uid() = id);

-- Admin xem và quản lý tất cả user
DROP POLICY IF EXISTS "Admin quản lý toàn bộ hệ thống User" ON public.users;
CREATE POLICY "Admin quản lý toàn bộ hệ thống User" 
ON public.users FOR ALL USING (public.is_admin());


-- 7.3 FUNDS
DROP POLICY IF EXISTS "Mọi người đều xem được thông tin các Quỹ" ON public.funds;
CREATE POLICY "Mọi người đều xem được thông tin các Quỹ" 
ON public.funds FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin có toàn quyền quản lý Quỹ" ON public.funds;
CREATE POLICY "Admin có toàn quyền quản lý Quỹ" 
ON public.funds FOR ALL USING (public.is_admin());


-- 7.4 TRANSACTIONS (Lịch sử giao dịch User)
DROP POLICY IF EXISTS "User xem lịch sử giao dịch cá nhân" ON public.transactions;
CREATE POLICY "User xem lịch sử giao dịch cá nhân" 
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin quản lý tất cả lịch sử giao dịch" ON public.transactions;
CREATE POLICY "Admin quản lý tất cả lịch sử giao dịch" 
ON public.transactions FOR ALL USING (public.is_admin());


-- 7.5 FUND_TRANSACTIONS (Lịch sử giao dịch của Quỹ)
DROP POLICY IF EXISTS "Người dùng không được phép truy cập lịch sử của Quỹ" ON public.fund_transactions;
CREATE POLICY "Người dùng không được phép truy cập lịch sử của Quỹ"
ON public.fund_transactions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin quản lý giao dịch Quỹ" ON public.fund_transactions;
CREATE POLICY "Admin quản lý giao dịch Quỹ" 
ON public.fund_transactions FOR ALL USING (public.is_admin());

