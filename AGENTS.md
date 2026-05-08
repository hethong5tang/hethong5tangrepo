# Hướng dẫn và Quy tắc dự án

## Cấu trúc Phí và Hoa Hồng (Đã chốt)

Hệ thống áp dụng cơ chế phân bổ 20/80 cho toàn bộ các loại phí (Phí Tham Gia và Phí Duy Trì):

### 1. Phân bổ Quỹ (20% Tổng phí)
- **Ví Admin:** 10%
- **Quỹ Thưởng Leader:** 5%
- **Quỹ Hỗ Trợ:** 5%

### 2. Hoa hồng Hệ thống (80% Tổng phí)
Hoa hồng được chia cho 5 tầng ngược lên trên dựa trên **% của tổng giá trị gói**:
- **F1:** 40%
- **F2:** 16%
- **F3:** 12%
- **F4:** 8%
- **F5:** 4%

*Lưu ý: Tổng (Quỹ + Hoa hồng) phải luôn bằng 100%.*

## Quy định kỹ thuật
- Cho phép nhập số thập phân (ví dụ: 2.5%) cho tất cả các tỉ lệ phần trăm.
- Các tính toán số tiền hoa hồng hiển thị trong bảng admin phải tính trực tiếp từ Tổng phí * % Tầng.
