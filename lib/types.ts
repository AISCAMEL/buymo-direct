// Hand-written Supabase types. Regenerate later with:
//   npx supabase gen types typescript --project-id <id> > lib/types.ts

export type ListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'closed';
export type ListingType = 'direct' | 'proxy';
export type BuybackStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
export type EscrowStatus =
  | 'initiated'
  | 'funds_held'
  | 'inspection'
  | 'title_transfer'
  | 'completed'
  | 'cancelled'
  | 'disputed';
export type TitleTransferOption = 'self' | 'standard' | 'remote';
export type PaymentMethod = 'cash' | 'loan' | 'credit';

export type UserRole = 'user' | 'admin';
export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export type DealerStatus = 'pending' | 'approved' | 'suspended';
export type DealerRole = 'owner' | 'manager' | 'staff';

export interface Dealer {
  id: string;
  owner_id: string;
  name: string;
  company_name: string | null;
  prefecture: string | null;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  status: DealerStatus;
  commission_rate: number;
  rejection_note: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerStaff {
  id: string;
  dealer_id: string;
  user_id: string;
  role: DealerRole;
  invited_by: string | null;
  created_at: string;
}

export interface DealerInvitation {
  id: string;
  dealer_id: string;
  email: string;
  role: DealerRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface DealerApiKey {
  id: string;
  dealer_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface DealerWebhook {
  id: string;
  dealer_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface Offer {
  id: string;
  listing_id: string;
  conversation_id: string | null;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  counter_amount: number | null;
  counter_message: string | null;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  params: Record<string, string>;
  last_checked_at: string;
  created_at: string;
}

export type AnnouncementLevel = 'info' | 'warning' | 'important';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  pinned: boolean;
  published: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
}

export type ReportTarget = 'listing' | 'user' | 'review';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  detail: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  prefecture: string | null;
  bio: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  id_front_url: string;
  selfie_url: string | null;
  status: KycStatus;
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  price: number;
  body_type: string | null;
  transmission: string | null;
  fuel: string | null;
  color: string | null;
  prefecture: string;
  repair_history: boolean;
  description: string | null;
  vin: string | null;
  video_url: string | null;
  expires_at: string | null;
  boosted_until: string | null;
  status: ListingStatus;
  listing_type: ListingType;
  fee_rate: number;
  ai_price_min: number | null;
  ai_price_max: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  listing_id: string;
  title: string;
  performed_at: string;
  mileage_km: number | null;
  cost: number | null;
  note: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface BuybackRequest {
  id: string;
  listing_id: string;
  seller_id: string;
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  ai_price_min: number;
  ai_price_max: number;
  buyback_price: number;
  status: BuybackStatus;
  rejection_reason: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type CouponType = 'percent' | 'fixed';
export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  max_uses: number | null;
  used_count: number;
  min_amount: number;
  expires_at: string | null;
  active: boolean;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
  caption?: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_last_read_at: string;
  seller_last_read_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  listing_id: string;
  conversation_id: string | null;
  buyer_id: string;
  seller_id: string;
  amount: number;
  escrow_fee: number;
  title_option: TitleTransferOption;
  title_fee: number;
  payment_method: PaymentMethod | null;
  installment_fee: number;
  square_payment_id: string | null;
  status: EscrowStatus;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface Review {
  id: string;
  escrow_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type ReviewWithReviewer = Review & {
  reviewer?: Pick<Profile, 'id' | 'display_name'> | null;
};

export type LoanAppStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected';

export interface LoanApplication {
  id: string;
  applicant_id: string;
  listing_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  birth_year: number | null;
  annual_income: number | null;
  employment: string | null;
  vehicle_price: number;
  down_payment: number;
  term_months: number;
  est_monthly: number | null;
  note: string | null;
  status: LoanAppStatus;
  created_at: string;
}

// Listing joined with its first image and seller — used by cards/detail.
export type ListingWithImages = Listing & {
  listing_images: ListingImage[];
  profiles?: Pick<Profile, 'id' | 'display_name' | 'prefecture' | 'avatar_url'> | null;
};

// --- Minimal Database generic so the supabase-js client is typed -----------
type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

interface TableShape<T> {
  Row: Row<T>;
  Insert: Insert<T>;
  Update: Update<T>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      listings: TableShape<Listing>;
      listing_images: TableShape<ListingImage>;
      conversations: TableShape<Conversation>;
      messages: TableShape<Message>;
      escrow_transactions: TableShape<EscrowTransaction>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      listing_status: ListingStatus;
      escrow_status: EscrowStatus;
      title_transfer_option: TitleTransferOption;
    };
    CompositeTypes: Record<string, never>;
  };
}
