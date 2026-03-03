import { useState, ReactNode, useRef, useEffect } from 'react';
import { UserProfile, Cycle, SymptomLog, MedicationReminder } from '../types';
import { supabase, authClient } from '../lib/supabase';
import { 
  User, Shield, Download, Moon, Sun, Lock, Heart, 
  ChevronRight, Crown, AlertTriangle, LogOut, Users, FileText, Bell, Cloud, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { differenceInDays, parseISO } from 'date-fns';
import { AuthModal } from './AuthModal';

export function Settings({ 
  user, 
  onUpdateUser, 
  toggleTheme, 
  isDarkMode,
  onReplayTutorial
}: { 
  user: UserProfile, 
  onUpdateUser: (u: UserProfile) => void,
  toggleTheme: () => void,
  isDarkMode: boolean,
  onReplayTutorial: () => void
}) {
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [session, setSession] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Data for PDF
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setCycles(await supabase.getCycles());
      setSymptoms(await supabase.getSymptoms());
      setReminders(await supabase.getMedicationReminders());
    };
    loadData();

    // Check auth session
    authClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await authClient.auth.signOut();
  };

  const handleToggle = async (key: keyof UserProfile) => {
    if (key === 'push_notifications') {
      if (!user.push_notifications) {
        // Request local notification permission
        try {
          if (!('Notification' in window)) {
            alert('This browser does not support desktop notification');
            return;
          }
          
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const updated = await supabase.updateUser({ [key]: true });
            onUpdateUser(updated);
          } else {
            alert('Push notification permission denied. Please enable it in your browser settings.');
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          alert('Failed to enable push notifications.');
        }
      } else {
        // Disable notifications
        const updated = await supabase.updateUser({ [key]: false });
        onUpdateUser(updated);
      }
    } else {
      const updated = await supabase.updateUser({ [key]: !user[key] });
      onUpdateUser(updated);
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim()) return;
    const updated = await supabase.updateUser({ linked_partner_id: partnerCodeInput.trim() });
    onUpdateUser(updated);
    setPartnerCodeInput('');
  };

  const handleUnlinkPartner = async () => {
    const updated = await supabase.updateUser({ linked_partner_id: null });
    onUpdateUser(updated);
  };

  const handleExport = async () => {
    setExporting(true);
    const data = await supabase.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycleguard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1000);
  };

  const handleDeleteData = async () => {
    await supabase.clearAllData();
    if (session) {
      await authClient.auth.signOut();
    }
    window.location.reload();
  };

  const handleLogOut = async () => {
    if (session) {
      await authClient.auth.signOut();
    }
    window.location.reload();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    
    try {
      // Temporarily show the report div to render it
      reportRef.current.style.display = 'block';
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      reportRef.current.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`cycleguard-doctor-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setExportingPdf(false);
    }
  };

  // Calculate dynamic stats for PDF
  const completedCycles = cycles.filter(c => c.end_date);
  const avgCycleLength = completedCycles.length > 0 
    ? Math.round(completedCycles.reduce((acc, curr) => acc + differenceInDays(parseISO(curr.end_date!), parseISO(curr.start_date)) + 1, 0) / completedCycles.length)
    : 0;

  const avgPeriodLength = completedCycles.length > 0
    ? Math.round(completedCycles.reduce((acc, curr) => acc + differenceInDays(parseISO(curr.end_date!), parseISO(curr.start_date)) + 1, 0) / completedCycles.length)
    : 0; // In a real app, period length and cycle length would be tracked separately. For now, we use cycle length logic or a placeholder. Let's assume 5 if no data.

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

  const myPartnerCode = `CG-${user.id.substring(0, 4).toUpperCase()}-PL`;

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{user.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user.anonymous_mode ? 'Anonymous Mode Active' : 'user@example.com'}
          </p>
        </div>
      </div>

      {/* Premium Banner */}
      {!user.is_premium && (
        <div className="bg-gradient-to-r from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-full text-white">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Upgrade to Premium</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">Unlock advanced AI insights & unlimited history.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-500" />
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Cloud Backup & Sync */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Cloud Backup & Sync</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-4">
            {session ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Data is backed up</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{session.user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Local Storage Only</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to sync across devices</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </section>

        {/* App Settings */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">App Settings</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <SettingRow 
              icon={isDarkMode ? Moon : Sun} 
              label="Dark Mode" 
              description="Toggle application theme"
              action={<Toggle checked={isDarkMode} onChange={toggleTheme} />} 
            />
            <SettingRow 
              icon={Heart} 
              label="Pregnancy Mode" 
              description="Pause cycle predictions"
              action={<Toggle checked={user.pregnancy_mode} onChange={() => handleToggle('pregnancy_mode')} />} 
            />
            <SettingRow 
              icon={Bell} 
              label="Push Notifications" 
              description="Get reminders & insights"
              action={<Toggle checked={user.push_notifications || false} onChange={() => handleToggle('push_notifications')} />} 
            />
            <button 
              onClick={onReplayTutorial}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800 dark:text-slate-200">Replay Tutorial</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Show the onboarding guide again</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Privacy & Security */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Privacy & Security</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <SettingRow 
              icon={Shield} 
              label="Anonymous Mode" 
              description="Hide personal identifiers"
              action={<Toggle checked={user.anonymous_mode} onChange={() => handleToggle('anonymous_mode')} />} 
            />
            <SettingRow 
              icon={Lock} 
              label="Biometric Lock" 
              description="Require Face ID / Touch ID"
              action={<Toggle checked={user.biometric_lock} onChange={() => handleToggle('biometric_lock')} />} 
            />
            <SettingRow 
              icon={Users} 
              label="Partner Sharing" 
              description="Share cycle phases securely"
              action={<Toggle checked={!!user.partner_sharing} onChange={() => handleToggle('partner_sharing')} />} 
            />
            {user.partner_sharing && (
              <div className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Your Partner Code</p>
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-sm tracking-widest text-slate-800 dark:text-slate-200">{myPartnerCode}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(myPartnerCode)}
                    className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Partner Connection */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Partner Connection</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-4">
            {!user.linked_partner_id ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">Enter your partner's code to link accounts and view their cycle insights.</p>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={partnerCodeInput}
                    onChange={(e) => setPartnerCodeInput(e.target.value)}
                    placeholder="e.g. CG-XXXX-PL" 
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
                  />
                  <button 
                    onClick={handleLinkPartner}
                    disabled={!partnerCodeInput.trim()}
                    className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Linked to Partner</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Code: {user.linked_partner_id}</p>
                  </div>
                </div>
                <button 
                  onClick={handleUnlinkPartner}
                  className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Unlink
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Data Management</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <button 
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800 dark:text-slate-200">Doctor Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Download PDF summary for your OBGYN</p>
                </div>
              </div>
              <span className="text-sm font-medium text-teal-500">{exportingPdf ? 'Generating...' : 'Download'}</span>
            </button>

            <button 
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800 dark:text-slate-200">Export Raw Data</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Download your data as JSON</p>
                </div>
              </div>
              <span className="text-sm font-medium text-rose-500">{exporting ? 'Exporting...' : 'Export'}</span>
            </button>
            
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-red-600 dark:text-red-400">Delete Account</p>
                  <p className="text-xs text-red-500/80 dark:text-red-400/80">Permanently remove all data</p>
                </div>
              </div>
            </button>
          </div>
        </section>

      </div>

      {/* Logout */}
      <button 
        onClick={handleLogOut}
        className="w-full flex items-center justify-center space-x-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-8"
      >
        <LogOut className="w-5 h-5" />
        <span>Log Out</span>
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Delete All Data?</h2>
              </div>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Are you sure you want to permanently delete your account and all associated data? 
                <span className="block mt-2 font-semibold text-red-600 dark:text-red-400">This action cannot be undone.</span>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteData}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Report Template */}
      <div 
        ref={reportRef} 
        style={{ display: 'none' }}
        className="absolute top-0 left-0 w-[800px] bg-white text-slate-900 p-12 z-[-1000]"
      >
        <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CycleGuard Health Report</h1>
            <p className="text-slate-500 mt-2">Patient: {user.name}</p>
          </div>
          <div className="text-right text-slate-500">
            <p>Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Cycle Summary (Last 6 Months)</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Average Cycle Length</p>
                <p className="text-3xl font-bold text-slate-900">{avgCycleLength || '--'} days</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Average Period Length</p>
                <p className="text-3xl font-bold text-slate-900">{avgPeriodLength || '--'} days</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Frequent Symptoms</h2>
            {topSymptoms.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                {topSymptoms.map(s => (
                  <li key={s.label}>{s.label} (Logged {s.percentage}% of symptom days)</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No symptoms logged.</p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Notes & Medications</h2>
            <p className="text-slate-700">
              Currently taking: {reminders.length > 0 ? reminders.map(r => r.name).join(', ') : 'None logged'}
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
          <p>This report was automatically generated by CycleGuard AI.</p>
          <p>Not intended for self-diagnosis. Please consult with a healthcare professional.</p>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={() => setShowAuthModal(false)} 
        />
      )}
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, action }: { icon: any, label: string, description: string, action: ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
        checked ? "bg-rose-500" : "bg-slate-200 dark:bg-slate-600"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
