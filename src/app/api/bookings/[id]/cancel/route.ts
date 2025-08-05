import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { bookings, meetingTypes, users } from "~/server/db/schema";
import { requireAuth } from "~/lib/clerk-utils";
import { GoogleCalendarService } from "~/lib/google-calendar";
import { EmailService } from "~/lib/email";

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

// PUT /api/bookings/[id]/cancel - Cancel a booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason } = cancelBookingSchema.parse(body);

    // Check if booking exists and belongs to user
    const [bookingData] = await db
      .select({
        booking: bookings,
        meetingType: meetingTypes,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          calendarConnected: users.calendarConnected,
          calendarAccessToken: users.calendarAccessToken,
          calendarRefreshToken: users.calendarRefreshToken,
        },
      })
      .from(bookings)
      .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
      .innerJoin(users, eq(meetingTypes.userId, users.id))
      .where(
        and(
          eq(bookings.id, id),
          eq(meetingTypes.userId, user.id)
        )
      )
      .limit(1);

    if (!bookingData) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const { booking, meetingType, user: userData } = bookingData;

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    // Update booking status
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancellationReason: reason,
      })
      .where(eq(bookings.id, id))
      .returning();

    // Delete Google Calendar event if it exists
    if (booking.calendarEventId && userData.calendarConnected && userData.calendarAccessToken) {
      try {
        const googleCalendar = new GoogleCalendarService();
        googleCalendar.setCredentials(
          userData.calendarAccessToken,
          userData.calendarRefreshToken || undefined
        );
        await googleCalendar.deleteEvent(booking.calendarEventId);
      } catch (error) {
        console.error("Failed to delete calendar event:", error);
        // Continue - don't fail the cancellation
      }
    }

    // Send cancellation emails
    try {
      const emailService = new EmailService();
      await emailService.sendCancellationEmail({
        hostName: userData.username,
        hostEmail: userData.email,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        meetingTitle: meetingType.name,
        duration: meetingType.durationMinutes,
        scheduledTime: new Date(booking.scheduledTime),
        locationType: meetingType.locationType,
        locationDetails: meetingType.locationDetails || undefined,
        bookingId: booking.id,
        username: userData.username,
      }, reason);
    } catch (error) {
      console.error("Failed to send cancellation emails:", error);
      // Continue - don't fail the cancellation
    }

    return NextResponse.json({
      booking: updatedBooking,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
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