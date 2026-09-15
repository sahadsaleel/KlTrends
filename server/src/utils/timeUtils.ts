/**
 * Time and Date Utilities for Indian Standard Time (IST, UTC+05:30)
 * All shifts and operations are centered in India (KLTrends).
 */

export interface ISTDateTime {
  dateStr: string; // YYYY-MM-DD
  hours: number;   // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
  year: number;
  month: number;   // 1-12
  day: number;     // 1-31
  timeStr: string; // e.g. "07:36 PM"
}

/**
 * Returns date and time breakdown in Asia/Kolkata (IST) timezone.
 */
export const getISTDateTime = (date: Date = new Date()): ISTDateTime => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hours = parseInt(partMap.hour, 10);
  const minutes = parseInt(partMap.minute, 10);
  const seconds = parseInt(partMap.second, 10);

  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    dateStr,
    hours,
    minutes,
    seconds,
    year,
    month,
    day,
    timeStr,
  };
};

/**
 * Returns YYYY-MM-DD formatted date in Asia/Kolkata timezone.
 */
export const formatISTDateString = (date: Date = new Date()): string => {
  return getISTDateTime(date).dateStr;
};

/**
 * Formats a Date object into a readable 12-hour time string in IST (e.g., "07:36 PM").
 */
export const formatISTTimeString = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Check if the given time is before 5:30 PM (17:30) IST.
 */
export const isEarlyCheckoutIST = (date: Date = new Date()): boolean => {
  const { hours, minutes } = getISTDateTime(date);
  return hours < 17 || (hours === 17 && minutes < 30);
};

/**
 * Check if the given time is after 10:05 AM IST (10:00 AM shift start + 5-minute grace period).
 * On-time up to and including 10:05 AM IST.
 */
export const isLateCheckInIST = (date: Date = new Date()): boolean => {
  const { hours, minutes } = getISTDateTime(date);
  return hours > 10 || (hours === 10 && minutes > 5);
};
