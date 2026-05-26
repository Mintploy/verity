export type ScoreState = 'green' | 'yellow' | 'red';

export interface SearchRequest {
  phone: string;
  name?: string;
  userId?: string;
}

export interface PhoneIntelligence {
  carrier: string;
  lineType: 'mobile' | 'voip' | 'landline';
  voipFlag?: string;
  numberAge: string;
  origin: string;
  active: boolean;
}

export interface IdentityData {
  fullName: string;
  age: number;
  dob: string;
  verifiedBy: number;
  aliases?: string[];
}

export interface Address {
  addr: string;
  years: string;
  current: boolean;
  detail: string;
  flag?: boolean;
  owned?: boolean;
}

export interface Relationships {
  status: string;
  spouse?: string;
  priors: string;
  relatives: string[];
  associates: string[];
}

export interface Professional {
  title: string;
  company: string;
  tenure: string;
  income: string;
  networth: string;
  llcs: string;
}

export interface PublicRecord {
  label: string;
  value: string;
  good?: boolean;
  flag?: boolean;
  neutral?: boolean;
}

export interface SocialFootprint {
  handles: string[];
  presence: string;
  inconsistency: string;
}

export interface Report {
  id: string;
  searchId: string;
  score: ScoreState;
  headline: string;
  summary: string;
  confidence: number;
  sources: number;
  generatedAt: string;
  subject: {
    name: string;
    age: number;
    phone: string;
    dob: string;
  };
  phone: PhoneIntelligence;
  identity: IdentityData;
  addresses: Address[];
  relationships: Relationships;
  professional: Professional;
  publicRecords: PublicRecord[];
  social: SocialFootprint;
  nextSteps: string[];
}

export interface VerificationStatus {
  verified: boolean;
  gender?: string;
  status: 'pending' | 'processing' | 'verified' | 'requires_input' | 'canceled';
}

export interface MembershipStatus {
  active: boolean;
  expiresAt?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}
