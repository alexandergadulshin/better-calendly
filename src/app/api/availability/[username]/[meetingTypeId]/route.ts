import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "~/lib/availability";

// GET /api/availability/[username]/[meetingTypeId] - Get available slots for booking
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string; meetingTypeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("start");
    const endDateParam = searchParams.get("end");

    const params = await context.params;
    const meetingTypeId = parseInt(params.meetingTypeId);
    if (isNaN(meetingTypeId)) {
      return NextResponse.json(
        { error: "Invalid meeting type ID" },
        { status: 400 }
      );
    }

    // Default to next 30 days if dates not provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const endDate = endDateParam 
      ? new Date(endDateParam) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const availableSlots = await getAvailableSlots(
      params.username,
      meetingTypeId,
      startDate,
      endDate
    );

    return NextResponse.json({ 
      availableSlots,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}