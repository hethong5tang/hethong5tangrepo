
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
            title: 'Hệ thống Liên kết kinh doanh <br class="hidden md:block" /> <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Tài nguyên AI bền vững</span>',
            subtitle: `Giải pháp kinh doanh số trên nền tảng Affiliate SaaS AI. Nhận chiết khấu dịch vụ 2 tầng, thưởng Leader và đồng chia lợi nhuận cộng đồng.`,
            ctaText: 'Tham gia ngay',
            logoText: 'Affiliate SaaS AI',
            logoUrl: '',
            useWideLogo: false,
            logoObjectPosition: 'center',
            stats: [
                { id: 'stat1', label: 'Tổng Thành viên', value: '17.848' },
                { id: 'stat2', label: 'Thành viên mới hôm nay', value: '+128' },
                { id: 'stat3', label: 'Giao dịch mới', value: '+2.145' },
                { id: 'stat4', label: 'Tổng lợi nhuận đã chi trả', value: '1.250.000.000đ' },
            ],
        },
        features: {
            title: 'Giá trị <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Cơ bản</span>',
            description: 'Nền tảng được xây dựng trên các nguyên tắc minh bạch, chia sẻ giá trị và tăng trưởng bền vững cho mọi đối tác.',
            items: [
                { id: 'f1', icon: 'CurrencyDollarIcon', title: '💰 Chiết khấu Liên kết', description: 'Nhận chiết khấu dịch vụ lên đến 60% từ 2 tầng (F1-F2).' },
                { id: 'f2', icon: 'TrophyIcon', title: '🏆 Thưởng Leader', description: 'Phần thưởng dành cho đối tác đạt mốc tăng trưởng từ quỹ 5% doanh thu hệ thống.' },
                { id: 'f3', icon: 'UserGroupIcon', title: '🤝 Quỹ Hỗ Trợ Cộng đồng', description: `Nguồn lực hỗ trợ những thành viên mới tiếp cận và sử dụng công nghệ.` },
            ],
        },
        whyUs: {
            title: 'Tại sao chọn <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Giải pháp của chúng tôi?</span>',
            description: 'Nền tảng của chúng tôi cam kết sự minh bạch, tuân thủ pháp luật và tạo giá trị thực.',
            items: [
                { id: 'w1', icon: 'TableCellsIcon', title: 'Minh bạch & Hợp pháp', description: 'Mọi dòng tiền và chiết khấu đều được công khai. Khấu trừ 10% thuế TNCN tự động, thực hiện đầy đủ nghĩa vụ Nhà nước.' },
                { id: 'w2', icon: 'ShieldCheckIcon', title: 'Sản phẩm Công nghệ Thực', description: 'Mô hình kinh doanh SaaS cung cấp dịch vụ AI thực tế. Tham gia để nhận Credit sử dụng các mô hình AI tiên tiến.' },
                { id: 'w3', icon: 'CpuChipIcon', title: 'Vận hành Tự động', description: 'Hệ thống đối soát và phân bổ lợi nhuận tự động, đảm bảo chính xác và tức thì cho mọi giao dịch.' },
                { id: 'w4', icon: 'ArrowTrendingUpIcon', title: 'Cơ hội Phát triển', description: 'Chính sách chiết khấu 2 tầng hấp dẫn giúp xây dựng nguồn thu nhập thụ động bền vững từ việc phát triển cộng đồng.' },
            ]
        },
        leaderboard: {
            title: 'Vinh danh <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Leader Tháng Này</span>',
            description: 'Chúc mừng các Leader xuất sắc nhất!',
            leaders: MOCK_LANDING_PAGE_LEADERS,
            metric: LeaderboardMetric.TotalEarnings,
        },
        pricing: {
            title: 'Gói <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Dịch Vụ AI</span>',
            plans: [
                { id: 'p1', name: 'Starter', tier: MembershipTier.Starter, price: 0, maintenanceFee: 0, features: ['Trải nghiệm các bộ công cụ AI tiêu chuẩn', 'Mở khóa hệ thống chiết khấu 2 tầng', 'Báo cáo và quản lý mạng lưới đối tác'], popular: false },
                { id: 'p2', name: 'Pro', tier: MembershipTier.Pro, price: 0, maintenanceFee: 0, features: ['Truy cập không giới hạn Model AI cao cấp', 'Trọn bộ tài liệu & kịch bản Marketing', 'Huy hiệu đối tác Pro & Hỗ trợ ưu tiên'], popular: true },
                { id: 'p3', name: 'Master', tier: MembershipTier.Master, price: 0, maintenanceFee: 0, features: ['<span class="font-bold text-amber-500">Mở khóa toàn bộ đặc quyền nền tảng</span>', 'Tham gia cộng đồng Leader chiến lược', 'Kênh hỗ trợ kỹ thuật trực tiếp 1-kèm-1'], popular: false }
            ]
        },
        faq: {
            title: 'Câu hỏi <span class="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Thường gặp</span>',
            items: [
                { id: 'q1', question: 'Duy trì tài khoản dịch vụ như thế nào?', answer: 'Tài khoản cần được duy trì phí thuê bao hàng tháng để đảm bảo quyền truy cập và nhận chiết khấu. Hệ thống sẽ có thông báo trước khi đến kỳ hạn.' },
                { id: 'q2', question: 'Quy trình đối soát và chi trả?', answer: 'Bạn có thể tạo yêu cầu rút lợi nhuận trong dashboard. Hệ thống sẽ phê duyệt và chuyển khoản trong vòng 24-48 giờ làm việc sau khi khấu trừ thuế theo quy định.' },
                { id: 'q3', question: 'Cơ chế thưởng Leader?', answer: 'Phần thưởng Leader được tổng kết dựa trên kết quả phát triển cộng đồng và doanh số thực tế của nhóm đối tác, được chi trả định kỳ hàng tháng.' }
            ]
        },
        footer: {
            tagline: 'Đồng hành cùng sự thịnh vượng của bạn.',
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
            copyright: '© 2026 Affiliate SaaS AI. All rights reserved.',
        },
        socialProof: {
            enabled: true,
            items: [
                { id: 'sp_1', content: '{name} vừa tham gia hệ thống.' },
                { id: 'sp_2', content: '{name} vừa nhận được {amount}đ chiết khấu dịch vụ.' },
                { id: 'sp_3', content: '{name} vừa nhận thành công {amount}đ lợi nhuận.' },
                { id: 'sp_4', content: '{name} vừa kích hoạt gói Pro.' },
            ]
        }
    }
};
