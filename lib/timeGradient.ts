// lib/timeGradient.ts

export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'late-night';

export function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 9) return 'morning';      // 5am - 9am
  if (hour >= 9 && hour < 12) return 'noon';        // 9am - 12pm
  if (hour >= 12 && hour < 17) return 'afternoon';  // 12pm - 5pm
  if (hour >= 17 && hour < 20) return 'evening';    // 5pm - 8pm
  if (hour >= 20 && hour < 23) return 'night';      // 8pm - 11pm
  return 'late-night';                              // 11pm - 5am
}

export function applyTimeGradient() {
  const timeOfDay = getCurrentTimeOfDay();
  const root = document.documentElement;
  
  // Remove any existing time classes
  root.classList.remove('time-morning', 'time-noon', 'time-afternoon', 'time-evening', 'time-night', 'time-late-night');
  
  // Add the current time class
  root.classList.add(`time-${timeOfDay}`);
  
  console.log(`Applied ${timeOfDay} gradient theme`);
}

export function startTimeGradientUpdater() {
  // Apply immediately
  applyTimeGradient();
  
  // Update every hour
  const interval = setInterval(applyTimeGradient, 60 * 60 * 1000);
  
  return () => clearInterval(interval);
}
