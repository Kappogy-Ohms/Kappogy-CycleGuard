import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { X, Thermometer, Droplet, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export function SymptomsModal({ onClose, onSave, date }: { onClose: () => void, onSave: () => void, date?: Date }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [bbt, setBbt] = useState<string>('');
  const [opk, setOpk] = useState<'negative' | 'high' | 'peak' | ''>('');
  const [sleep, setSleep] = useState<string>('');
  const [energy, setEnergy] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      const allSymptoms = await supabase.getSymptoms();
      const targetDate = format(date || new Date(), 'yyyy-MM-dd');
      const existing = allSymptoms.find(s => s.date === targetDate);
      
      if (existing) {
        setSelectedSymptoms(existing.symptoms || []);
        setSelectedMood(existing.mood || '');
        setBbt(existing.bbt ? existing.bbt.toString() : '');
        setOpk(existing.opk || '');
        setSleep(existing.sleep ? existing.sleep.toString() : '');
        setEnergy(existing.energy || '');
      }
    };
    loadExisting();
  }, [date]);

  const symptomsList = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne', 'Backache'];
  const moodsList = ['Happy', 'Sad', 'Sensitive', 'Anxious', 'Calm', 'Irritable'];
  const energyList = ['High', 'Normal', 'Low'];
  const opkList: { value: 'negative' | 'high' | 'peak', label: string }[] = [
    { value: 'negative', label: 'Negative' },
    { value: 'high', label: 'High' },
    { value: 'peak', label: 'Peak' }
  ];

  const handleSave = async () => {
    setSaving(true);
    await supabase.logSymptom({
      date: format(date || new Date(), 'yyyy-MM-dd'),
      symptoms: selectedSymptoms,
      mood: selectedMood || null,
      notes: '',
      bbt: bbt ? parseFloat(bbt) : undefined,
      opk: opk || undefined,
      sleep: sleep ? parseFloat(sleep) : undefined,
      energy: energy || undefined
    });
    setSaving(false);
    onSave();
    onClose();
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Log Symptoms {date && format(date, 'MMM d')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Physical Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {symptomsList.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95",
                    selectedSymptoms.includes(s)
                      ? "bg-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Mood</h3>
            <div className="flex flex-wrap gap-2">
              {moodsList.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMood(m === selectedMood ? '' : m)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95",
                    m === selectedMood
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Energy</h3>
            <div className="flex flex-wrap gap-2">
              {energyList.map(e => (
                <button
                  key={e}
                  onClick={() => setEnergy(e === energy ? '' : e)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95",
                    e === energy
                      ? "bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                <Thermometer className="w-4 h-4 mr-1 text-orange-500" />
                BBT (°C)
              </h3>
              <input 
                type="number" 
                step="0.01"
                value={bbt}
                onChange={(e) => setBbt(e.target.value)}
                placeholder="36.5"
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                <Moon className="w-4 h-4 mr-1 text-indigo-500" />
                Sleep (hrs)
              </h3>
              <input 
                type="number" 
                step="0.5"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                placeholder="8"
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <Droplet className="w-4 h-4 mr-1 text-blue-500" />
              OPK Test
            </h3>
            <div className="flex flex-col gap-2">
              {opkList.map(o => (
                <button
                  key={o.value}
                  onClick={() => setOpk(o.value === opk ? '' : o.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left",
                    o.value === opk
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" /> : 'Save Log'}
        </button>
      </div>
    </div>
  );
}
