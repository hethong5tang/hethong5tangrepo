

import React, { useState, useMemo } from 'react';
import { AdminManagedUser } from '../../features/users/types';
import { CheckIcon, ClipboardDocumentIcon, UserPlusIcon, CursorArrowRaysIcon, ReceiptPercentIcon, FacebookIcon, ZaloIcon, TelegramIcon, MessengerIcon, SparklesIcon, ArrowPathIcon } from '../../components/Icons';
import { useToast } from '../../components/ToastProvider';
import { useSettings } from '../../features/settings/useSettings';
import { useAuth } from '../../features/auth/useAuth';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'indigo';
}

const colorClasses: Record<StatCardProps['color'], { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const currentColors = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${currentColors.bg} ${currentColors.text}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                </div>
            </div>
        </div>
    );
};

const iconMap: Record<string, React.FC<any>> = {
  FacebookIcon, ZaloIcon, TelegramIcon, MessengerIcon
};


const ReferralToolsPage: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { addToast } = useToast();
    const { settingsState } = useSettings();
    const { referralTools: contentTemplates } = settingsState.systemSettings;
    
    const [isLoadingShortLink, setIsLoadingShortLink] = useState(false);
    const [shortLink, setShortLink] = useState<string | null>(null);

    if (!user) {
        return null;
    }

    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${user.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralLink)}`;
    

    // Mock data for new stats
    const linkClicks = useMemo(() => 152 + user.f1Count * 3, [user.f1Count]);
    const conversionRate = useMemo(() => linkClicks > 0 ? (user.f1Count / linkClicks) * 100 : 0, [user.f1Count, linkClicks]);

    const handleCopy = (text: string, type: 'link' | 'code' | 'content' | 'short_link') => {
        navigator.clipboard.writeText(text);
        let message = '';
        switch (type) {
            case 'link':
                message = 'Đã sao chép link giới thiệu!';
                break;
            case 'short_link':
                message = 'Đã sao chép link giới thiệu đầy đủ!';
                break;
            case 'code':
                message = 'Đã sao chép mã giới thiệu!';
                break;
            case 'content':
                message = 'Đã sao chép nội dung mẫu!';
                break;
        }
        addToast(message, 'success');
    };
    
    const handleShortenLink = () => {
        setIsLoadingShortLink(true);
        setTimeout(() => {
            const domain = window.location.hostname.replace('www.', '');
            const shortCode = user.id.slice(-6);
            setShortLink(`https://${domain}/r/${shortCode}`);
            setIsLoadingShortLink(false);
            addToast('Đã tạo link rút gọn thành công!', 'success');
        }, 1000);
    };

    const handleSocialShare = (platform: 'facebook' | 'messenger' | 'telegram' | 'zalo') => {
        const encodedUrl = encodeURIComponent(referralLink);
        const text = "Bạn đang tìm kiếm cơ hội gia tăng thu nhập? Tham gia ngay hệ thống của chúng tôi và xây dựng mạng lưới của riêng bạn!";
        const encodedText = encodeURIComponent(text);
        
        let url = '';
        switch(platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'messenger':
                url = `fb-messenger://share?link=${encodedUrl}`; 
                window.open(url, '_blank');
                return;
            case 'telegram':
                url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'zalo':
                url = `https://sp.zalo.me/share_zalo?url=${encodedUrl}`;
                break;
        }
        window.open(url, '_blank', 'width=600,height=400');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Công Cụ & Hiệu suất Tuyển Dụng</h2>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<CursorArrowRaysIcon className="h-6 w-6"/>} label="Lượt nhấp vào link" value={linkClicks.toLocaleString('vi-VN')} color="blue" />
                <StatCard icon={<UserPlusIcon className="h-6 w-6"/>} label="Lượt đăng ký (F1)" value={user.f1Count.toLocaleString('vi-VN')} color="green" />
                <StatCard icon={<ReceiptPercentIcon className="h-6 w-6"/>} label="Tỷ lệ chuyển đổi" value={`${conversionRate.toFixed(2)}%`} color="indigo" />
            </div>

            {/* Main Sharing Tools */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Chia sẻ Link Giới thiệu</h3>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-grow w-full">
                         {/* Link */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link giới thiệu đầy đủ</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <input type="text" value={referralLink} readOnly className="block w-full flex-1 rounded-none rounded-l-md border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-300 px-3 py-2" />
                                <button onClick={() => handleCopy(referralLink, 'link')} className="relative inline-flex items-center space-x-2 rounded-r-md border border-gray-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                                    <ClipboardDocumentIcon className="h-5 w-5" />
                                    <span>Chép</span>
                                </button>
                            </div>
                            {!shortLink && (
                                <div className="mt-2 text-right">
                                    <button onClick={handleShortenLink} disabled={isLoadingShortLink} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                        {isLoadingShortLink 
                                            ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                            : <SparklesIcon className="h-4 w-4" />}
                                        <span>{isLoadingShortLink ? 'Đang tạo...' : 'Rút gọn link'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {shortLink && (
                            <div className="mt-4 animate-fadeIn">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link rút gọn</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" value={shortLink} readOnly className="block w-full flex-1 rounded-none rounded-l-md border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-300 px-3 py-2" />
                                    <button onClick={() => handleCopy(referralLink, 'short_link')} className="relative inline-flex items-center space-x-2 rounded-r-md border border-gray-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                                        <ClipboardDocumentIcon className="h-5 w-5" />
                                        <span>Chép</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Referral Code */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mã giới thiệu</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <input type="text" value={user.id} readOnly className="block w-full flex-1 rounded-none rounded-l-md border-gray-200 bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-300 px-3 py-2 font-mono text-base" />
                                <button onClick={() => handleCopy(user.id, 'code')} className="relative inline-flex items-center space-x-2 rounded-r-md border border-gray-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                                    <ClipboardDocumentIcon className="h-5 w-5" />
                                    <span>Chép</span>
                                </button>
                            </div>
                        </div>
                         {/* Social Share */}
                        <div className="mt-6">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chia sẻ nhanh qua</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleSocialShare('facebook')} className="h-12 w-12 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity" title="Chia sẻ lên Facebook"><FacebookIcon className="h-6 w-6"/></button>
                                <button onClick={() => handleSocialShare('messenger')} className="h-12 w-12 flex items-center justify-center rounded-full bg-[#00B2FF] text-white hover:opacity-90 transition-opacity" title="Gửi qua Messenger"><MessengerIcon className="h-7 w-7" /></button>
                                <button onClick={() => handleSocialShare('zalo')} className="h-12 w-12 flex items-center justify-center rounded-full bg-[#0068FF] text-white hover:opacity-90 transition-opacity" title="Chia sẻ qua Zalo"><ZaloIcon className="h-5 w-5" /></button>
                                <button onClick={() => handleSocialShare('telegram')} className="h-12 w-12 flex items-center justify-center rounded-full bg-[#26A5E4] text-white hover:opacity-90 transition-opacity" title="Chia sẻ lên Telegram"><TelegramIcon className="h-6 w-6" /></button>
                            </div>
                        </div>
                    </div>
                    <div className="text-center flex-shrink-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mã QR của bạn</p>
                        <div className="p-2 bg-white rounded-lg inline-block shadow-md">
                            <img src={qrCodeUrl} alt="Referral QR Code" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Thư viện Nội dung Mẫu</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sao chép nhanh các mẫu nội dung được cá nhân hóa, sẵn sàng để chia sẻ!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contentTemplates.map((template) => {
                        const Icon = iconMap[template.icon];
                        
                        const processedContent = template.content
                            .replace(/{userName}/g, user.name)
                            .replace(/{referralLink}/g, referralLink);
                        
                        return (
                            <div key={template.id} className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl flex flex-col border border-slate-200 dark:border-slate-700 h-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {template.customIconUrl ? (
                                            <img src={template.customIconUrl} alt={template.title} className="h-6 w-6 object-contain" />
                                        ) : (
                                            Icon && <Icon className="h-6 w-6" style={{ color: template.color }} />
                                        )}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{template.title}</h4>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-grow">{processedContent}</p>
                                <button
                                    onClick={() => handleCopy(processedContent, 'content')}
                                    className="mt-4 self-start inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900"
                                >
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                    <span>Sao chép nội dung</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ReferralToolsPage;