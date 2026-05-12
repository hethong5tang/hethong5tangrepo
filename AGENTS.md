# Hướng dẫn và Quy tắc dự án (Model: Affiliate SaaS AI)

## Cấu trúc Gói Thuê Bao và Chiết Khấu (Đã cập nhật theo mô hình 2 tầng)

Hệ thống áp dụng cơ chế phân bổ 40/60 cho toàn bộ các gói thuê bao dịch vụ AI (Subscription):

### 1. Phân bổ Quỹ Hệ thống (40% Doanh thu)
Hệ thống giữ lại 40% doanh thu phân bổ như sau:
- **Thuế VAT (10%):** Thuế nộp cho Nhà nước.
- **Thuế Doanh nghiệp (3%):** Thuế TNDN trên phần thặng dư.
- **Chi phí API & Vận hành (Ví Admin) (17%):** Bao gồm Tiền API + Server + Lợi nhuận Admin + 5.000 phí cố định khi rút tiền của mỗi user.
- **Quỹ Leader (5%):** Dùng để thưởng doanh số/đồng chia.
- **Quỹ Hỗ trợ (5%):** Xử lý sự cố, refund, khuyến mãi.

### 2. Chiết khấu Tiếp thị liên kết (60% Doanh thu)
Chiết khấu được chia cho tối đa 02 tầng (Affiliate 2-tier) dựa trên **% của tổng giá trị gói dịch vụ**:
- **Hoa hồng F1 (40%):** Trả cho người giới thiệu trực tiếp.
- **Phí quản lý F2 (20%):** Trả cho người tuyến trên F1.

*Lưu ý: Tổng (Quỹ + Chiết khấu) luôn bằng 100%. Đây là mô hình Affiliate SaaS hợp pháp.*

## Quy định về Thuế và Rút tiền
- **Thuế TNCN:** Hệ thống tự động khấu trừ 10% Thuế thu nhập cá nhân trên mọi lệnh rút tiền để thực hiện nghĩa vụ với Nhà nước.
- **Minh bạch:** Mọi giao dịch phải hiển thị rõ: Số tiền rút - Khấu trừ thuế - Thực nhận.

## Quy định kỹ thuật
- Cho phép nhập số thập phân (ví dụ: 2.5%) cho tất cả các tỉ lệ phần trăm.
- Các tính toán số tiền hoa hồng hiển thị trong bảng admin phải tính trực tiếp từ Tổng phí * % Tầng.
- Hệ thống phải gắn liền với giá trị thực: Nạp gói = Nhận Credit sử dụng AI tương ứng.
