export default function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Setup Required
          </h1>
          <p className="text-gray-600 mb-6">
            This application requires configuration of environment variables to function properly.
          </p>
          <div className="text-left space-y-2 text-sm text-gray-700">
            <p><strong>Required Services:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Clerk Authentication</li>
              <li>Vercel Postgres Database</li>
              <li>Google Calendar Integration (optional)</li>
              <li>Resend Email Service (optional)</li>
            </ul>
          </div>
          <div className="mt-6">
            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}