import { useState } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle, Cloud, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { authClient } from '../lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialView?: 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';
}

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password' | 'check-email' | 'update-password';

export function AuthModal({ onClose, onSuccess, initialView = 'sign-in' }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0 to 4
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === 'sign-up') {
        const { error: signUpError } = await authClient.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setView('check-email');
      } else if (view === 'sign-in') {
        const { error: signInError } = await authClient.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
      } else if (view === 'forgot-password') {
        const { error: resetError } = await authClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (resetError) throw resetError;
        setView('check-email');
      } else if (view === 'update-password') {
        const { error: updateError } = await authClient.auth.updateUser({
          password: password
        });
        if (updateError) throw updateError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    let title = 'Sign In';
    if (view === 'sign-up') title = 'Create Account';
    if (view === 'forgot-password') title = 'Reset Password';
    if (view === 'check-email') title = 'Check Your Email';
    if (view === 'update-password') title = 'Set New Password';

    return (
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {view === 'forgot-password' || view === 'sign-up' ? (
            <button 
              onClick={() => setView('sign-in')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (view === 'check-email') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {renderHeader()}
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Check your inbox</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              We've sent an email to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> with a link to verify your account or reset your password.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {renderHeader()}

        <div className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {view === 'sign-up' && 'Create an account to securely back up your cycle data and sync across devices.'}
            {view === 'sign-in' && 'Sign in to access your backed-up cycle data and sync across devices.'}
            {view === 'forgot-password' && 'Enter your email address and we will send you a link to reset your password.'}
            {view === 'update-password' && 'Enter your new password below.'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-start space-x-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {view !== 'update-password' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            )}

            {view !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {view === 'update-password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {(view === 'sign-up' || view === 'update-password') && password.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex space-x-1 h-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div 
                          key={level} 
                          className={`flex-1 rounded-full transition-colors duration-300 ${
                            strength >= level ? strengthColors[strength] : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strength >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      Password strength: {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>
            )}

            {view === 'sign-in' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || ((view === 'sign-up' || view === 'update-password') && strength < 2)}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                view === 'sign-up' ? 'Create Account' : 
                view === 'sign-in' ? 'Sign In' : 
                view === 'forgot-password' ? 'Send Reset Link' : 'Update Password'
              )}
            </button>
          </form>

          {view === 'sign-in' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setView('sign-up')}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Don't have an account? <span className="text-indigo-600 dark:text-indigo-400 font-medium">Sign up</span>
              </button>
            </div>
          )}
          
          {view === 'sign-up' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setView('sign-in')}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Already have an account? <span className="text-indigo-600 dark:text-indigo-400 font-medium">Sign in</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
