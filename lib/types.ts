export type ScoreState = 'green' | 'yellow' | 'red';

export type SearchMode = 'phone' | 'name' | 'email' | 'address';

export interface SearchRequest {
  /** Phone remains the primary lookup key; the others are alternates. */
  phone?: string;
  name?: string;
  email?: string;
  address?: string;
  /** City, State or ZIP, narrows a name or address search. */
  location?: string;
  /** A candidate chosen from the picker. Skips automatic match selection. */
  tahoeId?: string;
  userId?: string;
  enrichHistorical?: boolean;
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
  /**
   * Whether this looks like somewhere he lives or somewhere he works.
   * A suite number and a commercial land use say office; an apartment number
   * and a residential class say home. 'unknown' when neither is evident,
   * which is stated rather than guessed.
   */
  kind?: 'home' | 'office' | 'unknown';
  /** Why we called it that, in her words, so the label is never a bare assertion. */
  kindReason?: string;
  sqft?: number;
  yearBuilt?: number;
  county?: string;
}

export interface PropertyIntelligence {
  address: string;
  ownerName?: string;
  ownerType?: string;
  purchasePrice?: string;
  purchaseDate?: string;
  yearsOwned?: string;
  currentValue?: string;
  estimatedRent?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  /** Land area. Deliberately separate from sqft, which is the building. */
  lotSqft?: number;
  totalRooms?: number;
  taxAmount?: string;
  taxYear?: number;
  previousOwnerCount?: number;
  ownerOccupied?: boolean;
  occupancy?: string;
  ownerNames?: string[];
  county?: string;
  /** Is the man she searched actually on this deed? */
  subjectIsOwner?: boolean;
  /** Does this property match the current address in his address history? */
  isCurrentResidence?: boolean;
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
  llcs: string;
  /** Every role the workplace record carries, current first. */
  history?: string[];
  licenses?: string;
  businessEntities?: string;
}

export interface Narrative {
  scoop: string;
  highlights: Array<{ label: string; detail: string }>;
}

export interface PublicRecord {
  label: string;
  value: string;
  good?: boolean;
  flag?: boolean;
  neutral?: boolean;
}

export interface SocialCandidate {
  platform: string;
  handle: string;
  url: string;
  verified: boolean;
}

export interface SocialFootprint {
  /** Actual profiles. An email address is not one of these. */
  handles: string[];
  /** Addresses appearing on the record, stated as that and nothing more. */
  emails?: string[];
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
  propertyIntelligence?: PropertyIntelligence[];
  relationships: Relationships;
  professional: Professional;
  publicRecords: PublicRecord[];
  social: SocialFootprint;
  nextSteps: string[];
  narrative?: Narrative;
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
