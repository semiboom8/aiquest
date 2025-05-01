/**
 * @fileOverview Defines custom error classes used throughout the application.
 */

/**
 * Custom error class for rate limit exceeded errors.
 * This allows instanceof checks without exporting the class from a 'use server' file.
 */
export class RateLimitExceededError extends Error {
  constructor(message = 'Too many requests. Please wait a moment and try again.') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

// Add other custom error classes here if needed
