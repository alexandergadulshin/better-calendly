"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";

interface User {
  id: number;
  email: string;
  username: string;
  timezone: string;
  calendarConnected: boolean;
}

interface MeetingType {
  id: number;
  name: string;
  durationMinutes: number;
  active: boolean;
}

interface Booking {
  id: number;
  inviteeName: string;
  inviteeEmail: string;
  scheduledTime: string;
  status: string;
  meetingType: {
    name: string;
    durationMinutes: number;
  };
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    
    fetchDashboardData();
    
    // Check for OAuth callback messages
    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get('success');
    const errorMessage = urlParams.get('error');
    
    if (successMessage === 'calendar_connected') {
      // Show success message and refresh data
      fetchDashboardData();
      // Remove query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorMessage) {
      setError(`Authentication failed: ${errorMessage.replace(/_/g, ' ')}`);
      // Remove query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user data
      const userResponse = await fetch("/api/user/me");
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push("/sign-in");
          return;
        }
        throw new Error("Failed to fetch user data");
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      // Fetch meeting types
      const meetingTypesResponse = await fetch("/api/meeting-types");
      if (meetingTypesResponse.ok) {
        const meetingTypesData = await meetingTypesResponse.json();
        setMeetingTypes(meetingTypesData.meetingTypes);
      }

      // Fetch upcoming bookings
      const bookingsResponse = await fetch("/api/bookings?status=confirmed&limit=5");
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setUpcomingBookings(bookingsData.bookings.filter((booking: Booking) => 
          new Date(booking.scheduledTime) > new Date()
        ));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load dashboard");
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
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">@{user?.username}</span>
              <SignOutButton>
                <button className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700">
                  Logout
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{meetingTypes.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Meeting Types
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {meetingTypes.filter(mt => mt.active).length} active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{upcomingBookings.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Upcoming Meetings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Next 7 days
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 ${user?.calendarConnected ? 'bg-green-500' : 'bg-red-500'} rounded-md flex items-center justify-center`}>
                        <span className="text-white text-xs">
                          {user?.calendarConnected ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Google Calendar
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {user?.calendarConnected ? 'Connected' : 'Not Connected'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  {!user?.calendarConnected && (
                    <button
                      onClick={() => window.location.href = '/api/auth/google'}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/meeting-types"
                  className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors"
                >
                  <div className="text-indigo-600 font-medium">Manage Meeting Types</div>
                  <div className="text-sm text-gray-600 mt-1">Create and edit your meeting types</div>
                </Link>
                
                <Link
                  href="/availability"
                  className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                >
                  <div className="text-green-600 font-medium">Set Availability</div>
                  <div className="text-sm text-gray-600 mt-1">Configure your working hours</div>
                </Link>
                
                <Link
                  href="/bookings"
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                >
                  <div className="text-blue-600 font-medium">View Bookings</div>
                  <div className="text-sm text-gray-600 mt-1">See all your scheduled meetings</div>
                </Link>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-400 font-medium">Your Booking Link</div>
                  <div className="text-sm text-gray-600 mt-1 break-all">
                    calendly.com/{user?.username}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Upcoming Meetings
              </h3>
              {upcomingBookings.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No upcoming meetings scheduled
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{booking.meetingType.name}</h4>
                          <p className="text-sm text-gray-600">with {booking.inviteeName}</p>
                          <p className="text-sm text-gray-500">{booking.inviteeEmail}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(booking.scheduledTime).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(booking.scheduledTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.meetingType.durationMinutes}m
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}