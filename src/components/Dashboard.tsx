import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getDailyInsight } from '../lib/ai';
import { Cycle, Prediction, MedicationLog, UserProfile, MedicationReminder, SymptomLog } from '../types';
import { differenceInDays, differenceInCalendarDays, parseISO, format, isToday, isFuture } from 'date-fns';
import { Activity, Droplet, Heart, Moon, PlusCircle, Sparkles, Pill, Users, X, Clock, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tooltip } from './Tooltip';
import { RichText } from './RichText';
import { SymptomsModal } from './SymptomsModal';

export function Dashboard({ user }: { user: UserProfile }) {
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [meds, setMeds] = useState<MedicationLog[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [todaySymptoms, setTodaySymptoms] = useState<SymptomLog | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isLoggingPeriod, setIsLoggingPeriod] = useState(false);
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);
  const [showAddMedModal, setShowAddMedModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const cycles = await supabase.getCycles();
    if (cycles.length > 0) {
      setCurrentCycle(cycles[0]);
    }
    const preds = await supabase.getPredictions();
    setPredictions(preds);
    const m = await supabase.getMedications(format(new Date(), 'yyyy-MM-dd'));
    setMeds(m);
    const r = await supabase.getMedicationReminders();
    setReminders(r);
    
    const allSymptoms = await supabase.getSymptoms();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayLog = allSymptoms.find(s => s.date === todayStr);
    setTodaySymptoms(todayLog || null);
    
    // Fetch AI Insight asynchronously so it doesn't block the UI
    getDailyInsight().then(setInsight);
    
    setLoading(false);
  };

  const handleStartCycle = async () => {
    setIsLoggingPeriod(true);
    await supabase.addCycle(format(new Date(), 'yyyy-MM-dd'));
    await loadData();
    setIsLoggingPeriod(false);
  };

  const handleEndCycle = async () => {
    if (currentCycle) {
      setIsLoggingPeriod(true);
      await supabase.endCycle(currentCycle.id, format(new Date(), 'yyyy-MM-dd'));
      await loadData();
      setIsLoggingPeriod(false);
    }
  };

  const handleToggleMed = async (name: string) => {
    await supabase.logMedication({ date: format(new Date(), 'yyyy-MM-dd'), name, taken: true });
    loadData();
  };

  const handleDeleteMed = async (id: string) => {
    await supabase.deleteMedicationReminder(id);
    loadData();
  };

  if (loading) return <div className="p-6 flex justify-center items-center h-full"><div className="animate-pulse w-8 h-8 rounded-full bg-rose-200"></div></div>;

  const cycleDay = currentCycle && !currentCycle.end_date 
    ? differenceInCalendarDays(new Date(), parseISO(currentCycle.start_date)) + 1 
    : 0;

  const nextPeriod = predictions.find(p => p.type === 'period' && differenceInCalendarDays(parseISO(p.date), new Date()) >= 0);
  const daysUntilNextPeriod = nextPeriod ? differenceInCalendarDays(parseISO(nextPeriod.date), new Date()) : null;

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {user.linked_partner_id && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-2xl p-4 flex items-center space-x-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-full text-teal-600 dark:text-teal-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-teal-900 dark:text-teal-100">Partner Mode Active</h3>
            <p className="text-xs text-teal-700 dark:text-teal-300">You are viewing your partner's cycle insights.</p>
          </div>
        </div>
      )}

      {/* Hero Section - Cycle Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 to-pink-50 dark:from-rose-900/40 dark:to-pink-900/10 p-8 text-center shadow-sm border border-rose-100/50 dark:border-rose-800/30">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Droplet className="w-32 h-32 text-rose-500" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 uppercase tracking-widest">
            {currentCycle && !currentCycle.end_date ? 'Current Cycle' : 'Ready to Start'}
          </p>
          
          <div className="flex items-baseline justify-center space-x-2">
            <span className="text-6xl font-light tracking-tighter text-slate-900 dark:text-white">
              {cycleDay > 0 ? cycleDay : '--'}
            </span>
            <span className="text-xl font-medium text-slate-500 dark:text-slate-400">Day</span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">
            {daysUntilNextPeriod !== null 
              ? `Period expected in ${daysUntilNextPeriod} days` 
              : 'Log your period to get predictions'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={currentCycle && !currentCycle.end_date ? handleEndCycle : handleStartCycle}
          disabled={isLoggingPeriod}
          className={cn(
            "tour-log-period flex flex-col items-center justify-center p-4 rounded-2xl transition-all active:scale-95 border-2",
            currentCycle && !currentCycle.end_date 
              ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300"
              : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 hover:border-rose-600",
            isLoggingPeriod && "opacity-70 cursor-wait"
          )}
        >
          {isLoggingPeriod ? (
            <div className="w-6 h-6 mb-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Droplet className={cn("w-6 h-6 mb-2", currentCycle && !currentCycle.end_date ? "fill-current" : "")} />
          )}
          <span className="text-sm font-medium">
            {currentCycle && !currentCycle.end_date ? 'End Period' : 'Log Period'}
          </span>
        </button>

        <button 
          onClick={() => setShowSymptomsModal(true)}
          className="tour-log-symptoms flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all hover:border-teal-200 dark:hover:border-teal-800 active:scale-95"
        >
          <PlusCircle className="w-6 h-6 mb-2 text-teal-500" />
          <span className="text-sm font-medium">Log Symptoms</span>
        </button>
      </div>

      {/* AI Insights Card */}
      <div className="tour-ai-insights rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">AI Insights</h3>
        </div>
        {insight ? (
          <RichText content={insight} className="text-slate-600 dark:text-slate-400" />
        ) : (
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating personalized insight...</span>
          </div>
        )}
      </div>

      {/* Medication Tracker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Medications & Supplements</h3>
          <button 
            onClick={() => setShowAddMedModal(true)}
            className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            Add
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No medications added yet.</p>
          ) : (
            reminders.map(r => (
              <MedicationRow 
                key={r.id} 
                name={r.name} 
                time={r.time}
                taken={meds.some(m => m.name === r.name)} 
                onToggle={() => handleToggleMed(r.name)} 
                onDelete={() => handleDeleteMed(r.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Today's Overview */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 px-1">Today's Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <OverviewCard 
            icon={Heart} 
            label="Mood" 
            value={todaySymptoms?.mood || "Not logged"} 
            color="text-pink-500" 
            bg="bg-pink-50 dark:bg-pink-500/10" 
          />
          <OverviewCard 
            icon={Activity} 
            label="Energy" 
            value={todaySymptoms?.energy || (todaySymptoms?.symptoms?.includes('Fatigue') ? 'Low' : 'Not logged')} 
            color="text-amber-500" 
            bg="bg-amber-50 dark:bg-amber-500/10" 
          />
          <OverviewCard 
            icon={Moon} 
            label="Sleep" 
            value={todaySymptoms?.sleep ? `${todaySymptoms.sleep}h` : "Not logged"} 
            color="text-indigo-500" 
            bg="bg-indigo-50 dark:bg-indigo-500/10" 
          />
        </div>
      </div>

      {showSymptomsModal && (
        <SymptomsModal onClose={() => setShowSymptomsModal(false)} onSave={loadData} />
      )}

      {showAddMedModal && (
        <AddMedicationModal onClose={() => setShowAddMedModal(false)} onSave={loadData} />
      )}
    </div>
  );
}

function AddMedicationModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.addMedicationReminder({ name: name.trim(), time });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Add Medication</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Prenatal Vitamin"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reminder Time</label>
            <input 
              type="time" 
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-3 rounded-2xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Medication'}
        </button>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: string, color: string, bg: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-2xl", bg)}>
      <Icon className={cn("w-5 h-5 mb-1", color)} />
      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value}</span>
    </div>
  );
}

function MedicationRow({ name, time, taken, onToggle, onDelete }: { name: string, time: string, taken: boolean, onToggle: () => void, onDelete: () => void, key?: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center space-x-3">
        <div className={cn("p-2 rounded-lg", taken ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500")}>
          <Pill className="w-4 h-4" />
        </div>
        <div>
          <span className={cn("block text-sm font-medium", taken ? "text-slate-800 dark:text-slate-200 line-through opacity-50" : "text-slate-700 dark:text-slate-300")}>{name}</span>
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <Clock className="w-3 h-3 mr-1" />
            {time}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Delete reminder"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button 
          onClick={onToggle}
          disabled={taken}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            taken ? "bg-teal-500 border-teal-500 text-white" : "border-slate-300 dark:border-slate-600"
          )}
        >
          {taken && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        </button>
      </div>
    </div>
  );
}