import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { availability, bookings, meetingTypes, users } from "~/server/db/schema";
import { GoogleCalendarService } from "./google-calendar";
import { TimezoneService } from "./timezone";

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  datetime: string; // ISO string
  display: string; // Human readable time
  timezone: string; // User's timezone
}

export async function getAvailableSlots(
  username: string,
  meetingTypeId: number,
  startDate: Date,
  endDate: Date
): Promise<AvailableSlot[]> {
  // Get user and meeting type
  const [user] = await db
    .select({
      id: users.id,
      timezone: users.timezone,
      calendarConnected: users.calendarConnected,
      calendarAccessToken: users.calendarAccessToken,
      calendarRefreshToken: users.calendarRefreshToken,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const [meetingType] = await db
    .select()
    .from(meetingTypes)
    .where(
      and(
        eq(meetingTypes.id, meetingTypeId),
        eq(meetingTypes.userId, user.id),
        eq(meetingTypes.active, true)
      )
    )
    .limit(1);

  if (!meetingType) {
    throw new Error("Meeting type not found");
  }

  // Get user's availability
  const userAvailability = await db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.userId, user.id),
        eq(availability.active, true)
      )
    );

  // Get existing bookings in the date range
  const existingBookings = await db
    .select({
      scheduledTime: bookings.scheduledTime,
      duration: meetingTypes.durationMinutes,
    })
    .from(bookings)
    .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
    .where(
      and(
        eq(meetingTypes.userId, user.id),
        eq(bookings.status, "confirmed"),
        gte(bookings.scheduledTime, startDate),
        lt(bookings.scheduledTime, endDate)
      )
    );

  // Get Google Calendar busy times if connected
  let googleBusyTimes: Array<{ start: Date; end: Date }> = [];
  if (user.calendarConnected && user.calendarAccessToken) {
    try {
      const googleCalendar = new GoogleCalendarService();
      googleCalendar.setCredentials(
        user.calendarAccessToken,
        user.calendarRefreshToken || undefined
      );
      
      const busyTimes = await googleCalendar.getBusyTimes(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      googleBusyTimes = busyTimes.map(busy => ({
        start: new Date(busy.start),
        end: new Date(busy.end),
      }));
    } catch (error) {
      console.error("Error fetching Google Calendar busy times:", error);
      // Continue without Google Calendar integration
    }
  }

  const availableSlots: AvailableSlot[] = [];
  const now = new Date();
  const advanceNoticeMs = meetingType.advanceNoticeHours * 60 * 60 * 1000;
  const minBookingTime = new Date(now.getTime() + advanceNoticeMs);

  // Generate slots for each day in the range
  for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    
    // Find availability for this day of week
    const dayAvailability = userAvailability.filter(
      av => av.dayOfWeek === dayOfWeek
    );

    for (const avail of dayAvailability) {
      const startParts = avail.startTime.split(":").map(Number);
      const endParts = avail.endTime.split(":").map(Number);
      
      if (startParts.length !== 2 || endParts.length !== 2) continue;
      
      const [startHour, startMin] = startParts;
      const [endHour, endMin] = endParts;
      
      if (startHour === undefined || startMin === undefined || 
          endHour === undefined || endMin === undefined) continue;

      // Create time slots every 15 minutes
      const slotStart = new Date(date);
      slotStart.setHours(startHour, startMin, 0, 0);
      
      const slotEnd = new Date(date);
      slotEnd.setHours(endHour, endMin, 0, 0);

      for (let current = new Date(slotStart); current < slotEnd; current.setMinutes(current.getMinutes() + 15)) {
        const slotEndTime = new Date(current.getTime() + meetingType.durationMinutes * 60 * 1000);
        
        // Skip if slot ends after availability window
        if (slotEndTime > slotEnd) continue;
        
        // Skip if slot is in the past or within advance notice period
        if (current < minBookingTime) continue;

        // Check if slot conflicts with existing bookings
        const hasBookingConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.scheduledTime);
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);
          
          return TimezoneService.doTimesOverlap(current, slotEndTime, bookingStart, bookingEnd);
        });

        // Check if slot conflicts with Google Calendar events
        const hasGoogleConflict = googleBusyTimes.some(busy => {
          return TimezoneService.doTimesOverlap(current, slotEndTime, busy.start, busy.end);
        });

        if (!hasBookingConflict && !hasGoogleConflict) {
          // Convert to user's timezone for display
          const displayTime = TimezoneService.formatInTimezone(
            current,
            user.timezone,
            "h:mm a"
          );

          availableSlots.push({
            datetime: current.toISOString(),
            display: displayTime,
            timezone: user.timezone,
          });
        }
      }
    }
  }

  return availableSlots.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
}

export async function checkDailyLimit(
  userId: number,
  meetingTypeId: number,
  date: Date
): Promise<boolean> {
  const [meetingType] = await db
    .select({ dailyLimit: meetingTypes.dailyLimit })
    .from(meetingTypes)
    .where(eq(meetingTypes.id, meetingTypeId))
    .limit(1);

  if (!meetingType?.dailyLimit) return true;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
    .where(
      and(
        eq(meetingTypes.userId, userId),
        eq(bookings.status, "confirmed"),
        gte(bookings.scheduledTime, startOfDay),
        lt(bookings.scheduledTime, endOfDay)
      )
    );

  const count = result[0]?.count ?? 0;
  return count < meetingType.dailyLimit;
}