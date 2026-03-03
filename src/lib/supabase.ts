import { Cycle, SymptomLog, UserProfile, Prediction, ChatMessage, MedicationLog, MedicationReminder } from '../types';
import { addDays, differenceInDays, differenceInCalendarDays, parseISO, format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://eenwwvjpjculjnqugcyp.supabase.co';
}
if (!supabaseAnonKey) {
  supabaseAnonKey = 'placeholder';
}

export const authClient = createClient(supabaseUrl, supabaseAnonKey);

// Mock Supabase Client using LocalStorage for Offline-First capability
class MockSupabase {
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(`cycleguard_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private set(key: string, data: any) {
    localStorage.setItem(`cycleguard_${key}`, JSON.stringify(data));
  }

  async clearAllData(): Promise<void> {
    const keys = [
      'users', 'cycles', 'symptoms', 'predictions', 
      'chat', 'medications', 'medication_reminders', 'last_tip_date'
    ];
    keys.forEach(key => localStorage.removeItem(`cycleguard_${key}`));
  }

  // --- Auth ---
  async getUser(): Promise<UserProfile> {
    const users = this.get<UserProfile>('users');
    if (users.length > 0) return users[0];
    
    const defaultUser: UserProfile = {
      id: 'user-1',
      name: 'Anonymous User',
      is_premium: false,
      pregnancy_mode: false,
      anonymous_mode: true,
      biometric_lock: false,
      partner_sharing: false,
      linked_partner_id: null,
      has_seen_tutorial: false,
    };
    this.set('users', [defaultUser]);
    return defaultUser;
  }

  async updateUser(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = await this.getUser();
    const updated = { ...user, ...updates };
    this.set('users', [updated]);
    return updated;
  }

  // --- Cycles ---
  async getCycles(): Promise<Cycle[]> {
    return this.get<Cycle>('cycles');
  }

  async addCycle(start_date: string): Promise<Cycle> {
    const cycles = await this.getCycles();
    const newCycle: Cycle = {
      id: Math.random().toString(36).substring(7),
      start_date,
      end_date: null,
    };
    
    // Close previous cycle if exists
    if (cycles.length > 0 && !cycles[0].end_date) {
      cycles[0].end_date = format(addDays(parseISO(start_date), -1), 'yyyy-MM-dd');
    }

    const updatedCycles = [newCycle, ...cycles];
    this.set('cycles', updatedCycles);
    await this.generatePredictions();
    return newCycle;
  }

  async endCycle(id: string, end_date: string): Promise<void> {
    const cycles = await this.getCycles();
    const updated = cycles.map(c => c.id === id ? { ...c, end_date } : c);
    this.set('cycles', updated);
    await this.generatePredictions();
  }

  // --- Symptoms ---
  async getSymptoms(): Promise<SymptomLog[]> {
    return this.get<SymptomLog>('symptoms');
  }

  async logSymptom(log: Omit<SymptomLog, 'id'>): Promise<SymptomLog> {
    const symptoms = await this.getSymptoms();
    const existingIndex = symptoms.findIndex(s => s.date === log.date);
    
    const newLog: SymptomLog = {
      ...log,
      id: existingIndex >= 0 ? symptoms[existingIndex].id : Math.random().toString(36).substring(7),
    };

    if (existingIndex >= 0) {
      symptoms[existingIndex] = newLog;
    } else {
      symptoms.push(newLog);
    }

    this.set('symptoms', symptoms);
    return newLog;
  }

  // --- AI Predictions (Mocked Automation) ---
  async getPredictions(): Promise<Prediction[]> {
    return this.get<Prediction>('predictions');
  }

  async generatePredictions(): Promise<void> {
    const cycles = await this.getCycles();
    if (cycles.length === 0) return;

    // Calculate average cycle length based on start dates
    let avgLength = 28;
    if (cycles.length > 1) {
      let totalCycleDays = 0;
      let cycleCount = 0;
      for (let i = 0; i < cycles.length - 1; i++) {
        const currentCycleStart = parseISO(cycles[i].start_date);
        const previousCycleStart = parseISO(cycles[i+1].start_date);
        const days = differenceInCalendarDays(currentCycleStart, previousCycleStart);
        if (days >= 20 && days <= 45) { // Filter out unrealistic cycle lengths
          totalCycleDays += days;
          cycleCount++;
        }
      }
      if (cycleCount > 0) {
        avgLength = Math.round(totalCycleDays / cycleCount);
      }
    }

    const latestCycle = cycles[0];
    const startDate = parseISO(latestCycle.start_date);
    
    const predictions: Prediction[] = [];
    
    // Predict next 3 cycles
    for (let i = 0; i < 3; i++) {
      const nextPeriodStart = addDays(startDate, avgLength * (i + (latestCycle.end_date ? 1 : 1)));
      const ovulationDate = addDays(nextPeriodStart, -14);
      
      predictions.push({ date: format(nextPeriodStart, 'yyyy-MM-dd'), type: 'period' });
      predictions.push({ date: format(ovulationDate, 'yyyy-MM-dd'), type: 'ovulation' });
      
      // Fertile window (5 days before + day of ovulation)
      for (let j = 0; j <= 5; j++) {
        predictions.push({ date: format(addDays(ovulationDate, -j), 'yyyy-MM-dd'), type: 'fertile_window' });
      }
    }

    this.set('predictions', predictions);
  }

  // --- Chat ---
  async getChatHistory(): Promise<ChatMessage[]> {
    return this.get<ChatMessage>('chat');
  }

  async addChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const chat = await this.getChatHistory();
    const newMsg: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };
    this.set('chat', [...chat, newMsg]);
    return newMsg;
  }

  // --- Medications ---
  async getMedicationReminders(): Promise<MedicationReminder[]> {
    const reminders = this.get<MedicationReminder>('medication_reminders');
    if (reminders.length === 0 && !localStorage.getItem('cycleguard_medication_reminders_init')) {
      const defaults: MedicationReminder[] = [
        { id: 'm1', name: 'Prenatal Vitamin', time: '08:00' },
        { id: 'm2', name: 'Iron Supplement', time: '20:00' }
      ];
      this.set('medication_reminders', defaults);
      localStorage.setItem('cycleguard_medication_reminders_init', 'true');
      return defaults;
    }
    return reminders;
  }

  async addMedicationReminder(reminder: Omit<MedicationReminder, 'id'>): Promise<MedicationReminder> {
    const reminders = await this.getMedicationReminders();
    const newReminder: MedicationReminder = {
      ...reminder,
      id: Math.random().toString(36).substring(7),
    };
    this.set('medication_reminders', [...reminders, newReminder]);
    return newReminder;
  }

  async deleteMedicationReminder(id: string): Promise<void> {
    const reminders = await this.getMedicationReminders();
    this.set('medication_reminders', reminders.filter(r => r.id !== id));
  }

  async getMedications(date: string): Promise<MedicationLog[]> {
    const meds = this.get<MedicationLog>('medications');
    return meds.filter(m => m.date === date);
  }

  async logMedication(log: Omit<MedicationLog, 'id'>): Promise<MedicationLog> {
    const meds = this.get<MedicationLog>('medications');
    const newLog: MedicationLog = {
      ...log,
      id: Math.random().toString(36).substring(7),
    };
    this.set('medications', [...meds, newLog]);
    return newLog;
  }

  // --- Export ---
  async exportData(): Promise<string> {
    const data = {
      user: await this.getUser(),
      cycles: await this.getCycles(),
      symptoms: await this.getSymptoms(),
    };
    return JSON.stringify(data, null, 2);
  }
}

export const supabase = new MockSupabase();
