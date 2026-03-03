import { getDailyInsight } from './ai';
import { supabase } from './supabase';

export async function checkAndSendDailyTip() {
  try {
    const user = await supabase.getUser();
    if (!user.push_notifications) return;

    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission === 'granted') {
      const lastTipDate = localStorage.getItem('cycleguard_last_tip_date');
      const today = new Date().toISOString().split('T')[0];

      if (lastTipDate !== today) {
        const tip = await getDailyInsight();
        
        // Try to use Service Worker if available for better mobile support
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification('CycleGuard Daily Tip 🌸', {
              body: tip,
              icon: '/vite.svg', // Fallback icon
              tag: 'daily-tip',
              requireInteraction: true
            });
            localStorage.setItem('cycleguard_last_tip_date', today);
            return;
          }
        }
        
        // Fallback to standard Notification API
        const notification = new Notification('CycleGuard Daily Tip 🌸', {
          body: tip,
          icon: '/vite.svg',
        });
        
        notification.onclick = function() {
          window.focus();
          this.close();
        };

        localStorage.setItem('cycleguard_last_tip_date', today);
      }
    }
  } catch (error) {
    console.error('Failed to send daily tip notification:', error);
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
