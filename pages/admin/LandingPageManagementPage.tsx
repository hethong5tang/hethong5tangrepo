import React, { useState, useRef, useMemo } from 'react';
import { useLandingPageContent } from '../../features/landing/useLandingPageContent';
import { SectionId, LandingPageContent, FeatureItem, WhyUsItem, FaqItem, PricingPlan, LeaderboardLeader, FooterColumn, FooterLink, StatItem, SocialProofItem, HeroSectionContent, CoreValueSectionContent, WhyUsSectionContent, LeaderboardSectionContent, PricingSectionContent, FaqSectionContent, FooterSectionContent, SocialProofSectionContent } from '../../features/landing/types';
import Modal from '../../components/Modal';
import { 
    PencilSquareIcon, ArrowsUpDownIcon, TableCellsIcon, CheckIcon, SparklesIcon, TrophyIcon, 
    QuestionMarkCircleIcon, TagIcon, ShieldCheckIcon, ArrowUpTrayIcon, CurrencyDollarIcon, UserGroupIcon, 
    CpuChipIcon, ArrowTrendingUpIcon, BanknotesIcon, LifebuoyIcon, ChartPieIcon, PlusIcon, TrashIcon, XCircleIcon,
    BellIcon
} from '../../components/Icons';
import { useToast } from '../../components/ToastProvider';
import FormattedNumberInput from '../../components/FormattedNumberInput';

const SECTION_DETAILS: Record<SectionId | 'footer' | 'socialProof', { name: string; description: string; icon: React.FC<{className?: string}> }> = {
    hero: { name: 'Hero (Đầu trang)', description: 'Thay đổi tiêu đề chính, phụ và nút kêu gọi hành động đầu trang.', icon: SparklesIcon },
    features: { name: 'Giá trị Cốt lõi', description: 'Quản lý 3 giá trị cốt lõi của hệ thống hiển thị ngay dưới Hero.', icon: ShieldCheckIcon },
    whyUs: { name: 'Tại sao chọn chúng tôi', description: 'Chỉnh sửa các lý do, điểm mạnh của nền tảng.', icon: CheckIcon },
    leaderboard: { name: 'Bảng Vinh Danh', description: 'Quản lý Top 3 Leader hiển thị trên Bảng vinh danh.', icon: TrophyIcon },
    pricing: { name: 'Gói Thành Viên', description: 'Quản lý thông tin và quyền lợi của các gói thành viên.', icon: TagIcon },
    faq: { name: 'Câu hỏi Thường gặp', description: 'Thêm, sửa, xóa các câu hỏi và câu trả lời thường gặp.', icon: QuestionMarkCircleIcon },
    footer: { name: 'Footer (Chân trang)', description: 'Chỉnh sửa slogan, các cột liên kết và thông tin bản quyền.', icon: PencilSquareIcon },
    socialProof: { name: 'Thông báo Social Proof', description: 'Quản lý các thông báo hoạt động hiển thị ở góc trang chủ.', icon: BellIcon },
};

const AVAILABLE_ICONS = [
    { name: 'CurrencyDollarIcon', component: CurrencyDollarIcon },
    { name: 'TrophyIcon', component: TrophyIcon },
    { name: 'UserGroupIcon', component: UserGroupIcon },
    { name: 'TableCellsIcon', component: TableCellsIcon },
    { name: 'ShieldCheckIcon', component: ShieldCheckIcon },
    { name: 'CpuChipIcon', component: CpuChipIcon },
    { name: 'ArrowTrendingUpIcon', component: ArrowTrendingUpIcon },
    { name: 'BanknotesIcon', component: BanknotesIcon },
    { name: 'LifebuoyIcon', component: LifebuoyIcon },
    { name: 'SparklesIcon', component: SparklesIcon },
    { name: 'ChartPieIcon', component: ChartPieIcon },
];

// --- Edit Modal ---
const EditSectionModal: React.FC<{ sectionId: keyof LandingPageContent; onClose: () => void; }> = ({ sectionId, onClose }) => {
    const { state, dispatch } = useLandingPageContent();
    const [formData, setFormData] = useState(state.content[sectionId]);
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iconFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingLeaderIndex, setUploadingLeaderIndex] = useState<number | null>(null);
    const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);

    const handleSave = () => {
        dispatch({ type: 'SET_SECTION_CONTENT', payload: { sectionId, content: formData } });
        addToast(`Đã cập nhật nội dung phần "${SECTION_DETAILS[sectionId as SectionId | 'footer' | 'socialProof'].name}"!`, 'success');
        onClose();
    };
    
    // Generic text input handler
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };
    
    const handleClearField = (fieldName: string) => {
        setFormData((prev: any) => ({ ...prev, [fieldName]: '' }));
    };
    
    const handleItemChange = (index: number, field: string, value: string) => {
        // @ts-ignore
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, items: newItems }));
    };

    const handleStatChange = (index: number, field: keyof StatItem, value: string) => {
        // @ts-ignore
        const newStats = [...(formData.stats || [])];
        newStats[index] = { ...newStats[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, stats: newStats }));
    };

    const handleLeaderChange = (index: number, field: keyof LeaderboardLeader, value: string | number) => {
        // @ts-ignore
        const newLeaders = [...(formData.leaders || [])];
        newLeaders[index] = { ...newLeaders[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, leaders: newLeaders }));
    };
    
    const handlePositionChange = (axis: 'horizontal' | 'vertical', value: string) => {
        setFormData((prev: any) => {
            const currentPos = (prev.logoObjectPosition || 'center center').split(' ');
            let horizontal = currentPos[0];
            let vertical = currentPos[1];

            if (axis === 'horizontal') {
                horizontal = value;
            } else {
                vertical = value;
            }
            if(!vertical) vertical = 'center';

            return { ...prev, logoObjectPosition: `${horizontal} ${vertical}` };
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (result: string) => void) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    callback(event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        if (e.target) e.target.value = '';
    };

    const triggerFileUpload = (index: number) => {
        setUploadingLeaderIndex(index);
        fileInputRef.current?.click();
    };

    const triggerIconUpload = (index: number) => {
        setUploadingItemIndex(index);
        iconFileInputRef.current?.click();
    };

    // --- Footer Handlers ---
    const handleColumnChange = (colIndex: number, field: keyof FooterColumn, value: string) => {
        // @ts-ignore
        const newColumns = [...formData.columns];
        newColumns[colIndex] = { ...newColumns[colIndex], [field]: value };
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };
    const handleLinkChange = (colIndex: number, linkIndex: number, field: keyof FooterLink, value: string) => {
        // @ts-ignore
        const newColumns = [...formData.columns];
        const newLinks = [...newColumns[colIndex].links];
        newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value };
        newColumns[colIndex] = { ...newColumns[colIndex], links: newLinks };
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };
    const addLink = (colIndex: number) => {
        // @ts-ignore
        const newColumns = [...formData.columns];
        newColumns[colIndex].links.push({ id: `link_${Date.now()}`, text: 'Liên kết mới', url: '#' });
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };
    const removeLink = (colIndex: number, linkIndex: number) => {
        // @ts-ignore
        const newColumns = [...formData.columns];
        newColumns[colIndex].links.splice(linkIndex, 1);
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };
     const removeColumn = (colIndex: number) => {
        // @ts-ignore
        const newColumns = formData.columns.filter((_: any, index: number) => index !== colIndex);
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };
     const addColumn = () => {
        // @ts-ignore
        const newColumns = [...formData.columns, { id: `col_${Date.now()}`, title: 'Cột mới', links: [] }];
        setFormData((prev: any) => ({ ...prev, columns: newColumns }));
    };

    const renderForm = () => {
        switch (sectionId) {
            case 'hero': {
                const data = formData as HeroSectionContent;
                return (
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-base">Logo & Thương hiệu</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 transition-all ${data.useWideLogo ? 'w-40 h-8' : 'w-24 h-24'}`}>
                                    {data.logoUrl ? <img src={data.logoUrl} alt="Logo preview" className="object-cover h-full w-full" style={{ objectPosition: data.logoObjectPosition || 'center' }} /> : <span className="text-xs text-slate-500">Xem trước</span>}
                                </div>
                                <div className="space-y-2">
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, (res) => setFormData((prev:any) => ({...prev, logoUrl: res})))} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Tải lên logo</button>
                                    {data.logoUrl && <button type="button" onClick={() => setFormData((prev: any) => ({ ...prev, logoUrl: '' }))} className="text-sm text-red-500 hover:underline block">Xóa logo</button>}
                                    {data.useWideLogo ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">Khung xem trước hoạt động như công cụ crop. Ảnh sẽ được hiển thị từ trung tâm với tỉ lệ 5:1 (ví dụ: 200x40px). Hỗ trợ SVG, PNG, JPG.</p>
                                    ) : (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">Tỉ lệ 1:1 (vuông), PNG nền trong suốt.</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                               <span className="flex flex-grow flex-col">
                                 <span className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">Sử dụng logo rộng</span>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logo sẽ thay thế cả icon và tên thương hiệu.</p>
                               </span>
                               <button
                                 type="button"
                                 onClick={() => setFormData((p:any) => ({...p, useWideLogo: !p.useWideLogo}))}
                                 className={`${data.useWideLogo ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                               >
                                 <span className={`${data.useWideLogo ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
                               </button>
                           </div>
                            {data.useWideLogo && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Căn chỉnh Logo</h5>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Căn ngang</p>
                                            <div className="flex items-center gap-2">
                                                {['left', 'center', 'right'].map(pos => (
                                                    <button
                                                        key={pos}
                                                        type="button"
                                                        onClick={() => handlePositionChange('horizontal', pos)}
                                                        className={`px-3 py-1 text-xs rounded-md border ${
                                                            (data.logoObjectPosition || 'center center').split(' ')[0] === pos
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600'
                                                                : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Căn dọc</p>
                                            <div className="flex items-center gap-2">
                                                 {['top', 'center', 'bottom'].map(pos => (
                                                    <button
                                                        key={pos}
                                                        type="button"
                                                        onClick={() => handlePositionChange('vertical', pos)}
                                                        className={`px-3 py-1 text-xs rounded-md border ${
                                                            (data.logoObjectPosition || 'center center').split(' ')[1] === pos
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600'
                                                                : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {!data.useWideLogo && (
                                <label className="block pt-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tên thương hiệu</span>
                                    <div className="relative mt-1">
                                        <input type="text" name="logoText" value={data.logoText || ''} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                        {data.logoText && (
                                            <button type="button" onClick={() => handleClearField('logoText')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                         <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-base">Nội dung Hero</h4>
                         <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề chính (hỗ trợ HTML)</span>
                                <div className="relative mt-1">
                                    <textarea name="title" value={data.title} onChange={handleTextChange} rows={3} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                    {data.title && (
                                        <button type="button" onClick={() => handleClearField('title')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề phụ</span>
                                <div className="relative mt-1">
                                    <textarea name="subtitle" value={data.subtitle} onChange={handleTextChange} rows={2} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                    {data.subtitle && (
                                        <button type="button" onClick={() => handleClearField('subtitle')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Văn bản trên nút bấm</span>
                                <div className="relative mt-1">
                                    <input type="text" name="ctaText" value={data.ctaText} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                    {data.ctaText && (
                                        <button type="button" onClick={() => handleClearField('ctaText')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-base">Thống kê Nổi bật</h4>
                        <div className="space-y-4">
                            {data.stats.map((stat: StatItem, index: number) => (
                                <div key={stat.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <label className="block text-sm">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Tiêu đề #{index + 1}</span>
                                        <div className="relative mt-1">
                                            <input type="text" value={stat.label} onChange={e => handleStatChange(index, 'label', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                            {stat.label && <button type="button" onClick={() => handleStatChange(index, 'label', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}
                                        </div>
                                    </label>
                                    <label className="block text-sm">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Giá trị #{index + 1}</span>
                                        <div className="relative mt-1">
                                            <input type="text" value={stat.value} onChange={e => handleStatChange(index, 'value', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                            {stat.value && <button type="button" onClick={() => handleStatChange(index, 'value', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );}
            case 'features':
            case 'whyUs': {
                const data = formData as (CoreValueSectionContent | WhyUsSectionContent);
                return (
                    <div className="space-y-6">
                         <input
                            type="file"
                            ref={iconFileInputRef}
                            onChange={(e) => handleFileUpload(e, (result) => {
                                if (uploadingItemIndex !== null) {
                                    handleItemChange(uploadingItemIndex, 'customIconUrl', result);
                                }
                            })}
                            className="hidden"
                            accept="image/png, image/jpeg, image/svg+xml"
                        />
                         <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề Section</span>
                                <div className="relative mt-1">
                                    <input type="text" name="title" value={data.title} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                    {data.title && (
                                        <button type="button" onClick={() => handleClearField('title')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>
                                    )}
                                </div>
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mô tả Section</span>
                                <div className="relative mt-1">
                                    <textarea name="description" value={data.description} onChange={handleTextChange} rows={3} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                    {data.description && (
                                        <button type="button" onClick={() => handleClearField('description')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>
                                    )}
                                </div>
                            </label>
                        </div>

                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t border-slate-200 dark:border-slate-700">Các mục con</h4>
                        
                        {(data.items as any[]).map((item: FeatureItem | WhyUsItem, index: number) => (
                            <div key={item.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3">
                                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Icon Tùy chỉnh</h5>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 w-16 h-16">
                                                {item.customIconUrl ? <img src={item.customIconUrl} alt="Custom Icon" className="object-contain h-full w-full p-1" /> : <span className="text-xs text-slate-500">Xem trước</span>}
                                            </div>
                                            <div className="space-y-1">
                                                <button type="button" onClick={() => triggerIconUpload(index)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Tải lên</button>
                                                {item.customIconUrl && <button type="button" onClick={() => handleItemChange(index, 'customIconUrl', '')} className="text-sm text-red-500 hover:underline block">Xóa</button>}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Khuyến khích: SVG hoặc PNG nền trong, tỉ lệ 1:1 (vuông), ví dụ: 64x64px.</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Hoặc chọn Icon có sẵn</h5>
                                        <div className="flex items-center gap-4 mt-3">
                                            <label className="block text-sm flex-grow">
                                                <select value={item.icon} onChange={e => handleItemChange(index, 'icon', e.target.value)} disabled={!!item.customIconUrl} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                    {AVAILABLE_ICONS.map(iconInfo => (<option key={iconInfo.name} value={iconInfo.name}>{iconInfo.name.replace('Icon', '')}</option>))}
                                                </select>
                                            </label>
                                            <div className={`p-3 rounded-full mt-1 transition-opacity ${item.customIconUrl ? 'bg-slate-200/50 dark:bg-slate-800/50 opacity-50' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                                {React.createElement(AVAILABLE_ICONS.find(i => i.name === item.icon)?.component || SparklesIcon, { className: "h-6 w-6 text-slate-700 dark:text-slate-200" })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Tiêu đề mục con
                                        <div className="relative mt-1">
                                            <input type="text" value={item.title} onChange={e => handleItemChange(index, 'title', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                            {item.title && (<button type="button" onClick={() => handleItemChange(index, 'title', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}
                                        </div>
                                    </label>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Mô tả mục con
                                        <div className="relative mt-1">
                                            <input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />
                                            {item.description && (<button type="button" onClick={() => handleItemChange(index, 'description', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
             case 'leaderboard': {
                const data = formData as LeaderboardSectionContent;
                return (
                <div className="space-y-6">
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, (result) => { if (uploadingLeaderIndex !== null) { handleLeaderChange(uploadingLeaderIndex, 'avatar', result) } })} className="hidden" accept="image/*" />
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề</span><div className="relative mt-1"><input type="text" name="title" value={data.title} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.title && (<button type="button" onClick={() => handleClearField('title')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mô tả</span><div className="relative mt-1"><textarea name="description" value={data.description} onChange={handleTextChange} rows={3} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.description && (<button type="button" onClick={() => handleClearField('description')} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t border-slate-200 dark:border-slate-700">Top 3 Leaders</h4>
                    {data.leaders.map((leader: LeaderboardLeader, index: number) => (
                        <div key={leader.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30 space-y-4">
                            <h5 className="font-medium text-slate-800 dark:text-slate-200">Top {index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Ảnh đại diện</p>
                                    <div className="flex items-center gap-4">
                                        <img src={leader.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500" />
                                        <div className="flex-grow space-y-2">
                                            <button type="button" onClick={() => triggerFileUpload(index)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"><ArrowUpTrayIcon className="h-4 w-4" />Upload ảnh</button>
                                            <p className="text-xs text-slate-500">Hoặc dán link ảnh vào ô bên dưới.</p>
                                        </div>
                                    </div>
                                    <div className="relative"><input type="text" value={leader.avatar} onChange={e => handleLeaderChange(index, 'avatar', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm text-xs pr-10" />{leader.avatar && (<button type="button" onClick={() => handleLeaderChange(index, 'avatar', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên:<div className="relative mt-1"><input type="text" value={leader.name} onChange={e => handleLeaderChange(index, 'name', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{leader.name && (<button type="button" onClick={() => handleLeaderChange(index, 'name', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Doanh thu (VNĐ):
                                        <FormattedNumberInput
                                            value={leader.score}
                                            onChange={(value) => handleLeaderChange(index, 'score', value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );}
            case 'pricing': {
                const data = formData as PricingSectionContent;
                return (
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề Section</span><div className="relative mt-1"><input type="text" name="title" value={data.title} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.title && (<button type="button" onClick={() => handleClearField('title')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                    </div>
                    {data.plans.map((plan: PricingPlan, index: number) => (
                        <div key={plan.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30 space-y-4">
                            <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">Gói: {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}</h4>
                            <div className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Giá và Phí duy trì được quản lý tại trang <strong className="text-slate-600 dark:text-slate-300">Phí &amp; Hoa hồng</strong>.</p>
                            </div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tính năng (mỗi dòng một tính năng, hỗ trợ HTML):
                                <div className="relative mt-1">
                                    <textarea 
                                        value={plan.features.join('\n')} 
                                        onChange={e => { 
                                            const newPlans = [...data.plans]; 
                                            newPlans[index].features = e.target.value.split('\n'); 
                                            setFormData({...formData, plans: newPlans}); 
                                        }} 
                                        rows={4} 
                                        className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" 
                                    />
                                    {plan.features.join('').length > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={() => { 
                                                const newPlans = [...data.plans]; 
                                                newPlans[index].features = []; 
                                                setFormData({...formData, plans: newPlans}); 
                                            }} 
                                            className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                        >
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
            );}
            case 'faq': {
                const data = formData as FaqSectionContent;
                return (
                 <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề Section</span><div className="relative mt-1"><input type="text" name="title" value={data.title} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.title && (<button type="button" onClick={() => handleClearField('title')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                    </div>
                    {data.items.map((item: FaqItem, index: number) => (
                        <div key={item.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/30 space-y-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Câu hỏi:<div className="relative mt-1"><input type="text" value={item.question} onChange={e => { const newItems = [...data.items]; newItems[index] = { ...newItems[index], question: e.target.value }; setFormData({ ...formData, items: newItems } as any); }} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{item.question && (<button type="button" onClick={() => { const newItems = [...data.items]; newItems[index] = { ...newItems[index], question: '' }; setFormData({ ...formData, items: newItems } as any); }} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Câu trả lời:<div className="relative mt-1"><textarea value={item.answer} onChange={e => { const newItems = [...data.items]; newItems[index] = { ...newItems[index], answer: e.target.value }; setFormData({ ...formData, items: newItems } as any); }} rows={3} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{item.answer && (<button type="button" onClick={() => { const newItems = [...data.items]; newItems[index] = { ...newItems[index], answer: '' }; setFormData({ ...formData, items: newItems } as any); }} className="absolute top-2 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>)}</div></label>
                        </div>
                    ))}
                </div>
            );}
            case 'footer': {
                 const data = formData as FooterSectionContent;
                 return (
                 <div className="space-y-6">
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Nội dung chung</h4>
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slogan (dưới logo)</span><div className="relative mt-1"><input type="text" name="tagline" value={data.tagline || ''} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.tagline && <button type="button" onClick={() => handleClearField('tagline')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}</div></label>
                        <label className="block"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dòng Bản quyền</span><div className="relative mt-1"><input type="text" name="copyright" value={data.copyright} onChange={handleTextChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10" />{data.copyright && <button type="button" onClick={() => handleClearField('copyright')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}</div></label>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Các cột liên kết</h4><button onClick={addColumn} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900"><PlusIcon className="h-4 w-4"/>Thêm Cột</button></div>
                        <div className="space-y-4">
                            {data.columns.map((col: FooterColumn, colIndex: number) => (
                                <div key={col.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                                    <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                                        <div className="relative flex-grow"><input type="text" value={col.title} placeholder="Tiêu đề cột" onChange={e => handleColumnChange(colIndex, 'title', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm pr-10 text-sm font-semibold" />{col.title && <button type="button" onClick={() => handleColumnChange(colIndex, 'title', '')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}</div>
                                        <button onClick={() => removeColumn(colIndex)} className="ml-3 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {col.links.map((link, linkIndex) => (
                                            <div key={link.id} className="grid grid-cols-2 gap-4 items-end">
                                                <label className="block text-sm"><span className="text-xs font-medium text-slate-600 dark:text-slate-400">Văn bản</span><div className="relative mt-1"><input type="text" value={link.text} onChange={e => handleLinkChange(colIndex, linkIndex, 'text', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm text-sm pr-8" placeholder="Trang chủ" />{link.text && <button type="button" onClick={() => handleLinkChange(colIndex, linkIndex, 'text', '')} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-4 w-4" /></button>}</div></label>
                                                <div className="flex items-end gap-2">
                                                    <label className="block text-sm flex-grow"><span className="text-xs font-medium text-slate-600 dark:text-slate-400">URL</span><div className="relative mt-1"><input type="text" value={link.url} onChange={e => handleLinkChange(colIndex, linkIndex, 'url', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm text-sm pr-8" placeholder="#pricing" />{link.url && <button type="button" onClick={() => handleLinkChange(colIndex, linkIndex, 'url', '')} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-4 w-4" /></button>}</div></label>
                                                    <button onClick={() => removeLink(colIndex, linkIndex)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full mb-0.5"><TrashIcon className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {col.links.length === 0 && <p className="text-xs text-center text-slate-500 py-2">Chưa có liên kết nào.</p>}
                                        <button onClick={() => addLink(colIndex)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 pt-2"><PlusIcon className="h-3 w-3"/>Thêm liên kết</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );}
            case 'socialProof': {
                 const data = formData as SocialProofSectionContent;
                 return (
                 <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="flex flex-grow flex-col">
                                <span className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">Bật/Tắt tính năng</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hiển thị các thông báo hoạt động ở góc dưới trang chủ.</p>
                            </span>
                            <button
                                type="button"
                                onClick={() => setFormData((p: any) => ({ ...p, enabled: !p.enabled }))}
                                className={`${data.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                            >
                                <span className={`${data.enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Mẫu nội dung thông báo</h4><button onClick={() => { const newItems = [...data.items, { id: `sp_${Date.now()}`, content: '{name} vừa ...' }]; setFormData((p: any) => ({ ...p, items: newItems })); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900"><PlusIcon className="h-4 w-4" />Thêm mẫu</button></div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            Sử dụng các biến sau để chèn dữ liệu động: <br/>
                            <code className="bg-blue-200/50 dark:bg-blue-800/50 px-1 py-0.5 rounded font-mono">{'{name}'}</code> để chèn tên người dùng ngẫu nhiên. <br/>
                            <code className="bg-blue-200/50 dark:bg-blue-800/50 px-1 py-0.5 rounded font-mono">{'{amount}'}</code> để chèn số tiền giao dịch ngẫu nhiên.
                        </div>
                        {data.items.map((item: SocialProofItem, index: number) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <input 
                                        type="text" 
                                        value={item.content}
                                        onChange={e => handleItemChange(index, 'content', e.target.value)}
                                        className="block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm text-sm pr-16" 
                                    />
                                     {item.content && (
                                        <button type="button" onClick={() => handleItemChange(index, 'content', '')} className="absolute inset-y-0 right-8 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>
                                     )}
                                </div>
                                <button 
                                    onClick={() => {
                                        const newItems = data.items.filter((_: any, i: number) => i !== index);
                                        setFormData((p: any) => ({ ...p, items: newItems }));
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full flex-shrink-0"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );}
            default: return null;
        }
    }

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Chỉnh sửa: ${SECTION_DETAILS[sectionId as SectionId | 'footer' | 'socialProof'].name}`}
            confirmText="Lưu"
            onConfirm={handleSave}
            size="3xl"
        >
            {renderForm()}
        </Modal>
    );
};

const LandingPageManagementPage: React.FC = () => {
    const [editingSection, setEditingSection] = useState<keyof LandingPageContent | null>(null);

    const sections: (keyof LandingPageContent)[] = ['hero', 'features', 'whyUs', 'leaderboard', 'pricing', 'faq', 'footer', 'socialProof'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Trang chủ</h2>
            
            {editingSection && (
                <EditSectionModal 
                    sectionId={editingSection} 
                    onClose={() => setEditingSection(null)} 
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map(sectionId => {
                    const info = SECTION_DETAILS[sectionId];
                    const Icon = info.icon;
                    return (
                        <div key={sectionId} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{info.name}</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                                {info.description}
                            </p>
                            <button 
                                onClick={() => setEditingSection(sectionId)} 
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                                Chỉnh sửa
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LandingPageManagementPage;
