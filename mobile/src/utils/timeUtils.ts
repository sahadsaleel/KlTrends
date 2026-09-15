/**
 * Utility functions for Indian Standard Time (IST, UTC+05:30)
 * Ensures consistent time formatting and shift validation across mobile screens.
 */

export interface ISTComponents {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  day: number;
  weekday: number; // 0 = Sun, 6 = Sat
  hours: number; // 24-hour format (0-23)
  minutes: number;
  seconds: number;
}

/**
 * Get date and time components in Asia/Kolkata (IST).
 * Includes robust fallback calculation using UTC offset in case Intl is limited.
 */
export const getISTComponents = (date: Date = new Date()): ISTComponents => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayIdx = days.indexOf(map.weekday);

    let h = parseInt(map.hour || '0', 10);
    if (h === 24) h = 0;

    return {
      year: parseInt(map.year || '0', 10),
      month: parseInt(map.month || '1', 10) - 1,
      day: parseInt(map.day || '1', 10),
      weekday: weekdayIdx >= 0 ? weekdayIdx : date.getDay(),
      hours: h,
      minutes: parseInt(map.minute || '0', 10),
      seconds: parseInt(map.second || '0', 10),
    };
  } catch {
    // Fallback: +05:30 offset in ms (5.5 hours = 19,800,000 ms)
    const istTime = new Date(date.getTime() + (5.5 * 60 + date.getTimezoneOffset()) * 60 * 1000);
    return {
      year: istTime.getFullYear(),
      month: istTime.getMonth(),
      day: istTime.getDate(),
      weekday: istTime.getDay(),
      hours: istTime.getHours(),
      minutes: istTime.getMinutes(),
      seconds: istTime.getSeconds(),
    };
  }
};

/**
 * Format a Date or ISO string to IST time string: "09:45 AM"
 */
export const formatISTTime = (date: Date | string | null | undefined): string => {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';

  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const { hours, minutes } = getISTComponents(d);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const hh = String(displayHours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm} ${period}`;
  }
};

/**
 * Format clock string for live display (e.g., "10:05 AM" with numeric hour)
 */
export const formatISTClock = (date: Date = new Date()): string => {
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const { hours, minutes } = getISTComponents(date);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const mm = String(minutes).padStart(2, '0');
    return `${displayHours}:${mm} ${period}`;
  }
};

/**
 * Format date in IST for screen header: "Monday, Jan 15"
 */
export const formatISTDate = (date: Date = new Date()): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const { weekday, month, day } = getISTComponents(date);
  return `${dayNames[weekday]}, ${monthNames[month]} ${day}`;
};

/**
 * Check if the check-in time is late in IST.
 * Shift begins at 10:00 AM IST with a 5-minute grace period.
 * On-time up to and including 10:05 AM IST.
 * Returns true if after 10:05 AM IST.
 */
export const isLateCheckInIST = (date: Date = new Date()): boolean => {
  const { hours, minutes } = getISTComponents(date);
  return hours > 10 || (hours === 10 && minutes > 5);
};

/**
 * Check if check-out time is before 5:30 PM (17:30) IST.
 * Shift ends at 5:30 PM IST.
 * Returns true if before 5:30 PM IST.
 */
export const isEarlyCheckoutIST = (date: Date = new Date()): boolean => {
  const { hours, minutes } = getISTComponents(date);
  return hours < 17 || (hours === 17 && minutes < 30);
};
