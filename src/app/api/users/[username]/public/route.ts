import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { users, meetingTypes } from "~/server/db/schema";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    // Get user data
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        // Don't expose email or other sensitive info
      })
      .from(users)
      .where(eq(users.username, (await context.params).username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get active meeting types
    const userMeetingTypes = await db
      .select({
        id: meetingTypes.id,
        name: meetingTypes.name,
        durationMinutes: meetingTypes.durationMinutes,
        description: meetingTypes.description,
        locationType: meetingTypes.locationType,
        locationDetails: meetingTypes.locationDetails,
      })
      .from(meetingTypes)
      .where(
        and(
          eq(meetingTypes.userId, user.id),
          eq(meetingTypes.active, true)
        )
      )
      .orderBy(meetingTypes.createdAt);

    return NextResponse.json({
      user,
      meetingTypes: userMeetingTypes,
    });
  } catch (error) {
    console.error("Get public user data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}