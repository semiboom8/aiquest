// src/lib/rate-limiter.ts
'use server'; // Needs to run server-side

import { RateLimitExceededError } from './errors'; // Import the custom error

// WARNING: This is a very basic in-memory rate limiter suitable for demonstration
// purposes or single-instance deployments ONLY. It does not scale across multiple
// server instances and resets on server restarts. For production, consider using
// a solution like Redis with `upstash/ratelimit`.

const requestTimestamps: number[] = [];
const MAX_REQUESTS = 10; // Allow 10 requests...
const TIME_WINDOW_MS = 15 * 1000; // ...within a 15-second window (globally)


/**
 * Checks if the global request rate limit has been exceeded.
 * If the limit is exceeded, it throws a RateLimitExceededError.
 * Otherwise, it records the current request timestamp.
 */
export async function checkRateLimit() { // Make the function async
  const now = Date.now();

  // Remove timestamps older than the time window
  while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - TIME_WINDOW_MS) {
    requestTimestamps.shift();
  }

  // Check if the limit is exceeded
  if (requestTimestamps.length >= MAX_REQUESTS) {
    console.warn(`Rate limit exceeded. Requests in window: ${requestTimestamps.length}`);
    const timeToWait = Math.ceil((requestTimestamps[0] + TIME_WINDOW_MS - now) / 1000);
    throw new RateLimitExceededError(`Too many requests. Please wait about ${timeToWait} seconds and try again.`);
  }

  // Add the current timestamp
  requestTimestamps.push(now);
  // console.log(`Rate limiter check: ${requestTimestamps.length}/${MAX_REQUESTS} requests in last ${TIME_WINDOW_MS / 1000}s`);
}
