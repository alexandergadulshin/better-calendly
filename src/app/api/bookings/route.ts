import { NextRequest, NextResponse } from "next/server";

// GET /api/bookings - List bookings
export async function GET(request: NextRequest) {
  return NextResponse.json({
    bookings: [],
    message: "Booking system will be available when integrations are set up"
  });
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: "Booking creation will be available when integrations are set up",
    data: body,
    status: "pending_setup"
  });
}