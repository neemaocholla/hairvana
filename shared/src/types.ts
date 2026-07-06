/**
 * HAIRVANA — Shared TypeScript types for all domain entities and API response shapes.
 * Used by both the server and client packages.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'stylist' | 'vendor' | 'admin';

export type ProfileStatus = 'pending' | 'approved' | 'suspended';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Completed' | 'Cancelled';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed';

// ─── Domain entities ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone_number: string;
  /** Never returned to clients — server-side only */
  password_hash?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO 8601
}

export interface StylistProfile {
  id: string;
  user_id: string;
  full_name: string;
  bio: string;
  location: string;
  house_call_offered: boolean;
  status: ProfileStatus;
  base_price: number;
  average_rating: number;
  review_count: number;
  updated_at: string;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string;
  location: string;
  mpesa_paybill: string;
  status: ProfileStatus;
  average_rating: number;
  updated_at: string;
}

export interface Hairstyle {
  id: string;
  name: string;
  description: string;
  category: string;
  estimated_duration_mins: number;
  platform_fee: number;
  created_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  is_out_of_stock: boolean;
  updated_at: string;
}

export interface HairstyleProduct {
  hairstyle_id: string;
  product_id: string;
  quantity_required: number;
}

export interface Booking {
  id: string;
  client_id: string;
  stylist_id: string;
  hairstyle_id: string;
  status: BookingStatus;
  is_house_call: boolean;
  delivery_address: string | null;
  total_cost: number;
  deposit_amount: number;
  appointment_at: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  mpesa_reference: string | null;
  phone_number: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  stylist_id: string;
  star_rating: number; // 1–5
  comment: string | null;
  is_flagged: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface PortfolioPhoto {
  id: string;
  stylist_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  event_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Bundle cost ──────────────────────────────────────────────────────────────

export interface BundleCostLineItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity_required: number;
  subtotal: number;
}

export interface BundleCost {
  hairstyle_id: string;
  stylist_id: string | null;
  line_items: BundleCostLineItem[];
  products_subtotal: number;
  service_fee: number;
  platform_fee: number;
  total: number;
}

// ─── API request / response shapes ────────────────────────────────────────────

/** Generic paginated list wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Generic API error shape */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Hairstyle API responses ──────────────────────────────────────────────────

export interface HairstyleListItem {
  id: string;
  name: string;
  category: string;
  photo_urls: string[];
  bundle_price_from: number; // lowest possible bundle cost
}

export interface HairstyleDetail extends Hairstyle {
  photo_urls: string[];
  bundle_cost: BundleCost;
  recommended_products: RecommendedProduct[];
}

export interface RecommendedProduct {
  product: Product;
  vendor: VendorSummary;
  quantity_required: number;
}

// ─── Stylist API responses ────────────────────────────────────────────────────

export interface StylistListItem {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string;
  service_types: string[];
  base_price: number;
  average_rating: number;
  review_count: number;
  house_call_offered: boolean;
  location: string;
}

export interface StylistDetail extends StylistProfile {
  photo_url: string;
  service_types: string[];
  portfolio_photos: PortfolioPhoto[];
  reviews: ReviewSummary[];
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  slots: string[]; // HH:MM time strings
}

// ─── Vendor API responses ─────────────────────────────────────────────────────

export interface VendorSummary {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
  is_verified: boolean;
  average_rating: number;
}

export interface VendorListItem extends VendorSummary {
  product_categories: string[];
}

export interface VendorDetail extends VendorProfile {
  logo_url: string | null;
  is_verified: boolean;
  products: Product[];
  product_categories: string[];
}

// ─── Review summaries ─────────────────────────────────────────────────────────

export interface ReviewSummary {
  id: string;
  client_name: string;
  star_rating: number;
  comment: string | null;
  created_at: string;
}

// ─── Booking API responses ────────────────────────────────────────────────────

export interface BookingDetail extends Booking {
  stylist: StylistListItem;
  hairstyle: HairstyleListItem;
  payment: Payment | null;
}

// ─── Payment API responses ────────────────────────────────────────────────────

export interface STKPushResponse {
  checkout_request_id: string;
  merchant_request_id: string;
  response_code: string;
  response_description: string;
}

export interface PaymentReceipt {
  booking_id: string;
  amount_paid: number;
  mpesa_reference: string;
  phone_number: string;
  paid_at: string;
  booking_details: BookingDetail;
  remaining_balance: number; // 0 if fully paid
}

// ─── Auth API shapes ──────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  phone_number: string;
  password: string;
  role: 'client' | 'stylist' | 'vendor';
  // Stylist-specific
  full_name?: string;
  bio?: string;
  location?: string;
  house_call_offered?: boolean;
  base_price?: number;
  service_types?: string[];
  // Vendor-specific
  business_name?: string;
  owner_name?: string;
  mpesa_paybill?: string;
  product_categories?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface AuthResponse extends AuthTokens {
  user: Omit<User, 'password_hash'>;
}

// ─── Notification event types ─────────────────────────────────────────────────

export type NotificationEventType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_AUTO_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REVIEW_FLAGGED'
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REINSTATED';

export interface NotificationEvent {
  type: NotificationEventType;
  payload: Record<string, unknown>;
}

// ─── Filter / query params ────────────────────────────────────────────────────

export interface HairstyleFilterParams {
  keyword?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  hair_length?: string;
  page?: number;
  page_size?: number;
}

export interface StylistFilterParams {
  keyword?: string;
  location?: string;
  service_type?: string;
  min_price?: number;
  max_price?: number;
  house_call_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface VendorFilterParams {
  keyword?: string;
  location?: string;
  product_category?: string;
  page?: number;
  page_size?: number;
}

// ─── M-Pesa callback payload ──────────────────────────────────────────────────

export interface MpesaCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}
