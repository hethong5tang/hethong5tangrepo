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

-- Khởi tạo tỉ lệ 40/60 (Phân bổ chuẩn 2 tầng)
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'commission_rates',
    '{"fund_admin": 0.17, "fund_leader": 0.05, "fund_support": 0.05, "vat": 0.10, "corporate_tax": 0.03, "f1": 0.40, "f2": 0.20}',
    'Tỉ lệ phân bổ hoa hồng (40% cho quỹ & thuế, 60% cho hệ thống 2 tầng)'
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
    membership_tier VARCHAR(50) DEFAULT 'none', -- none, starter, pro, master
    rank_level INTEGER DEFAULT 1, -- 1: Partner, 2: Silver, 3: Gold, 4: Diamond, 5: Crown
    current_level_revenue NUMERIC(15, 2) DEFAULT 0, -- Doanh số tích lũy cho cấp độ hiện tại
    f1_count INTEGER DEFAULT 0,
    network_size INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Khởi tạo Quỹ và Thuế
INSERT INTO public.funds (id, name, balance) VALUES
('admin', 'Ví Admin (Lợi nhuận)', 0),
('leader', 'Quỹ Thưởng Leader', 0),
('support', 'Quỹ Hỗ Trợ', 0),
('vat', 'Quỹ Thuế VAT', 0),
('corporate_tax', 'Quỹ Thuế TNDN', 0),
('tncn_tax', 'Quỹ Thuế TNCN (Khấu trừ rút tiền)', 0)
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

-- Hàm kiểm tra thăng cấp
CREATE OR REPLACE FUNCTION check_and_update_rank(p_user_id UUID) RETURNS void AS $$
DECLARE
    v_revenue NUMERIC;
    v_f1_count INTEGER;
    v_silver_branches INTEGER;
    v_gold_branches INTEGER;
    v_diamond_branches INTEGER;
    v_current_rank INTEGER;
BEGIN
    SELECT rank_level, current_level_revenue, f1_count INTO v_current_rank, v_revenue, v_f1_count FROM public.users WHERE id = p_user_id;

    -- Cấp 2: Silver Leader (Trưởng nhánh Bạc)
    -- Yêu cầu: 100M doanh số + 3 F1
    IF v_current_rank = 1 AND v_revenue >= 100000000 AND v_f1_count >= 3 THEN
        UPDATE public.users SET rank_level = 2 WHERE id = p_user_id;
        v_current_rank := 2;
    END IF;

    -- Cấp 3: Gold Manager (Quản lý Vàng)
    -- Yêu cầu: 500M doanh số + 2 nhánh Silver
    IF v_current_rank = 2 AND v_revenue >= 500000000 THEN
        SELECT COUNT(*)::INTEGER INTO v_silver_branches FROM public.users WHERE referred_by = p_user_id AND rank_level >= 2;
        IF v_silver_branches >= 2 THEN
            UPDATE public.users SET rank_level = 3 WHERE id = p_user_id;
            v_current_rank := 3;
        END IF;
    END IF;

    -- Cấp 4: Diamond Director (Giám đốc Kim cương)
    -- Yêu cầu: 2 tỷ doanh số + 3 nhánh Gold
    IF v_current_rank = 3 AND v_revenue >= 2000000000 THEN
        SELECT COUNT(*)::INTEGER INTO v_gold_branches FROM public.users WHERE referred_by = p_user_id AND rank_level >= 3;
        IF v_gold_branches >= 3 THEN
            UPDATE public.users SET rank_level = 4 WHERE id = p_user_id;
            v_current_rank := 4;
        END IF;
    END IF;

    -- Cấp 5: Crown Ambassador (Đại sứ Vương miện)
    -- Yêu cầu: 10 tỷ doanh số + 3 nhánh Diamond
    IF v_current_rank = 4 AND v_revenue >= 10000000000 THEN
        SELECT COUNT(*)::INTEGER INTO v_diamond_branches FROM public.users WHERE referred_by = p_user_id AND rank_level >= 4;
        IF v_diamond_branches >= 3 THEN
            UPDATE public.users SET rank_level = 5 WHERE id = p_user_id;
            v_current_rank := 5;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_package_purchase(
    p_buyer_id UUID,
    p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    v_rates JSONB;
    v_f1 UUID; v_f2 UUID;
    v_parent UUID;
    v_amt_admin NUMERIC; v_amt_leader NUMERIC; v_amt_support NUMERIC;
    v_amt_vat NUMERIC; v_amt_corporate NUMERIC;
    v_amt_f1 NUMERIC; v_amt_f2 NUMERIC;
BEGIN
    -- [A] Lấy cấu hình các tỉ lệ chia từ bảng Settings
    SELECT value INTO v_rates FROM public.system_settings WHERE key = 'commission_rates';
    
    -- Chia tỉ lệ vào quỹ và thuế
    v_amt_admin := p_amount * COALESCE((v_rates->>'fund_admin')::NUMERIC, 0.17);
    v_amt_leader := p_amount * COALESCE((v_rates->>'fund_leader')::NUMERIC, 0.05);
    v_amt_support := p_amount * COALESCE((v_rates->>'fund_support')::NUMERIC, 0.05);
    v_amt_vat := p_amount * COALESCE((v_rates->>'vat')::NUMERIC, 0.10);
    v_amt_corporate := p_amount * COALESCE((v_rates->>'corporate_tax')::NUMERIC, 0.03);
    
    -- Chia tỉ lệ Affiliate (2 Tầng)
    v_amt_f1 := p_amount * COALESCE((v_rates->>'f1')::NUMERIC, 0.40);
    v_amt_f2 := p_amount * COALESCE((v_rates->>'f2')::NUMERIC, 0.20);

    -- [B] Bơm tiền (40%) vào các Quỹ Trung Tâm và Thuế
    UPDATE public.funds SET balance = balance + v_amt_admin, total_in = total_in + v_amt_admin WHERE id = 'admin';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('admin', 'inflow', v_amt_admin, 'Lợi nhuận từ gói của User: ' || p_buyer_id);
    
    UPDATE public.funds SET balance = balance + v_amt_leader, total_in = total_in + v_amt_leader WHERE id = 'leader';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('leader', 'inflow', v_amt_leader, 'Trích thưởng từ gói của User: ' || p_buyer_id);
    
    UPDATE public.funds SET balance = balance + v_amt_support, total_in = total_in + v_amt_support WHERE id = 'support';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('support', 'inflow', v_amt_support, 'Trích hỗ trợ từ gói của User: ' || p_buyer_id);

    UPDATE public.funds SET balance = balance + v_amt_vat, total_in = total_in + v_amt_vat WHERE id = 'vat';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('vat', 'inflow', v_amt_vat, 'Khấu trừ VAT từ gói của User: ' || p_buyer_id);

    UPDATE public.funds SET balance = balance + v_amt_corporate, total_in = total_in + v_amt_corporate WHERE id = 'corporate_tax';
    INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('corporate_tax', 'inflow', v_amt_corporate, 'Khấu trừ Thuế TNDN từ gói của User: ' || p_buyer_id);

    -- [C] Trích xuất phả hệ 2 Tầng của Người mua
    SELECT referred_by INTO v_f1 FROM public.users WHERE id = p_buyer_id;
    IF v_f1 IS NOT NULL THEN
        SELECT referred_by INTO v_f2 FROM public.users WHERE id = v_f1;
    END IF;

    -- [D] Cập nhật doanh số cho các tuyến trên (Tới Gốc hệ thống)
    v_parent := v_f1;
    WHILE v_parent IS NOT NULL LOOP
        UPDATE public.users SET current_level_revenue = current_level_revenue + p_amount WHERE id = v_parent;
        -- Kiểm tra thăng cấp
        PERFORM check_and_update_rank(v_parent);
        
        SELECT referred_by INTO v_parent FROM public.users WHERE id = v_parent;
    END LOOP;

    -- [E] Chia tiền các tầng (F1->F2)
    -- Tầng 1
    IF v_f1 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f1, total_commission = total_commission + v_amt_f1 WHERE id = v_f1;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f1, 'commission', v_amt_f1, 'Hoa hồng F1 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f1, total_in = total_in + v_amt_f1 WHERE id = 'admin';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('admin', 'inflow', v_amt_f1, 'Hoa hồng F1 dư thừa (Trống tuyến)');
    END IF;

    -- Tầng 2
    IF v_f2 IS NOT NULL THEN
        UPDATE public.users SET balance = balance + v_amt_f2, total_commission = total_commission + v_amt_f2 WHERE id = v_f2;
        INSERT INTO public.transactions (user_id, type, amount, description) VALUES (v_f2, 'commission', v_amt_f2, 'Hoa hồng F2 (Từ User: ' || p_buyer_id || ')');
    ELSE
        UPDATE public.funds SET balance = balance + v_amt_f2, total_in = total_in + v_amt_f2 WHERE id = 'admin';
        INSERT INTO public.fund_transactions (fund_id, type, amount, description) VALUES ('admin', 'inflow', v_amt_f2, 'Hoa hồng F2 dư thừa (Trống tuyến)');
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
-- Kho lưu trữ Supabase Storage mặc định đã bật RLS. Mọi chính sách (policy) thiết lập ở dưới sẽ được áp dụng.

-- Policy cho bucket 'avatars' (Công khai xem nhưng hạn chế ghi)
DROP POLICY IF EXISTS "Ai cũng có thể xem ảnh đại diện" ON storage.objects;
CREATE POLICY "Ai cũng có thể xem ảnh đại diện"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "User có thể upload ảnh đại diện của mình" ON storage.objects;
CREATE POLICY "User có thể upload ảnh đại diện của mình"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "User có thể cập nhật/xóa ảnh đại diện của mình" ON storage.objects;
CREATE POLICY "User có thể cập nhật/xóa ảnh đại diện của mình"
ON storage.objects FOR ALL USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy cho bucket 'proofs' (Ảnh bằng chứng giao dịch - Bảo mật cao hơn)
DROP POLICY IF EXISTS "Admin có thể xem mọi bằng chứng giao dịch" ON storage.objects;
CREATE POLICY "Admin có thể xem mọi bằng chứng giao dịch"
ON storage.objects FOR SELECT USING (
    bucket_id = 'proofs' AND public.is_admin()
);

DROP POLICY IF EXISTS "User có thể xem bằng chứng của chính mình" ON storage.objects;
CREATE POLICY "User có thể xem bằng chứng của chính mình"
ON storage.objects FOR SELECT USING (
    bucket_id = 'proofs' AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "User upload bằng chứng giao dịch" ON storage.objects;
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

