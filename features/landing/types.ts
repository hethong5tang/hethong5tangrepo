import { MembershipTier } from '../users/types';
import { LeaderboardMetric } from '../settings/types';

export type SectionId = 'hero' | 'features' | 'whyUs' | 'leaderboard' | 'pricing' | 'faq';

export interface StatItem {
    id: string;
    label: string;
    value: string;
}

export interface HeroSectionContent {
    title: string;
    subtitle: string;
    ctaText: string;
    logoText?: string;
    logoUrl?: string;
    useWideLogo?: boolean;
    logoObjectPosition?: string;
    stats: StatItem[];
}

export interface FeatureItem {
    id: string;
    icon: string;
    customIconUrl?: string;
    title: string;
    description: string;
}

export interface CoreValueSectionContent {
    title: string;
    description: string;
    items: FeatureItem[];
}

export interface WhyUsItem {
    id: string;
    icon: string;
    customIconUrl?: string;
    title: string;
    description: string;
}

export interface WhyUsSectionContent {
    title: string;
    description: string;
    items: WhyUsItem[];
}

export interface PricingPlan {
    id: string;
    name: string;
    tier: MembershipTier;
    price: number;
    maintenanceFee: number;
    features: string[];
    popular: boolean;
}

export interface PricingSectionContent {
    title: string;
    plans: PricingPlan[];
}

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

export interface FaqSectionContent {
    title: string;
    items: FaqItem[];
}

export interface LeaderboardLeader {
    id: string;
    name: string;
    avatar: string;
    score: number;
}

export interface LeaderboardSectionContent {
    title: string;
    description: string;
    leaders: LeaderboardLeader[];
    metric: LeaderboardMetric;
}

export interface FooterLink {
    id: string;
    text: string;
    url: string;
}

export interface FooterColumn {
    id: string;
    title: string;
    links: FooterLink[];
}

export interface FooterSectionContent {
    columns: FooterColumn[];
    copyright: string;
    tagline?: string;
}

export interface SocialProofItem {
    id: string;
    content: string; // e.g., "{name} vừa tham gia hệ thống."
}

export interface SocialProofSectionContent {
    enabled: boolean;
    items: SocialProofItem[];
}

export interface LandingPageContent {
    hero: HeroSectionContent;
    features: CoreValueSectionContent;
    whyUs: WhyUsSectionContent;
    leaderboard: LeaderboardSectionContent;
    pricing: PricingSectionContent;
    faq: FaqSectionContent;
    footer: FooterSectionContent;
    socialProof: SocialProofSectionContent;
}

export interface LandingPageState {
    content: LandingPageContent;
    layout: SectionId[];
}

export type LandingPageAction =
    | { type: 'SET_LAYOUT'; payload: SectionId[] }
    | { type: 'SET_SECTION_CONTENT'; payload: { sectionId: keyof LandingPageContent, content: any } };