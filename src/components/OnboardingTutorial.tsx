import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export function OnboardingTutorial({ 
  user, 
  onUpdateUser,
  run,
  setRun
}: { 
  user: UserProfile, 
  onUpdateUser: (u: UserProfile) => void,
  run: boolean,
  setRun: (r: boolean) => void
}) {
  const [steps] = useState<Step[]>([
    {
      target: 'body',
      placement: 'center',
      content: 'Welcome to CycleGuard! Let me show you around so you can get the most out of your cycle tracking.',
      title: 'Welcome to CycleGuard',
      disableBeacon: true,
    },
    {
      target: '.tour-log-period',
      content: 'Tap here to log the start or end of your period. This helps us predict your future cycles accurately.',
      title: 'Log Your Period',
    },
    {
      target: '.tour-log-symptoms',
      content: 'Log your daily symptoms, mood, and Basal Body Temperature (BBT) here. This is especially useful if you are Trying to Conceive (TTC).',
      title: 'Track Symptoms & TTC',
    },
    {
      target: '.tour-ai-insights',
      content: 'Every day, our AI analyzes your logs to give you personalized, empathetic insights about how you might be feeling.',
      title: 'Daily AI Insights',
    },
    {
      target: '.tour-nav-calendar',
      content: 'View your past and predicted cycles, fertile windows, and logged symptoms on a full calendar view.',
      title: 'Calendar View',
    },
    {
      target: '.tour-nav-insights',
      content: 'Dive deep into your cycle analytics, including average lengths, top symptoms, and BBT charts.',
      title: 'Analytics & Trends',
    },
    {
      target: '.tour-nav-ai',
      content: 'Have a question? Chat with our AI assistant for personalized advice based on your unique cycle history.',
      title: 'AI Assistant',
    },
    {
      target: '.tour-nav-settings',
      content: 'Manage your data, generate a PDF report for your doctor, or link accounts with a partner here.',
      title: 'Settings & Export',
    }
  ]);

  useEffect(() => {
    if (user && user.has_seen_tutorial === false) {
      setRun(true);
    }
  }, [user, setRun]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (user && !user.has_seen_tutorial) {
        const updated = await supabase.updateUser({ has_seen_tutorial: true });
        onUpdateUser(updated);
      }
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#f43f5e', // rose-500
          textColor: '#1e293b', // slate-800
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#f43f5e',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#64748b',
        },
        buttonSkip: {
          color: '#64748b',
        }
      }}
    />
  );
}
