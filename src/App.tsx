import { useState, useEffect } from 'react';
import { Home, Calendar as CalendarIcon, BarChart2, Settings as SettingsIcon, Fingerprint, MessageSquare } from 'lucide-react';
import { cn } from './lib/utils';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { Insights } from './components/Insights';
import { Settings } from './components/Settings';
import { AIAssistant } from './components/AIAssistant';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { supabase } from './lib/supabase';
import { UserProfile } from './types';
import { checkAndSendDailyTip } from './lib/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const u = await supabase.getUser();
      setUser(u);
      if (!u.biometric_lock) {
        setIsAuthenticated(true);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.push_notifications) {
      checkAndSendDailyTip();
    }
  }, [isAuthenticated, user?.push_notifications]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    // If biometric lock is disabled, ensure user is authenticated
    if (!updatedUser.biometric_lock) {
      setIsAuthenticated(true);
    }
  };

  if (!user) return null;

  if (user.biometric_lock && !isAuthenticated) {
    return (
      <div className={cn(
        "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col items-center justify-center p-6",
        "font-sans antialiased"
      )}>
        <div className="max-w-md w-full flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-500">
            <Fingerprint className="w-12 h-12" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">CycleGuard AI</h1>
            <p className="text-slate-500 dark:text-slate-400">App is locked. Authenticate to continue.</p>
          </div>

          <button 
            onClick={() => setIsAuthenticated(true)}
            className="w-full py-4 rounded-2xl bg-rose-500 text-white font-medium shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-colors active:scale-[0.98]"
          >
            Use Face ID / Touch ID
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <Dashboard user={user} />;
      case 'calendar': return <CalendarView />;
      case 'chat': return <AIAssistant />;
      case 'insights': return <Insights />;
      case 'settings': return <Settings user={user} onUpdateUser={handleUpdateUser} toggleTheme={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} onReplayTutorial={() => setRunTutorial(true)} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-200",
      "font-sans antialiased"
    )}>
      <OnboardingTutorial user={user} onUpdateUser={handleUpdateUser} run={runTutorial} setRun={setRunTutorial} />
      {/* Mobile App Container */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-semibold tracking-tight text-rose-500 dark:text-rose-400">
            CycleGuard <span className="text-slate-400 font-light">AI</span>
          </h1>
          {user.pregnancy_mode && (
            <span className="text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-1 rounded-full">
              Pregnancy Mode
            </span>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
          {renderTab()}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 pb-safe">
          <div className="flex justify-around items-center h-16 px-2">
            <NavItem icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} className="tour-nav-home" />
            <NavItem icon={CalendarIcon} label="Calendar" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} className="tour-nav-calendar" />
            <NavItem icon={MessageSquare} label="AI Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} className="tour-nav-ai" />
            <NavItem icon={BarChart2} label="Insights" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} className="tour-nav-insights" />
            <NavItem icon={SettingsIcon} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} className="tour-nav-settings" />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick, className }: { icon: any, label: string, isActive: boolean, onClick: () => void, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-all duration-200",
        isActive ? "text-rose-500 dark:text-rose-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
        className
      )}
    >
      <Icon className={cn("w-5 h-5", isActive && "fill-rose-100 dark:fill-rose-900/30")} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
