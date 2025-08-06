import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { meetingTypes } from "~/server/db/schema";


const updateMeetingTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  durationMinutes: z.number().min(15).max(480).optional(),
  description: z.string().optional(),
  advanceNoticeHours: z.number().min(1).max(720).optional(),
  dailyLimit: z.number().min(1).max(20).optional(),
  locationType: z.enum(["phone", "video", "in_person"]).optional(),
  locationDetails: z.string().optional(),
  active: z.boolean().optional(),
});

// GET /api/meeting-types/[id] - Get specific meeting type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication when Clerk integration is set up
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid meeting type ID" },
        { status: 400 }
      );
    }

    const [meetingType] = await db
      .select()
      .from(meetingTypes)
      .where(
        and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.userId, 1 /* TODO: Replace with actual user ID when auth is set up */)
        )
      )
      .limit(1);

    if (!meetingType) {
      return NextResponse.json(
        { error: "Meeting type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ meetingType });
  } catch (error) {
    console.error("Get meeting type error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/meeting-types/[id] - Update meeting type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication when Clerk integration is set up
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid meeting type ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateMeetingTypeSchema.parse(body);

    // Check if meeting type exists and belongs to user
    const [existingMeetingType] = await db
      .select()
      .from(meetingTypes)
      .where(
        and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.userId, 1 /* TODO: Replace with actual user ID when auth is set up */)
        )
      )
      .limit(1);

    if (!existingMeetingType) {
      return NextResponse.json(
        { error: "Meeting type not found" },
        { status: 404 }
      );
    }

    const [updatedMeetingType] = await db
      .update(meetingTypes)
      .set(data)
      .where(eq(meetingTypes.id, id))
      .returning();

    return NextResponse.json({ meetingType: updatedMeetingType });
  } catch (error) {
    console.error("Update meeting type error:", error);
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

// DELETE /api/meeting-types/[id] - Delete meeting type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication when Clerk integration is set up
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid meeting type ID" },
        { status: 400 }
      );
    }

    // Check if meeting type exists and belongs to user
    const [existingMeetingType] = await db
      .select()
      .from(meetingTypes)
      .where(
        and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.userId, 1 /* TODO: Replace with actual user ID when auth is set up */)
        )
      )
      .limit(1);

    if (!existingMeetingType) {
      return NextResponse.json(
        { error: "Meeting type not found" },
        { status: 404 }
      );
    }

    await db
      .delete(meetingTypes)
      .where(eq(meetingTypes.id, id));

    return NextResponse.json({ message: "Meeting type deleted successfully" });
  } catch (error) {
    console.error("Delete meeting type error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}