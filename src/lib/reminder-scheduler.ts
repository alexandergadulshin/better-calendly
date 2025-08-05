import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "~/server/db";
import { bookings, meetingTypes, users } from "~/server/db/schema";
import { EmailService } from "./email";

export class ReminderScheduler {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send 24-hour reminders for bookings happening in 24-25 hours
   */
  async send24HourReminders(): Promise<void> {
    const now = new Date();
    const start24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookingsToRemind = await this.getBookingsForReminder(start24h, end24h);

    for (const booking of bookingsToRemind) {
      try {
        await this.emailService.sendReminderEmail({
          ...booking,
          reminderType: "24hours",
        });
        console.log(`24-hour reminder sent for booking ${booking.bookingId}`);
      } catch (error) {
        console.error(`Failed to send 24-hour reminder for booking ${booking.bookingId}:`, error);
      }
    }
  }

  /**
   * Send 1-hour reminders for bookings happening in 1-2 hours
   */
  async send1HourReminders(): Promise<void> {
    const now = new Date();
    const start1h = new Date(now.getTime() + 60 * 60 * 1000);
    const end1h = new Date(now.getTime() + 120 * 60 * 1000);

    const bookingsToRemind = await this.getBookingsForReminder(start1h, end1h);

    for (const booking of bookingsToRemind) {
      try {
        await this.emailService.sendReminderEmail({
          ...booking,
          reminderType: "1hour",
        });
        console.log(`1-hour reminder sent for booking ${booking.bookingId}`);
      } catch (error) {
        console.error(`Failed to send 1-hour reminder for booking ${booking.bookingId}:`, error);
      }
    }
  }

  private async getBookingsForReminder(startTime: Date, endTime: Date) {
    const bookingsData = await db
      .select({
        booking: bookings,
        meetingType: meetingTypes,
        user: {
          username: users.username,
          email: users.email,
        },
      })
      .from(bookings)
      .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
      .innerJoin(users, eq(meetingTypes.userId, users.id))
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(bookings.scheduledTime, startTime),
          lte(bookings.scheduledTime, endTime)
        )
      );

    return bookingsData.map(({ booking, meetingType, user }) => ({
      hostName: user.username,
      hostEmail: user.email,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      meetingTitle: meetingType.name,
      duration: meetingType.durationMinutes,
      scheduledTime: new Date(booking.scheduledTime),
      locationType: meetingType.locationType,
      locationDetails: meetingType.locationDetails || undefined,
      bookingId: booking.id,
      username: user.username,
    }));
  }
}

/**
 * Cron job function to send reminders
 * This should be called by a scheduled task (e.g., Vercel Cron, GitHub Actions, etc.)
 */
export async function sendScheduledReminders(): Promise<void> {
  const scheduler = new ReminderScheduler();
  
  console.log("Starting scheduled reminder process...");
  
  await Promise.all([
    scheduler.send24HourReminders(),
    scheduler.send1HourReminders(),
  ]);
  
  console.log("Scheduled reminder process completed");
}