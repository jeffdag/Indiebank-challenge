// User profile stored in Supabase
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_type: string | null;
  country: string | null;
  dakota_customer_id: string | null;
  kyb_status: "pending" | "under_review" | "active" | "rejected" | null;
  onboarding_url: string | null;
  created_at: string;
  updated_at: string;
}

// On-ramp account (receive payments)
export interface OnRampAccount {
  id: string;
  user_id: string;
  dakota_account_id: string;
  dakota_recipient_id: string;
  dakota_destination_id: string;
  network: string;
  bank_name: string | null;
  routing_number: string | null;
  account_number: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
}

// Off-ramp account (withdraw to bank)
export interface OffRampAccount {
  id: string;
  user_id: string;
  dakota_account_id: string;
  dakota_recipient_id: string;
  dakota_destination_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number_last4: string;
  status: "pending" | "active" | "suspended";
  created_at: string;
}

// Transaction record
export interface Transaction {
  id: string;
  user_id: string;
  dakota_transaction_id: string;
  type: "onramp" | "offramp" | "transfer";
  amount: string;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
