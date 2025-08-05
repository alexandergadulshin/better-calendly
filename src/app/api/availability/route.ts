import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { availability } from "~/server/db/schema";
import { requireAuth } from "~/lib/clerk-utils";

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: z.string().regex(timeRegex, "Time must be in HH:MM format"),
  endTime: z.string().regex(timeRegex, "Time must be in HH:MM format"),
  active: z.boolean().default(true),
});

const setAvailabilitySchema = z.object({
  availability: z.array(availabilitySlotSchema),
});

// GET /api/availability - Get user's availability
export async function GET() {
  try {
    const user = await requireAuth();
    
    const userAvailability = await db
      .select()
      .from(availability)
      .where(eq(availability.userId, user.id))
      .orderBy(availability.dayOfWeek, availability.startTime);

    return NextResponse.json({ availability: userAvailability });
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/availability - Set user's availability (replace all)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { availability: availabilitySlots } = setAvailabilitySchema.parse(body);

    // Validate time ranges
    for (const slot of availabilitySlots) {
      const startTimeParts = slot.startTime.split(":").map(Number);
      const endTimeParts = slot.endTime.split(":").map(Number);
      
      if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
        return NextResponse.json(
          { error: "Invalid time format" },
          { status: 400 }
        );
      }
      
      const [startHour, startMin] = startTimeParts;
      const [endHour, endMin] = endTimeParts;
      
      const startMinutes = startHour! * 60 + startMin!;
      const endMinutes = endHour! * 60 + endMin!;
      
      if (startMinutes >= endMinutes) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    // Delete existing availability
    await db
      .delete(availability)
      .where(eq(availability.userId, user.id));

    // Insert new availability
    if (availabilitySlots.length > 0) {
      const newAvailability = await db
        .insert(availability)
        .values(
          availabilitySlots.map(slot => ({
            ...slot,
            userId: user.id,
          }))
        )
        .returning();

      return NextResponse.json({ availability: newAvailability });
    }

    return NextResponse.json({ availability: [] });
  } catch (error) {
    console.error("Set availability error:", error);
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