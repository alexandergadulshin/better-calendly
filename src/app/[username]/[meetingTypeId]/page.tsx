"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface AvailableSlot {
  datetime: string;
  display: string;
}

interface MeetingType {
  id: number;
  name: string;
  durationMinutes: number;
  description: string;
  locationType: string;
  locationDetails: string;
}

export default function BookMeetingPage() {
  const params = useParams();
  const username = params.username as string;
  const meetingTypeId = parseInt(params.meetingTypeId as string);

  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (username && meetingTypeId) {
      fetchAvailability();
    }
  }, [username, meetingTypeId]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `/api/availability/${username}/${meetingTypeId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError("Meeting type not found");
        } else {
          setError("Failed to load availability");
        }
        return;
      }

      const data = await response.json();
      setAvailableSlots(data.availableSlots);
      
      // We should also get meeting type info, but for now let's create a simple one
      setMeetingType({
        id: meetingTypeId,
        name: "Meeting", // This should come from API
        durationMinutes: 30,
        description: "",
        locationType: "video",
        locationDetails: "",
      });
    } catch (error) {
      setError("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingTypeId,
          inviteeName: formData.name,
          inviteeEmail: formData.email,
          inviteePhone: formData.phone,
          scheduledTime: selectedSlot,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to book meeting");
      }

      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to book meeting");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading available times...</div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Booked!</h2>
          <p className="text-gray-600 mb-4">
            Your meeting has been successfully scheduled. You'll receive a confirmation email shortly.
          </p>
          <div className="bg-gray-50 p-4 rounded-md text-left">
            <p className="text-sm text-gray-600">
              <strong>When:</strong> {new Date(selectedSlot!).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Duration:</strong> {meetingType?.durationMinutes} minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const date = new Date(slot.datetime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date]!.push(slot);
    return acc;
  }, {} as Record<string, AvailableSlot[]>);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left side - Meeting info and form */}
            <div className="p-8 border-r border-gray-200">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {meetingType?.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span>⏱️ {meetingType?.durationMinutes} minutes</span>
                  <span>💻 Video call</span>
                </div>
                {meetingType?.description && (
                  <p className="text-gray-600">{meetingType.description}</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {selectedSlot && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <p className="text-sm font-medium text-indigo-900">Selected time:</p>
                    <p className="text-indigo-700">
                      {new Date(selectedSlot).toLocaleString()}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedSlot || submitting}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </form>
            </div>

            {/* Right side - Available times */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Select a time
              </h3>
              
              {Object.keys(slotsByDate).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No available times in the next 30 days.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {Object.entries(slotsByDate).map(([date, slots]) => (
                    <div key={date}>
                      <h4 className="font-medium text-gray-900 mb-3">{date}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.datetime}
                            onClick={() => setSelectedSlot(slot.datetime)}
                            className={`p-2 text-sm border rounded-md hover:bg-indigo-50 hover:border-indigo-300 ${
                              selectedSlot === slot.datetime
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-gray-700 border-gray-300"
                            }`}
                          >
                            {slot.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}