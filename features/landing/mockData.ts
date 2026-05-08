
import { MembershipTier } from '../users/types';
import { LandingPageState } from './types';
import { LeaderboardMetric } from '../settings/types';

const formatPriceText = (price: number) => price >= 1000000 ? `${price / 1000000} Triệu` : `${price / 1000}k`;

const MOCK_LANDING_PAGE_LEADERS = [
    { id: 'leader_1', name: 'Lê Thị Leader', avatar: 'https://picsum.photos/id/1027/100', score: 150000000 },
    { id: 'leader_2', name: 'Trần Văn Top', avatar: 'https://picsum.photos/id/1028/100', score: 125000000 },
    { id: 'leader_3', name: 'Ngô Bá Đạo', avatar: 'https://picsum.photos/id/1029/100', score: 98000000 },
];

export const initialLandingPageState: LandingPageState = {
    layout: ['hero', 'features', 'whyUs', 'leaderboard', 'pricing', 'faq'],
    content: {
        hero: {
            title: 'Hệ thống kiếm tiền <br class="hidden md:block" /> <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">thông minh & bền vững</span>',
            subtitle: `Chỉ với ... tham gia, nhận hoa hồng đến F5, thưởng Leader và Quỹ Hỗ Trợ.`,
            ctaText: 'Tham gia ngay',
            logoText: 'Monetize',
            logoUrl: '',
            useWideLogo: false,
            logoObjectPosition: 'center',
            stats: [
                { id: 'stat1', label: 'Tổng Thành viên', value: '17.848' },
                { id: 'stat2', label: 'Thành viên mới hôm nay', value: '+128' },
                { id: 'stat3', label: 'Giao dịch Hôm nay', value: '+2.145' },
                { id: 'stat4', label: 'Tổng Tiền đã chi trả', value: '1.250.000.000đ' },
            ],
        },
        features: {
            title: 'Giá trị <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Cốt lõi</span>',
            description: 'Nền tảng được xây dựng trên các nguyên tắc minh bạch, công bằng và tăng trưởng bền vững cho mọi thành viên.',
            items: [
                { id: 'f1', icon: 'CurrencyDollarIcon', title: '💰 Hoa hồng F1–F5', description: 'Nhận hoa hồng đến tầng 5 từ phí tham gia & duy trì.' },
                { id: 'f2', icon: 'TrophyIcon', title: '🏆 Quỹ Leader', description: 'Thưởng cho người đạt mốc, top tháng, và doanh thu F6 trở đi.' },
                { id: 'f3', icon: 'UserGroupIcon', title: '🤝 Quỹ Hỗ Trợ', description: `Chia cho người chưa có F1, tối đa .../người.` },
            ],
        },
        whyUs: {
            title: 'Tại sao chọn <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Monetize?</span>',
            description: 'Nền tảng của chúng tôi được thiết kế để mang lại sự minh bạch, bền vững và tiềm năng thu nhập không giới hạn.',
            items: [
                { id: 'w1', icon: 'TableCellsIcon', title: 'Minh bạch & Rõ ràng', description: 'Mọi giao dịch, hoa hồng và dòng tiền đều được ghi nhận chi tiết trên dashboard, giúp bạn dễ dàng theo dõi và kiểm soát.' },
                { id: 'w2', icon: 'ShieldCheckIcon', title: 'Cơ chế Bền vững', description: 'Mô hình chia sẻ lợi nhuận thông minh cùng các quỹ chung đảm bảo sự phát triển ổn định và lâu dài cho toàn hệ thống.' },
                { id: 'w3', icon: 'CpuChipIcon', title: 'Tự động & Chính xác', description: 'Hệ thống tự động tính toán và chi trả hoa hồng tức thì, loại bỏ sai sót của con người và đảm bảo quyền lợi của bạn.' },
                { id: 'w4', icon: 'ArrowTrendingUpIcon', title: 'Tiềm năng Tăng trưởng', description: 'Với sơ đồ 5 tầng và các mốc thưởng hấp dẫn, tiềm năng thu nhập của bạn là không giới hạn khi mạng lưới phát triển.' },
            ]
        },
        leaderboard: {
            title: 'Vinh danh <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Leader Tháng 8</span>',
            description: 'Chúc mừng các Leader xuất sắc nhất!',
            leaders: MOCK_LANDING_PAGE_LEADERS,
            metric: LeaderboardMetric.TotalEarnings,
        },
        pricing: {
            title: 'Gói <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Thành Viên</span>',
            plans: [
                { id: 'p1', name: 'Starter', tier: MembershipTier.Starter, price: 0, maintenanceFee: 0, features: ['Mở khóa hoa hồng 5 tầng', 'Truy cập dashboard quản lý'], popular: false },
                { id: 'p2', name: 'Pro', tier: MembershipTier.Pro, price: 0, maintenanceFee: 0, features: ['<span class="font-bold text-blue-400">x10</span> Mọi quyền lợi tài financial', 'Mở khóa hoa hồng 5 tầng', 'Ưu tiên hỗ trợ'], popular: true },
                { id: 'p3', name: 'Master', tier: MembershipTier.Master, price: 0, maintenanceFee: 0, features: ['<span class="font-bold text-amber-400">x100</span> Mọi quyền lợi tài financial', 'Mọi quyền lợi gói Pro', 'Đào tạo chiến lược đặc biệt'], popular: false }
            ]
        },
        faq: {
            title: 'Câu hỏi <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Thường gặp</span>',
            items: [
                { id: 'q1', question: 'Nếu không đóng phí duy trì thì sao?', answer: 'Tài khoản của bạn sẽ bị tạm khóa và không nhận được hoa hồng. Bạn có thể kích hoạt lại bằng cách đóng phí.' },
                { id: 'q2', question: 'Rút tiền thế nào?', answer: 'Bạn có thể tạo yêu cầu rút tiền trong dashboard cá nhân. Tiền sẽ được chuyển về tài khoản ngân hàng của bạn trong vòng 24-48 giờ làm việc sau khi được duyệt.' },
                { id: 'q3', question: 'Quỹ Leader chia ra sao?', answer: 'Quỹ Leader được tổng kết và chia vào cuối mỗi tháng cho các thành viên đủ điều kiện (đạt mốc, top doanh thu...) dựa trên các quy tắc được công bố.' }
            ]
        },
        footer: {
            tagline: 'Xây dựng tương lai tài chính của bạn.',
            columns: [
                {
                    id: 'col1',
                    title: 'Liên kết nhanh',
                    links: [
                        { id: 'link1_1', text: 'Trang chủ', url: '#' },
                        { id: 'link1_2', text: 'Gói thành viên', url: '#pricing' },
                        { id: 'link1_3', text: 'Đăng nhập', url: '#login' },
                    ]
                },
                {
                    id: 'col2',
                    title: 'Pháp lý',
                    links: [
                        { id: 'link2_1', text: 'Điều khoản Dịch vụ', url: '#tos' },
                        { id: 'link2_2', text: 'Chính sách Bảo mật', url: '#privacy' },
                        { id: 'link2_3', text: 'Chính sách Hệ thống', url: '#system-policy' },
                    ]
                }
            ],
            copyright: '© 2024 Monetization Platform. All rights reserved.',
        },
        socialProof: {
            enabled: true,
            items: [
                { id: 'sp_1', content: '{name} vừa tham gia hệ thống.' },
                { id: 'sp_2', content: '{name} vừa nhận được {amount}đ hoa hồng.' },
                { id: 'sp_3', content: '{name} vừa rút thành công {amount}đ.' },
                { id: 'sp_4', content: '{name} vừa kích hoạt gói Pro.' },
            ]
        }
    }
};
