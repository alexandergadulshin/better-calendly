"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface MeetingType {
  id: number;
  name: string;
  durationMinutes: number;
  description: string;
  locationType: string;
  locationDetails: string;
}

interface User {
  id: number;
  email: string;
  username: string;
}

export default function UserBookingPage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (username) {
      fetchUserData();
    }
  }, [username]);

  const fetchUserData = async () => {
    try {
      // For now, we'll need to create an endpoint to get public user info
      // This is a simplified version - you'd want to create /api/users/[username]/public
      const response = await fetch(`/api/users/${username}/public`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found");
        } else {
          setError("Failed to load user data");
        }
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setMeetingTypes(data.meetingTypes);
    } catch (error) {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book a meeting with {user?.username}
          </h1>
          <p className="text-gray-600">
            Select a meeting type to see available times
          </p>
        </div>

        {/* Meeting Types */}
        <div className="space-y-6">
          {meetingTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No meeting types available at the moment.</p>
            </div>
          ) : (
            meetingTypes.map((meetingType) => (
              <div
                key={meetingType.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  window.location.href = `/${username}/${meetingType.id}`;
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {meetingType.name}
                    </h3>
                    {meetingType.description && (
                      <p className="text-gray-600 mb-4">
                        {meetingType.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="mr-1">⏱️</span>
                        {meetingType.durationMinutes} minutes
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">
                          {meetingType.locationType === "video" ? "💻" : 
                           meetingType.locationType === "phone" ? "📞" : "📍"}
                        </span>
                        {meetingType.locationType === "video" ? "Video call" :
                         meetingType.locationType === "phone" ? "Phone call" : "In person"}
                      </div>
                    </div>
                  </div>
                  <div className="ml-6">
                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                      Select
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by Better Calendly</p>
        </div>
      </div>
    </div>
  );
}