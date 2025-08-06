import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { bookings, meetingTypes, users } from "~/server/db/schema";
// TODO: Add authentication when Clerk integration is set up
import { checkDailyLimit } from "~/lib/availability";
import { GoogleCalendarService } from "~/lib/google-calendar";
import { EmailService } from "~/lib/email";

const createBookingSchema = z.object({
  meetingTypeId: z.number(),
  inviteeName: z.string().min(1).max(255),
  inviteeEmail: z.string().email(),
  inviteePhone: z.string().optional(),
  scheduledTime: z.string().datetime(),
  responses: z.array(z.object({
    questionId: z.number(),
    response: z.string(),
  })).optional(),
});

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when Clerk integration is set up
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "confirmed" | "cancelled" | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    const baseWhere = eq(meetingTypes.userId, user.id);
    const whereCondition = status 
      ? and(baseWhere, eq(bookings.status, status))
      : baseWhere;

    const userBookings = await db
      .select({
        id: bookings.id,
        inviteeName: bookings.inviteeName,
        inviteeEmail: bookings.inviteeEmail,
        inviteePhone: bookings.inviteePhone,
        scheduledTime: bookings.scheduledTime,
        status: bookings.status,
        createdAt: bookings.createdAt,
        meetingType: {
          id: meetingTypes.id,
          name: meetingTypes.name,
          durationMinutes: meetingTypes.durationMinutes,
          locationType: meetingTypes.locationType,
          locationDetails: meetingTypes.locationDetails,
        },
      })
      .from(bookings)
      .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
      .where(whereCondition)
      .orderBy(desc(bookings.scheduledTime))
      .limit(limit);

    return NextResponse.json({ bookings: userBookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createBookingSchema.parse(body);

    // Get meeting type and user info
    const [meetingTypeData] = await db
      .select({
        meetingType: meetingTypes,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          timezone: users.timezone,
          calendarConnected: users.calendarConnected,
          calendarAccessToken: users.calendarAccessToken,
          calendarRefreshToken: users.calendarRefreshToken,
        },
      })
      .from(meetingTypes)
      .innerJoin(users, eq(meetingTypes.userId, users.id))
      .where(
        and(
          eq(meetingTypes.id, data.meetingTypeId),
          eq(meetingTypes.active, true)
        )
      )
      .limit(1);

    if (!meetingTypeData) {
      return NextResponse.json(
        { error: "Meeting type not found or inactive" },
        { status: 404 }
      );
    }

    const { meetingType, user } = meetingTypeData;
    const scheduledTime = new Date(data.scheduledTime);

    // Check advance notice
    const now = new Date();
    const advanceNoticeMs = meetingType.advanceNoticeHours * 60 * 60 * 1000;
    const minBookingTime = new Date(now.getTime() + advanceNoticeMs);

    if (scheduledTime < minBookingTime) {
      return NextResponse.json(
        { error: `Booking requires at least ${meetingType.advanceNoticeHours} hours advance notice` },
        { status: 400 }
      );
    }

    // Check daily limit
    const withinDailyLimit = await checkDailyLimit(
      user.id,
      meetingType.id,
      scheduledTime
    );

    if (!withinDailyLimit) {
      return NextResponse.json(
        { error: "Daily booking limit reached for this date" },
        { status: 400 }
      );
    }

    // Check for conflicts
    const conflictingBookings = await db
      .select()
      .from(bookings)
      .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
      .where(
        and(
          eq(meetingTypes.userId, user.id),
          eq(bookings.status, "confirmed"),
          eq(bookings.scheduledTime, scheduledTime)
        )
      );

    if (conflictingBookings.length > 0) {
      return NextResponse.json(
        { error: "Time slot is no longer available" },
        { status: 409 }
      );
    }

    // Create booking
    const [newBooking] = await db
      .insert(bookings)
      .values({
        meetingTypeId: data.meetingTypeId,
        inviteeName: data.inviteeName,
        inviteeEmail: data.inviteeEmail,
        inviteePhone: data.inviteePhone,
        scheduledTime,
        status: "confirmed",
      })
      .returning();

    if (!newBooking) {
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Create Google Calendar event if user has calendar connected
    let calendarEventId: string | null = null;
    if (user.calendarConnected && user.calendarAccessToken) {
      try {
        const googleCalendar = new GoogleCalendarService();
        googleCalendar.setCredentials(
          user.calendarAccessToken,
          user.calendarRefreshToken || undefined
        );

        const calendarEvent = {
          summary: meetingType.name,
          description: `Meeting with ${data.inviteeName} (${data.inviteeEmail})${
            meetingType.description ? `\n\n${meetingType.description}` : ""
          }`,
          start: {
            dateTime: scheduledTime.toISOString(),
            timeZone: user.timezone,
          },
          end: {
            dateTime: new Date(scheduledTime.getTime() + meetingType.durationMinutes * 60 * 1000).toISOString(),
            timeZone: user.timezone,
          },
          attendees: [
            {
              email: data.inviteeEmail,
              displayName: data.inviteeName,
            },
          ],
          conferenceData: meetingType.locationType === "video" ? {
            createRequest: {
              requestId: `meet-${newBooking.id}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet" as const,
              },
            },
          } : undefined,
        };

        calendarEventId = await googleCalendar.createEvent(calendarEvent);
        
        // Update booking with calendar event ID
        if (calendarEventId) {
          await db
            .update(bookings)
            .set({ calendarEventId })
            .where(eq(bookings.id, newBooking.id));
        }
      } catch (error) {
        console.error("Failed to create calendar event:", error);
        // Continue without calendar event - don't fail the booking
      }
    }

    // Send confirmation emails
    try {
      const emailService = new EmailService();
      await emailService.sendBookingConfirmation({
        hostName: user.username,
        hostEmail: user.email,
        inviteeName: data.inviteeName,
        inviteeEmail: data.inviteeEmail,
        meetingTitle: meetingType.name,
        duration: meetingType.durationMinutes,
        scheduledTime,
        locationType: meetingType.locationType,
        locationDetails: meetingType.locationDetails || undefined,
        bookingId: newBooking.id,
        username: user.username,
      });
    } catch (error) {
      console.error("Failed to send confirmation emails:", error);
      // Continue without emails - don't fail the booking
    }

    return NextResponse.json(
      { 
        booking: {
          ...newBooking,
          calendarEventId,
          meetingType: {
            name: meetingType.name,
            durationMinutes: meetingType.durationMinutes,
            locationType: meetingType.locationType,
            locationDetails: meetingType.locationDetails || undefined,
          },
          user: {
            username: user.username,
            email: user.email,
          },
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create booking error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}