import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Cycle, Prediction, SymptomLog } from '../types';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Droplet, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { SymptomsModal } from './SymptomsModal';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    const c = await supabase.getCycles();
    setCycles(c);
    const p = await supabase.getPredictions();
    setPredictions(p);
    const s = await supabase.getSymptoms();
    setSymptoms(s);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isPeriodDay = (date: Date) => {
    return cycles.some(c => {
      const start = parseISO(c.start_date);
      const end = c.end_date ? parseISO(c.end_date) : new Date();
      return date >= start && date <= end;
    });
  };

  const getPredictionType = (date: Date) => {
    const p = predictions.find(p => isSameDay(parseISO(p.date), date));
    return p ? p.type : null;
  };

  const hasSymptoms = (date: Date) => {
    return symptoms.some(s => isSameDay(parseISO(s.date), date));
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for start of month */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}
        
        {/* Days */}
        {days.map(day => {
          const isPeriod = isPeriodDay(day);
          const predType = getPredictionType(day);
          const hasSymp = hasSymptoms(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "relative h-10 w-full rounded-full flex items-center justify-center text-sm font-medium transition-all",
                !isSameMonth(day, monthStart) && "opacity-30",
                isSelected && "ring-2 ring-offset-2 ring-rose-500 dark:ring-offset-slate-900",
                isPeriod ? "bg-rose-500 text-white shadow-sm shadow-rose-200 dark:shadow-rose-900/20" :
                predType === 'period' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" :
                predType === 'ovulation' ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800" :
                predType === 'fertile_window' ? "bg-teal-50 text-teal-600 dark:bg-teal-900/10 dark:text-teal-400" :
                today ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold" :
                "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
              )}
            >
              {format(day, 'd')}
              
              {/* Indicators */}
              <div className="absolute bottom-1 flex space-x-0.5">
                {hasSymp && <div className="w-1 h-1 rounded-full bg-amber-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">What do these mean?</h3>
        <LegendItem 
          color="bg-rose-500" 
          label="Period" 
          description="Days you have logged as part of your current or past menstrual cycle."
        />
        <LegendItem 
          color="bg-rose-100 dark:bg-rose-900/30" 
          label="Predicted Period" 
          description="AI-estimated dates for your upcoming period based on your cycle history."
        />
        <LegendItem 
          color="bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800" 
          label="Ovulation" 
          description="The estimated day an egg is released, marking your highest chance of conception."
        />
        <LegendItem 
          color="bg-teal-50 dark:bg-teal-900/10" 
          label="Fertile Window" 
          description="The days leading up to and including ovulation when pregnancy is most likely."
        />
        <LegendItem 
          color="bg-amber-400" 
          label="Symptoms Logged" 
          description="Days where you have recorded physical or emotional symptoms."
          dot 
        />
      </div>

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="mt-6 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {format(selectedDate, 'EEEE, MMM d')}
            </h3>
            <button 
              onClick={() => setShowSymptomsModal(true)}
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {(() => {
            const daySymptoms = symptoms.find(s => isSameDay(parseISO(s.date), selectedDate));
            if (daySymptoms && (daySymptoms.symptoms.length > 0 || daySymptoms.mood || daySymptoms.bbt || daySymptoms.opk)) {
              return (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Logged for this day:</p>
                  <div className="flex flex-wrap gap-2">
                    {daySymptoms.symptoms.map(s => (
                      <span key={s} className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded-md">{s}</span>
                    ))}
                    {daySymptoms.mood && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-md">Mood: {daySymptoms.mood}</span>
                    )}
                    {daySymptoms.bbt && (
                      <span className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-1 rounded-md">BBT: {daySymptoms.bbt}°F</span>
                    )}
                    {daySymptoms.opk && (
                      <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-1 rounded-md uppercase">OPK: {daySymptoms.opk}</span>
                    )}
                  </div>
                </div>
              );
            }
            return <p className="text-sm text-slate-500 dark:text-slate-400 italic">No symptoms logged.</p>;
          })()}
        </div>
      )}

      {showSymptomsModal && selectedDate && (
        <SymptomsModal 
          date={selectedDate}
          onClose={() => setShowSymptomsModal(false)} 
          onSave={loadData} 
        />
      )}

    </div>
  );
}

function LegendItem({ color, label, description, dot = false }: { color: string, label: string, description: string, dot?: boolean }) {
  return (
    <div className="flex items-start space-x-3">
      <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0", color, dot && "w-2 h-2 mt-1.5")} />
      <div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{label}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">{description}</span>
      </div>
    </div>
  );
}
