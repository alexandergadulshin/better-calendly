import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export function createRateLimiter(options: RateLimitOptions) {
  return (request: NextRequest): boolean => {
    const clientIP = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    
    const now = Date.now();
    const key = clientIP;
    
    // Clean up expired entries
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
    
    const record = rateLimitMap.get(key);
    
    if (!record) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + options.windowMs;
      return true;
    }
    
    if (record.count >= options.maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  };
}

// Rate limiters for different endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

export const bookingRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 bookings per minute
});

export function withRateLimit(
  rateLimit: (request: NextRequest) => boolean,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> => {
    if (!rateLimit(request)) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }
    
    return handler(request, ...args);
  };
}

// Input validation helpers
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
}

// CSRF protection (simple token-based)
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// Security headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;"
  );
  
  return response;
}