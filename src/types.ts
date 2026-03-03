export type Cycle = {
  id: string;
  start_date: string;
  end_date: string | null;
};

export type SymptomLog = {
  id: string;
  date: string;
  symptoms: string[];
  mood: string | null;
  notes: string | null;
  bbt?: number; // Basal Body Temperature
  opk?: 'negative' | 'high' | 'peak'; // Ovulation Predictor Kit
  sleep?: number; // Sleep duration in hours
  energy?: string; // Energy level
};

export type Prediction = {
  date: string;
  type: 'period' | 'ovulation' | 'fertile_window';
};

export type UserProfile = {
  id: string;
  name: string;
  is_premium: boolean;
  pregnancy_mode: boolean;
  anonymous_mode: boolean;
  biometric_lock: boolean;
  partner_sharing: boolean;
  linked_partner_id: string | null;
  has_seen_tutorial?: boolean;
  push_notifications?: boolean;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type MedicationLog = {
  id: string;
  date: string;
  name: string;
  taken: boolean;
};

export type MedicationReminder = {
  id: string;
  name: string;
  time: string;
};
