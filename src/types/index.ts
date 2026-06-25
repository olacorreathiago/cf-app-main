export type ProfileType = "athlete" | "professional";
export type ApprovalStatus = "approved" | "pending_approval" | "rejected";
export type MembershipRole = "owner" | "partner" | "manager" | "coach" | "athlete";
export type MembershipStatus = "active" | "inactive" | "suspended" | "trial" | "pending";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  language: string;
  profile_type: ProfileType;
  approval_status: ApprovalStatus;
  professional_id: string | null;
  specialty: string | null;
  emergency_contact: string | null;
  terms_accepted_at: string | null;
  created_at: string;
}

export interface Box {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  approval_status: ApprovalStatus;
  payments_enabled: boolean;
  drop_in_enabled: boolean;
  drop_in_price: number | null;
  created_at: string;
}

export type ClassStatus = "draft" | "scheduled" | "cancelled";

export interface BoxSettings {
  cancellation_window_hours?: number;
  booking_advance_days?: number;
  default_capacity?: number;
  modalities?: string[];
}

export interface BoxFull extends Box {
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  settings: BoxSettings;
}

export interface ClassTemplate {
  id: string;
  box_id: string;
  name: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  active: boolean;
  created_at: string;
}

export interface ClassInstance {
  id: string;
  box_id: string;
  template_id: string | null;
  coach_id: string | null;
  name: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  location: string | null;
  notes: string | null;
  wod_ids: string[];
  status: ClassStatus;
  cancellation_reason: string | null;
  is_special: boolean;
  created_at: string;
}

export type { WodType, WodCategory, ScoreType, Movement } from "@/schemas/wod";

export interface BenchmarkWod {
  slug: string;
  name: string;
  category: import("@/schemas/wod").WodCategory;
  type: import("@/schemas/wod").WodType;
  description: string | null;
  movements: import("@/schemas/wod").Movement[];
  time_cap_minutes: number | null;
}

export interface Wod {
  id: string;
  box_id: string;
  created_by: string;
  title: string;
  type: import("@/schemas/wod").WodType;
  category: import("@/schemas/wod").WodCategory;
  score_type: import("@/schemas/wod").ScoreType;
  benchmark_slug: string | null;
  is_benchmark: boolean;
  description: string | null;
  time_cap_minutes: number | null;
  movements: import("@/schemas/wod").Movement[];
  scaling_notes: string | null;
  result_sets: number | null;
  result_reps_per_set: number | null;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  creator_name?: string | null;
}

export interface WodResult {
  id: string;
  wod_id: string;
  user_id: string;
  box_id: string;
  score_type: import("@/schemas/wod").ScoreType;
  score_value: number | null;
  score_display: string | null;
  rx: boolean;
  notes: string | null;
  recorded_at: string;
}

export interface Pr {
  id: string;
  user_id: string;
  box_id: string;
  movement: string;
  value: number;
  unit: string;
  achieved_at: string;
  wod_result_id: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  box_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  plan_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}
