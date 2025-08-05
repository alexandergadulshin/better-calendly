import { format, formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKST)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "UTC", label: "UTC" },
];

export class TimezoneService {
  /**
   * Get the user's browser timezone
   */
  static getBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }

  /**
   * Convert a time string (HH:MM) and date to UTC for a specific timezone
   */
  static timeToUTC(
    timeString: string, 
    date: Date, 
    timezone: string
  ): Date {
    const [hours, minutes] = timeString.split(":").map(Number);
    if (hours === undefined || minutes === undefined) {
      throw new Error("Invalid time format");
    }

    // Create date in the specified timezone
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);

    // Convert to UTC
    return fromZonedTime(localDate, timezone);
  }

  /**
   * Convert UTC date to local time string in a specific timezone
   */
  static utcToLocalTime(utcDate: Date, timezone: string): string {
    const zonedDate = toZonedTime(utcDate, timezone);
    return format(zonedDate, "HH:mm");
  }

  /**
   * Format a date in a specific timezone
   */
  static formatInTimezone(
    date: Date, 
    timezone: string, 
    formatString: string = "yyyy-MM-dd HH:mm:ss zzz"
  ): string {
    return formatInTimeZone(date, timezone, formatString);
  }

  /**
   * Check if two time ranges overlap, considering timezone
   */
  static doTimesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Get timezone offset in minutes
   */
  static getTimezoneOffset(timezone: string, date: Date = new Date()): number {
    const utcDate = new Date(date.toISOString());
    const zonedDate = toZonedTime(utcDate, timezone);
    return (utcDate.getTime() - zonedDate.getTime()) / (1000 * 60);
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current time in a specific timezone
   */
  static getCurrentTimeInTimezone(timezone: string): Date {
    return toZonedTime(new Date(), timezone);
  }

  /**
   * Convert availability slots from user's timezone to UTC for storage
   */
  static convertAvailabilityToUTC(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    userTimezone: string
  ): Array<{ dayOfWeek: number; startTime: string; endTime: string }> {
    // Create a date for the given day of week (using current week)
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const daysToAdd = dayOfWeek - currentDayOfWeek;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);

    const startUTC = this.timeToUTC(startTime, targetDate, userTimezone);
    const endUTC = this.timeToUTC(endTime, targetDate, userTimezone);

    // Handle cases where UTC conversion crosses midnight
    const results = [];
    
    if (startUTC.getUTCDate() === endUTC.getUTCDate()) {
      // Same day in UTC
      results.push({
        dayOfWeek: startUTC.getUTCDay(),
        startTime: format(startUTC, "HH:mm"),
        endTime: format(endUTC, "HH:mm"),
      });
    } else {
      // Crosses midnight in UTC - split into two slots
      results.push({
        dayOfWeek: startUTC.getUTCDay(),
        startTime: format(startUTC, "HH:mm"),
        endTime: "23:59",
      });
      results.push({
        dayOfWeek: endUTC.getUTCDay(),
        startTime: "00:00",
        endTime: format(endUTC, "HH:mm"),
      });
    }

    return results;
  }

  /**
   * Get user-friendly timezone name
   */
  static getTimezoneDisplayName(timezone: string): string {
    const found = COMMON_TIMEZONES.find(tz => tz.value === timezone);
    if (found) return found.label;

    // Fallback to showing the timezone ID
    return timezone.replace(/_/g, " ");
  }

  /**
   * Get timezone abbreviation (EST, PST, etc.)
   */
  static getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "short",
      });
      
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === "timeZoneName");
      return timeZonePart?.value || timezone;
    } catch {
      return timezone;
    }
  }
}