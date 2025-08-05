import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { meetingTypes } from "~/server/db/schema";
import { requireAuth } from "~/lib/clerk-utils";

const createMeetingTypeSchema = z.object({
  name: z.string().min(1).max(255),
  durationMinutes: z.number().min(15).max(480), // 15 min to 8 hours
  description: z.string().optional(),
  advanceNoticeHours: z.number().min(1).max(720).default(2), // 1 hour to 30 days
  dailyLimit: z.number().min(1).max(20).optional(),
  locationType: z.enum(["phone", "video", "in_person"]).default("video"),
  locationDetails: z.string().optional(),
});

// GET /api/meeting-types - List user's meeting types
export async function GET() {
  try {
    const user = await requireAuth();
    
    const userMeetingTypes = await db
      .select()
      .from(meetingTypes)
      .where(eq(meetingTypes.userId, user.id))
      .orderBy(meetingTypes.createdAt);

    return NextResponse.json({ meetingTypes: userMeetingTypes });
  } catch (error) {
    console.error("Get meeting types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/meeting-types - Create new meeting type
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createMeetingTypeSchema.parse(body);

    // Check if user has reached the limit (3 meeting types for MVP)
    const existingCount = await db
      .select({ count: meetingTypes.id })
      .from(meetingTypes)
      .where(eq(meetingTypes.userId, user.id));

    if (existingCount.length >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 meeting types allowed in MVP" },
        { status: 400 }
      );
    }

    const [newMeetingType] = await db
      .insert(meetingTypes)
      .values({
        ...data,
        userId: user.id,
      })
      .returning();

    return NextResponse.json(
      { meetingType: newMeetingType },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create meeting type error:", error);
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