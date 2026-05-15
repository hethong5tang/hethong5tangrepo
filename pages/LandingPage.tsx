
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { UserRole } from '../types';
import { MembershipTier } from '../features/users/types';
import Modal from '../components/Modal';
import LoginScreen from '../components/LoginScreen';
import { SparklesIcon, CurrencyDollarIcon, TrophyIcon, UserGroupIcon, ChevronDownIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, CheckCircleFillIcon, TableCellsIcon, ShieldCheckIcon, CpuChipIcon, ArrowTrendingUpIcon, BanknotesIcon, LifebuoyIcon, ChartPieIcon } from '../components/Icons';
import { useAuth } from '../features/auth/useAuth';
import { useUser } from '../features/users/useUser';
import { useLandingPageContent } from '../features/landing/useLandingPageContent';
import { SectionId, FaqItem, PricingPlan, WhyUsItem, FeatureItem, LeaderboardLeader, StatItem } from '../features/landing/types';
import { SocialProofToasts } from '../components/SocialProofToasts';
import LogoDisplay from '../components/LogoDisplay';
import { useActions } from '../features/actions/useActions';
import { LeaderboardMetric } from '../features/settings/types';
import { useSettings } from '../features/settings/useSettings';
import { ThemeToggle } from '../components/ThemeToggle';
import { Trophy, Medal, Crown } from 'lucide-react';
import { IS_DEMO_MODE } from '../config';

const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const elementsRef = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        elementsRef.current.forEach(el => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [options, elementsRef.current]);

    return (el: HTMLElement | null) => {
        if (el && !elementsRef.current.includes(el)) {
            elementsRef.current.push(el);
        }
    };
};

const iconMap: Record<string, React.FC<any>> = {
    CurrencyDollarIcon, TrophyIcon, UserGroupIcon,
    TableCellsIcon, ShieldCheckIcon, CpuChipIcon, ArrowTrendingUpIcon,
    BanknotesIcon, LifebuoyIcon, SparklesIcon, ChartPieIcon
};

const StatDisplayItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="text-center">
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</h4>
        <p className={`text-3xl font-bold tracking-tight ${
            label.includes('Chi trả') ? 'text-green-500 dark:text-green-400' : 
            label.includes('mới') || label.includes('Hôm nay') ? 'text-blue-500 dark:text-blue-400' :
            'text-slate-900 dark:text-white'
        }`}>{value}</p>
    </div>
);

const GrowthPreview: React.FC<{ stats: StatItem[] }> = ({ stats }) => {
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.5 });
        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);
    
    const chartData = useMemo(() => {
        const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
        const baseUsers = IS_DEMO_MODE ? 5000 : 0;
        const growthFactor = IS_DEMO_MODE ? 1.15 : 1.05;
        let cumulativeUsers = baseUsers;
        return months.map(month => {
            const growth = IS_DEMO_MODE ? (Math.random() * (growthFactor - 1) + 0.05) : 0;
            cumulativeUsers *= (1 + growth);
            return {
                name: month,
                'Thành viên': Math.round(cumulativeUsers),
            };
        });
    }, []);

    if (!IS_DEMO_MODE && chartData[chartData.length - 1]['Thành viên'] === 0) {
        return (
            <section ref={ref} className="pt-24 pb-12 transition-colors duration-300">
                <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll">
                    <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-lg rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl shadow-indigo-500/5 dark:shadow-indigo-500/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat) => (
                                <StatDisplayItem key={stat.id} label={stat.label} value={stat.value} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section ref={ref} className="pt-24 pb-12 transition-colors duration-300">
            <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll">
                 <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-lg rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl shadow-indigo-500/5 dark:shadow-indigo-500/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        {stats.map((stat) => (
                            <StatDisplayItem key={stat.id} label={stat.label} value={stat.value} />
                        ))}
                    </div>
                    <div style={{ height: '300px' }} className="w-full">
                        {isInView && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value)/1000}k`} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                            borderColor: 'rgba(100, 116, 139, 0.5)',
                                            borderRadius: '0.5rem',
                                            color: '#fff'
                                        }}
                                        formatter={(value: number) => `${value.toLocaleString('vi-VN')} thành viên`}
                                    />
                                    <Area type="monotone" dataKey="Thành viên" stroke="#818cf8" fillOpacity={1} fill="url(#colorUv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                 </div>
            </div>
        </section>
    );
};


const SectionCurve = ({ flip }: { flip?: boolean }) => (
  <div className={`absolute w-full ${flip ? 'bottom-0' : 'top-0'} left-0 leading-none ${flip ? 'transform rotate-180' : ''}`}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full h-auto fill-current text-slate-50 dark:text-slate-900 transition-colors duration-300">
      <path d="M1440 48L1200 48C960 48 480 48 240 48L0 48V0H240C480 0 960 0 1200 0L1440 0V48Z" fillOpacity="0.1"></path>
      <path d="M0 48C139.756 32.3333 440.354 -2.99999 720 48C999.646 98.9999 1300.24 80.3333 1440 48V120H0V48Z"></path>
    </svg>
  </div>
);

// --- Section Components ---

const HeroSection: React.FC<{ data: any; setLoginModalOpen: (open: boolean) => void }> = ({ data, setLoginModalOpen }) => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Decorative background elements for Hero */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-green-400/20 dark:bg-green-600/10 rounded-full blur-[100px] animate-pulse-slow transition-delay-1000"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: data.title }} />
            <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300">{data.subtitle}</p>
            <button onClick={() => setLoginModalOpen(true)} className="mt-8 px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-green-500 rounded-lg hover:scale-105 transform transition-transform shadow-lg shadow-blue-500/50">
                {data.ctaText}
            </button>
            <GrowthPreview stats={data.stats} />
        </div>
    </section>
);

const FeaturesSection: React.FC<{ data: any; }> = ({ data }) => {
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    
    return (
        <section id="features" className="relative py-24 bg-white dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-dot-pattern opacity-[0.4] dark:opacity-[0.2]"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px]"></div>
            <SectionCurve />
            <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll relative z-10">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="text-center lg:text-left lg:col-span-1">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4" dangerouslySetInnerHTML={{ __html: data.title }} />
                        <p className="text-slate-600 dark:text-slate-400">{data.description}</p>
                    </div>
                    {data.items.map((item: FeatureItem, i: number) => {
                        return (
                             <div key={item.id} className="p-8 bg-white dark:bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all hover:shadow-indigo-500/30 hover:border-indigo-500">
                                <div className="inline-block p-3 bg-indigo-50 dark:bg-slate-700/50 rounded-full mb-4">
                                    {item.customIconUrl ? (
                                        <img src={item.customIconUrl} alt={item.title} className="h-7 w-7 object-contain" />
                                    ) : (
                                        React.createElement(iconMap[item.icon] || CurrencyDollarIcon, { className: "h-7 w-7 text-indigo-600 dark:text-slate-300" })
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
                                <p className="mt-2 text-slate-600 dark:text-slate-400">{item.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
             <SectionCurve flip />
        </section>
    );
};

const WhyUsSection: React.FC<{ data: any; }> = ({ data }) => {
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    return (
        <section id="why-us" className="py-24 transition-colors duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] dark:opacity-[0.1]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[150px]"></div>
            <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: data.title }} />
                    <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">{data.description}</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {data.items.map((item: WhyUsItem) => (
                        <div key={item.id} className="p-8 bg-white dark:bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:shadow-indigo-500/30 hover:border-indigo-500">
                            <div className="inline-block p-3 bg-indigo-50 dark:bg-slate-700/50 rounded-full mb-4">
                                {item.customIconUrl ? (
                                    <img src={item.customIconUrl} alt={item.title} className="h-7 w-7 object-contain" />
                                ) : (
                                    React.createElement(iconMap[item.icon] || CpuChipIcon, { className: "h-7 w-7 text-indigo-600 dark:text-slate-300" })
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const LeaderboardSection: React.FC<{ data: any; }> = ({ data }) => {
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    const { leaders, metric } = data;
    if (!leaders || leaders.length < 3) return null;

    const formatScore = (score: number, metricToUse: LeaderboardMetric) => {
        const formattedScore = (score || 0).toLocaleString('vi-VN');
        switch (metricToUse) {
            case LeaderboardMetric.F1Count: return `${formattedScore} F1`;
            case LeaderboardMetric.Network_size: return `${formattedScore} TV`;
            case LeaderboardMetric.TotalEarnings: return `${formattedScore}đ`;
            default: return formattedScore;
        }
    };

    return (
        <section id="leaderboard" className="py-24 transition-colors duration-300 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white dark:from-slate-950 to-transparent"></div>
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-[100px]"></div>
            
            <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: data.title }} />
                    <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg leading-relaxed">{data.description}</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-end justify-center gap-6 lg:gap-10 max-w-5xl mx-auto mt-20">
                    {/* Rank 2 - Silver */}
                    <div className="w-full md:w-1/3 order-2 md:order-1">
                        <div className="relative bg-white dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 text-center shadow-xl transform transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full border-4 border-white dark:border-slate-900 shadow-lg">
                                    <Medal className="w-8 h-8 text-slate-400" />
                                </div>
                            </div>
                            <div className="relative inline-block mt-4">
                                <img src={leaders[1].avatar || leaders[1].avatarUrl} alt={leaders[1].name} className="w-24 h-24 rounded-full mx-auto border-4 border-slate-200 dark:border-slate-600 object-cover shadow-inner" />
                                <div className="absolute -bottom-2 -right-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white dark:border-slate-800">2</div>
                            </div>
                            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">{leaders[1].name}</h3>
                            <div className="mt-2 inline-flex items-center px-4 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{formatScore(leaders[1].score || leaders[1].value, metric)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rank 1 - Golden */}
                    <div className="w-full md:w-1/3 order-1 md:order-2 relative group">
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 transition-transform duration-500 group-hover:-translate-y-4">
                            <div className="bg-amber-400 p-4 rounded-full border-4 border-white dark:border-slate-900 shadow-xl animate-bounce">
                                <Crown className="w-10 h-10 text-white" fill="currentColor" />
                            </div>
                        </div>

                        <div className="relative bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900/40 backdrop-blur-xl rounded-2xl p-10 border-2 border-amber-400 dark:border-amber-500/50 text-center shadow-2xl transform transition-all duration-500 group-hover:-translate-y-4 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -skew-x-20 translate-x-[-200%] animate-shine pointer-events-none"></div>
                            
                            <div className="relative inline-block mt-4">
                                <img src={leaders[0].avatar || leaders[0].avatarUrl} alt={leaders[0].name} className="w-32 h-32 rounded-full mx-auto border-4 border-amber-400 dark:border-amber-500 object-cover shadow-2xl" />
                                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white dark:border-slate-800 shadow-lg">1</div>
                            </div>
                            
                            <h3 className="mt-6 text-2xl font-black text-slate-900 dark:text-white tracking-tight">{leaders[0].name}</h3>
                            <div className="mt-3 inline-flex items-center px-6 py-2 bg-amber-100 dark:bg-amber-500/20 rounded-full border border-amber-200 dark:border-amber-500/30">
                                <Trophy className="w-4 h-4 text-amber-500 mr-2" />
                                <span className="text-amber-600 dark:text-amber-400 font-extrabold text-xl leading-none">
                                    {formatScore(leaders[0].score || leaders[0].value, metric)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Rank 3 - Bronze */}
                    <div className="w-full md:w-1/3 order-3">
                        <div className="relative bg-white dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 text-center shadow-xl transform transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                <div className="bg-orange-100 dark:bg-orange-950/40 p-3 rounded-full border-4 border-white dark:border-slate-900 shadow-lg">
                                    <Medal className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                            <div className="relative inline-block mt-4">
                                <img src={leaders[2].avatar || leaders[2].avatarUrl} alt={leaders[2].name} className="w-24 h-24 rounded-full mx-auto border-4 border-orange-200 dark:border-orange-900/30 object-cover shadow-inner" />
                                <div className="absolute -bottom-2 -right-2 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white dark:border-slate-800">3</div>
                            </div>
                            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">{leaders[2].name}</h3>
                            <div className="mt-2 inline-flex items-center px-4 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{formatScore(leaders[2].score || leaders[2].value, metric)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};



const PricingSection: React.FC<{ data: any; setLoginModalOpen: (open: boolean) => void }> = ({ data, setLoginModalOpen }) => {
    const { settingsState: { systemSettings } } = useSettings();
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    const formatPriceText = (price: number) => price >= 1000000 ? `${price / 1000000} Triệu` : `${price / 1000}k`;
    const formatMaintenanceFee = (price: number) => price >= 1000000 ? `${price / 1000000}M/tháng` : `${price / 1000}k/tháng`;

    const tiersOrder = [MembershipTier.Starter, MembershipTier.Pro, MembershipTier.Master];

    return (
        <section id="pricing" className="py-20 relative bg-white dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-dot-pattern opacity-[0.3] dark:opacity-[0.1]"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-400/5 dark:bg-green-500/5 rounded-full blur-[120px]"></div>
            <SectionCurve />
            <div ref={addToRefs} className="container mx-auto px-6 animate-on-scroll relative z-10">
                <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: data.title }} /></div>
                <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {tiersOrder.map((tier) => {
                        const tierConfig = systemSettings.tierSettings[tier];
                        if (!tierConfig || !tierConfig.visible) return null;

                        const price = tier === MembershipTier.Starter ? systemSettings.participationFee :
                                     tier === MembershipTier.Pro ? systemSettings.proParticipationFee :
                                     systemSettings.masterParticipationFee;
                        
                        const maintFee = tier === MembershipTier.Starter ? systemSettings.maintenanceFee :
                                        tier === MembershipTier.Pro ? systemSettings.proMaintenanceFee :
                                        systemSettings.masterMaintenanceFee;

                        const isPopular = tier === MembershipTier.Pro;

                        return (
                            <div key={tier} className={`bg-white dark:bg-slate-800/30 backdrop-blur-lg rounded-2xl p-8 flex flex-col border transition-all duration-300 shadow-md ${isPopular ? 'border-blue-500 pulse-glow' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/50'}`}>
                                {isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-sm font-semibold text-white bg-blue-500 rounded-full">Phổ biến</span>}
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tierConfig.name}</h3>
                                <p className="mt-2 text-4xl font-extrabold flex items-baseline gap-1">
                                    <span className="bg-gradient-to-br from-blue-600 to-green-500 dark:from-blue-400 dark:to-green-300 bg-clip-text text-transparent">
                                        {formatPriceText(price)}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-500 leading-none"> / trọn đời</span>
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Phí thuê bao: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMaintenanceFee(maintFee)}</span></p>
                                <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-400 flex-grow">
                                    <li className="flex items-center gap-2">
                                        <CheckCircleFillIcon className="h-5 w-5 text-indigo-500 flex-shrink-0"/>
                                        <span>Tặng kèm <strong>{(tierConfig.credits || 0).toLocaleString()} P</strong> lượt dùng AI</span>
                                    </li>
                                    {(tierConfig.benefits || []).map((benefit, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircleFillIcon className="h-5 w-5 text-green-500 flex-shrink-0"/>
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => setLoginModalOpen(true)} className={`mt-8 w-full py-3 font-semibold rounded-lg transition-all duration-300 ${isPopular ? 'text-white bg-gradient-to-r from-blue-500 to-green-500 hover:scale-105 transform' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700'}`}>Chọn gói này</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

const FAQItem: React.FC<{ item: FaqItem }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 dark:border-slate-700/50 py-5">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left group">
                <span className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.question}</span>
                <ChevronDownIcon className={`h-5 w-5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isOpen ? 'transform rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
            </button>
            <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease-in-out' }}>
                <div className="overflow-hidden">
                     <p className="pt-3 text-slate-600 dark:text-slate-400">{item.answer}</p>
                </div>
            </div>
        </div>
    );
};

const FaqSection: React.FC<{ data: any; }> = ({ data }) => {
    const addToRefs = useIntersectionObserver({ threshold: 0.1 });
    return (
        <section id="faq" ref={addToRefs} className="py-20 animate-on-scroll transition-colors duration-300 relative bg-slate-50 dark:bg-slate-900/30">
            <div className="container mx-auto px-6 lg:max-w-3xl relative z-10">
                <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white text-center" dangerouslySetInnerHTML={{ __html: data.title }} />
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-2xl px-6 shadow-sm">
                    {data.items.map((item: FaqItem) => <FAQItem key={item.id} item={item} />)}
                </div>
            </div>
        </section>
    );
};



// --- Main Component ---

const LandingPage: React.FC = () => {
  const { handleLogin, handleFinalize2faLogin, handleGoogleLogin } = useAuth();
  const { handleRegister, handleForgotPassword } = useActions();
  const { userState: { allUsers } } = useUser();
  const { state: { content, layout } } = useLandingPageContent();
  const { settingsState: { systemSettings } } = useSettings();
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref');
    if (refId) {
      setReferrerId(refId);
      setLoginModalOpen(true);
    }
    const handleScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (referrerId && allUsers.length > 0) {
        const findReferrer = (users: typeof allUsers): typeof allUsers[0] | undefined => {
            for (const user of users) {
                if (user.id === referrerId) return user;
                if (user.children) {
                    const found = findReferrer(user.children);
                    if (found) return found;
                }
            }
            return undefined;
        };
        const referrer = findReferrer(allUsers);
        if (referrer) setReferrerName(referrer.name);
    }
  }, [referrerId, allUsers]);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetId = event.currentTarget.getAttribute('href');
    if (!targetId) return;

    const targetElement = document.querySelector(targetId);
    const headerElement = document.getElementById('landing-header');
    
    if (targetElement && headerElement) {
        const headerHeight = headerElement.offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
  };

  const sectionComponents: Record<SectionId, React.FC<any>> = {
      hero: HeroSection,
      features: FeaturesSection,
      whyUs: WhyUsSection,
      leaderboard: LeaderboardSection,
      pricing: PricingSection,
      faq: FaqSection,
  };
  
  const navLinks = [
      { id: 'features', label: 'Tính năng' },
      { id: 'why-us', label: 'Tại sao' },
      { id: 'leaderboard', label: 'Xếp hạng' },
      { id: 'pricing', label: 'Gói thành viên' },
      { id: 'faq', label: 'FAQ' },
  ];

  const logoProps = {
    logoUrl: content.hero.logoUrl,
    logoText: content.hero.logoText,
    useWideLogo: content.hero.useWideLogo,
    logoObjectPosition: content.hero.logoObjectPosition,
  };

  const isEffectivelyInMaintenance = systemSettings.isMaintenanceMode && 
    (!systemSettings.maintenanceEndTime || new Date(systemSettings.maintenanceEndTime) > new Date());

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-300 overflow-x-hidden relative transition-colors duration-300 min-h-screen">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/5 dark:bg-green-600/10 rounded-full blur-[120px]"></div>
      </div>
      <header id="landing-header" className={`fixed top-0 left-0 w-full z-30 transition-all duration-300 ${headerScrolled ? 'py-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg border-b border-slate-200/50 dark:border-slate-800/50' : 'py-4 bg-transparent'}`}>
        <nav className="container mx-auto px-6 flex justify-between items-center">
            <a href="#" className="flex items-center gap-2">
                <LogoDisplay {...logoProps} />
            </a>
          <div className="hidden md:flex items-center space-x-8">
             {navLinks.map(link => (
                layout.includes(link.id as SectionId) &&
                <a key={link.id} href={`#${link.id}`} onClick={handleNavClick} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-medium">{link.label}</a>
             ))}
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button onClick={() => setLoginModalOpen(true)} className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">Đăng nhập</button>
            <button onClick={() => setLoginModalOpen(true)} className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-green-500 rounded-lg hover:scale-105 transform transition-transform shadow-lg shadow-blue-500/50">Đăng ký</button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {layout.map(sectionId => {
            const Component = sectionComponents[sectionId];
            if (!Component) return null;
            // @ts-ignore
            const sectionData = content[sectionId];
            return <Component key={sectionId} data={sectionData} setLoginModalOpen={setLoginModalOpen} handleNavClick={handleNavClick} />;
        })}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="col-span-1">
                     <a href="#" className="flex items-center gap-2">
                        <LogoDisplay {...logoProps} />
                    </a>
                    {content.footer.tagline && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 break-words max-w-xs">{content.footer.tagline}</p>}
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {content.footer.columns.map(col => (
                        <div key={col.id}>
                            <h4 className="font-semibold mb-4 text-slate-900 dark:text-white">{col.title}</h4>
                            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                                {col.links.map(link => (
                                    <li key={link.id}>
                                        <a 
                                            href={link.url} 
                                            onClick={(e) => {
                                                const legalUrls = ['#tos', '#privacy', '#system-policy'];
                                                const legalTexts = ['Điều khoản Dịch vụ', 'Chính sách Bảo mật', 'Chính sách Hệ thống'];
                                                
                                                if (link.url === '#login') {
                                                    e.preventDefault();
                                                    setLoginModalOpen(true);
                                                } else if (legalUrls.includes(link.url) || legalTexts.includes(link.text)) {
                                                    e.preventDefault();
                                                    const targetModal = link.url !== '#' ? link.url : 
                                                        link.text === 'Điều khoản Dịch vụ' ? '#tos' :
                                                        link.text === 'Chính sách Bảo mật' ? '#privacy' : '#system-policy';
                                                    setActiveLegalModal(targetModal);
                                                } else if (link.url.startsWith('#') && link.url !== '#') {
                                                    handleNavClick(e);
                                                } else if (link.url === '#') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            target={link.url.startsWith('#') ? '_self' : '_blank'}
                                            rel="noopener noreferrer"
                                            className="hover:text-indigo-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                                        >
                                            {link.text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500"><p>{content.footer.copyright}</p></div>
        </div>
      </footer>
      
      <Modal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} title="" hideFooter>
        <LoginScreen 
            onLogin={async (email, password) => handleLogin(email, password)}
            onGoogleLogin={handleGoogleLogin}
            onFinalize2faLogin={async (userId, code) => handleFinalize2faLogin(userId, code)}
            onRegister={async (name, email, password, parentId, phone) => handleRegister(name, email, password, parentId, phone)} 
            onForgotPassword={async (email) => handleForgotPassword(email)} 
            referrerId={referrerId} 
            referrerName={referrerName} 
            isMaintenanceMode={isEffectivelyInMaintenance}
            maintenanceEndTime={systemSettings.maintenanceEndTime}
            onShowLegal={(type) => setActiveLegalModal(`#${type}`)}
        />
      </Modal>

      <Modal 
        isOpen={activeLegalModal !== null} 
        onClose={() => setActiveLegalModal(null)} 
        title={
            activeLegalModal === '#tos' ? 'Điều khoản Dịch vụ' :
            activeLegalModal === '#privacy' ? 'Chính sách Bảo mật' :
            activeLegalModal === '#system-policy' ? 'Chính sách Hệ thống' : ''
        }
        hideFooter
      >
        <div className="max-h-[70vh] overflow-y-auto pr-2 text-slate-700 dark:text-slate-300">
            <div className={`prose prose-slate dark:prose-invert max-w-none leading-relaxed ${activeLegalModal !== '#system-policy' ? 'whitespace-pre-line' : ''}`} 
                 dangerouslySetInnerHTML={{ 
                    __html: (activeLegalModal === '#tos' ? systemSettings.legalContent?.tos :
                             activeLegalModal === '#privacy' ? systemSettings.legalContent?.privacy :
                             activeLegalModal === '#system-policy' ? systemSettings.legalContent?.systemPolicy : '') || ''
                 }} 
            />
            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveLegalModal(null)}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
      </Modal>

      {content.socialProof?.enabled && <SocialProofToasts />}
    </div>
  );
};

export default LandingPage;
