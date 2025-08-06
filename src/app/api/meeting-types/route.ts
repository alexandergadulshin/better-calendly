import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "~/lib/clerk-utils";
import { supabaseAdmin } from "~/lib/supabase";

const createMeetingTypeSchema = z.object({
  name: z.string().min(1).max(100),
  duration_minutes: z.number().min(15).max(240),
  description: z.string().optional(),
  location_type: z.enum(['zoom', 'google_meet', 'phone', 'in_person']),
  location_details: z.string().optional(),
});

// GET /api/meeting-types - List user's meeting types
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const { data: meetingTypes, error } = await supabaseAdmin
      .from('meeting_types')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: "Failed to fetch meeting types" },
        { status: 500 }
      );
    }

    return NextResponse.json({ meetingTypes });
  } catch (error) {
    console.error("Get meeting types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/meeting-types - Create meeting type
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = createMeetingTypeSchema.parse(body);

    const { data: newMeetingType, error } = await supabaseAdmin
      .from('meeting_types')
      .insert({
        ...data,
        user_id: user.id,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: "Failed to create meeting type" },
        { status: 500 }
      );
    }

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