import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCycleAnalysis } from '../lib/ai';
import { Cycle, SymptomLog } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Sparkles, TrendingUp, AlertCircle, Thermometer, Loader2 } from 'lucide-react';
import { RichText } from './RichText';

export function Insights() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const c = await supabase.getCycles();
    setCycles(c);
    const s = await supabase.getSymptoms();
    setSymptoms(s);
    
    getCycleAnalysis().then(setAnalysis);
    
    setLoading(false);
  };

  if (loading) return <div className="p-6 flex justify-center items-center h-full"><div className="animate-pulse w-8 h-8 rounded-full bg-rose-200"></div></div>;

  const completedCycles = cycles.filter(c => c.end_date);
  
  const cycleData = completedCycles.map((c, i) => ({
    name: `Cycle ${completedCycles.length - i}`,
    length: differenceInDays(parseISO(c.end_date!), parseISO(c.start_date)) + 1,
    date: format(parseISO(c.start_date), 'MMM yyyy')
  })).reverse();

  const avgLength = cycleData.length > 0 
    ? Math.round(cycleData.reduce((acc, curr) => acc + curr.length, 0) / cycleData.length)
    : 0;

  // Calculate real average period length
  const periodLengths = completedCycles.map(c => differenceInDays(parseISO(c.end_date!), parseISO(c.start_date)) + 1);
  const avgPeriodLength = periodLengths.length > 0
    ? Math.round(periodLengths.reduce((acc, curr) => acc + curr, 0) / periodLengths.length)
    : 0;

  // Calculate top symptoms
  const symptomCounts: Record<string, number> = {};
  let totalSymptomDays = 0;
  
  symptoms.forEach(log => {
    if (log.symptoms.length > 0) {
      totalSymptomDays++;
      log.symptoms.forEach(s => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    }
  });

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({
      label,
      percentage: Math.round((count / totalSymptomDays) * 100)
    }));

  const colors = ['bg-rose-500', 'bg-indigo-500', 'bg-amber-500', 'bg-teal-500'];

  const isIrregular = cycleData.some(c => Math.abs(c.length - avgLength) > 5);

  const bbtData = symptoms
    .filter(s => s.bbt !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => ({
      date: format(parseISO(s.date), 'MMM d'),
      bbt: s.bbt
    }))
    .slice(-14); // Last 14 BBT readings

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Analytics
        </h2>
        <div className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-medium flex items-center">
          <TrendingUp className="w-3 h-3 mr-1" />
          Last 6 Months
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Cycle Length</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{avgLength || '--'}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">days</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Period Length</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{avgPeriodLength || '--'}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">days</span>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">AI Cycle Analysis</h3>
        </div>
        
        {analysis ? (
          <RichText content={analysis} className="text-indigo-800/80 dark:text-indigo-300/80" />
        ) : (
          <div className="flex items-center space-x-2 text-sm text-indigo-500/80 dark:text-indigo-400/80">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing your cycle history...</span>
          </div>
        )}
      </div>

      {/* BBT Chart */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <Thermometer className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Basal Body Temperature</h3>
        </div>
        
        <div className="h-48 w-full">
          {bbtData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bbtData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="bbt" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center px-4">
              Log your Basal Body Temperature (BBT) daily to see your ovulation curve.
            </div>
          )}
        </div>
      </div>

      {/* Cycle Length Chart */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-6">Cycle Length History</h3>
        
        <div className="h-48 w-full">
          {cycleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="length" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Not enough data to display chart.
            </div>
          )}
        </div>
      </div>

      {/* Symptom Frequency */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Top Symptoms</h3>
        <div className="space-y-3">
          {topSymptoms.length > 0 ? (
            topSymptoms.map((s, i) => (
              <SymptomBar key={s.label} label={s.label} percentage={s.percentage} color={colors[i % colors.length]} />
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Not enough symptom data logged yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}

function SymptomBar({ label, percentage, color }: { label: string, percentage: number, color: string, key?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
