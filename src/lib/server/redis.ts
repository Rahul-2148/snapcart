// src/lib/server/redis.ts
import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

const getRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_URL/UPSTASH_REDIS_TOKEN are not configured",
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
};

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedisClient() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as Redis;

export interface OTPData {
  email: string;
  otp: string;
  createdAt: number;
  attempts: number;
}

export interface ResetTokenData {
  email: string;
  type: "otp" | "link";
  createdAt: number;
  verified: boolean;
}

// OTP operations
export async function generateAndStoreOTP(
  email: string,
  expiryMinutes: number = 10
): Promise<string> {
  const otp = generateOTP();
  const otpData: OTPData = {
    email,
    otp,
    createdAt: Date.now(),
    attempts: 0,
  };

  // Store OTP with expiry
  await redis.setex(
    `otp:${email}`,
    expiryMinutes * 60,
    JSON.stringify(otpData)
  );

  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<{ success: boolean; attemptsRemaining: number; locked: boolean; lockTimeRemaining: number }> {
  // Check if account is locked FIRST
  const lockStatus = await isOTPLocked(email);
  if (lockStatus.locked) {
    return { success: false, attemptsRemaining: 0, locked: true, lockTimeRemaining: lockStatus.remainingTime };
  }

  const otpData = await redis.get(`otp:${email}`);

  if (!otpData) {
    return { success: false, attemptsRemaining: 0, locked: false, lockTimeRemaining: 0 };
  }

  const data = typeof otpData === "string" ? JSON.parse(otpData) : otpData;
  const otpTimestamp = data.createdAt;
  const currentTime = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes

  // Check if OTP has expired
  if (currentTime - otpTimestamp > expiryTime) {
    await redis.del(`otp:${email}`);
    return { success: false, attemptsRemaining: 0, locked: false, lockTimeRemaining: 0 };
  }

  // Check if OTP matches
  if (data.otp === otp) {
    // Delete OTP and clear lock after successful verification
    await redis.del(`otp:${email}`);
    await redis.del(`otp_locked:${email}`); // Clear any existing lock
    return { success: true, attemptsRemaining: 0, locked: false, lockTimeRemaining: 0 };
  }

  // Increment attempt counter
  data.attempts += 1;
  const attemptsRemaining = Math.max(0, 5 - data.attempts);

  if (data.attempts >= 5) {
    // Lock after 5 attempts
    await redis.del(`otp:${email}`);
    await redis.setex(`otp_locked:${email}`, 15 * 60, "true"); // Lock for 15 minutes
    return { success: false, attemptsRemaining: 0, locked: true, lockTimeRemaining: 15 * 60 };
  }

  await redis.setex(
    `otp:${email}`,
    10 * 60,
    JSON.stringify(data)
  );
  return { success: false, attemptsRemaining, locked: false, lockTimeRemaining: 0 };
}

export async function isOTPLocked(email: string): Promise<{ locked: boolean; remainingTime: number }> {
  const lockData = await redis.get(`otp_locked:${email}`);
  
  if (!lockData) {
    return { locked: false, remainingTime: 0 };
  }

  const ttl = await redis.ttl(`otp_locked:${email}`);
  return { locked: true, remainingTime: Math.max(0, ttl) };
}

export async function deleteOTP(email: string): Promise<void> {
  await redis.del(`otp:${email}`);
}

// Reset token operations
export async function generateResetToken(
  email: string,
  type: "otp" | "link" = "link",
  expiryHours: number = 24
): Promise<string> {
  const token = generateRandomToken();
  const tokenData: ResetTokenData = {
    email,
    type,
    createdAt: Date.now(),
    verified: false,
  };

  await redis.setex(
    `reset:${token}`,
    expiryHours * 3600,
    JSON.stringify(tokenData)
  );

  return token;
}

export async function verifyResetToken(token: string): Promise<ResetTokenData | null> {
  const data = await redis.get(`reset:${token}`);

  if (!data) {
    return null;
  }

  const tokenData = typeof data === "string" ? JSON.parse(data) : data;
  const tokenTimestamp = tokenData.createdAt;
  const currentTime = Date.now();
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours

  if (currentTime - tokenTimestamp > expiryTime) {
    await redis.del(`reset:${token}`);
    return null;
  }

  return tokenData;
}

export async function markTokenAsVerified(token: string): Promise<void> {
  const data = await redis.get(`reset:${token}`);

  if (data) {
    const tokenData = typeof data === "string" ? JSON.parse(data) : data;
    tokenData.verified = true;
    await redis.setex(`reset:${token}`, 24 * 3600, JSON.stringify(tokenData));
  }
}

export async function deleteResetToken(token: string): Promise<void> {
  await redis.del(`reset:${token}`);
}

// Helper functions
function generateOTP(length: number = 6): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

function generateRandomToken(length: number = 32): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
}

// ==================== RATE LIMITING ====================

/**
 * Check and increment rate limit for forgot password requests
 * Allows 1 request per email every 5 minutes
 */
export async function checkForgotPasswordRateLimit(
  email: string,
  limitMinutes: number = 5
): Promise<{ allowed: boolean; remainingTime: number }> {
  const key = `rate:forgot-password:${email}`;
  const currentCount = await redis.get(key);

  if (!currentCount) {
    // First request or expired - allow and set counter
    await redis.setex(key, limitMinutes * 60, "1");
    return { allowed: true, remainingTime: 0 };
  }

  // Rate limit exceeded
  const ttl = await redis.ttl(key);
  return { allowed: false, remainingTime: ttl };
}

/**
 * Check and increment rate limit for resend OTP requests
 * Allows unlimited resends but with limit per hour
 * Limit: 5 resends per 1 hour
 */
export async function checkResendOTPRateLimit(
  email: string,
  limitPerHour: number = 5
): Promise<{ allowed: boolean; remainingTime: number; attemptsRemaining: number }> {
  const key = `rate:resend-otp:${email}`;
  const currentData = await redis.get(key);

  if (!currentData) {
    // First resend - allow and initialize
    await redis.setex(key, 3600, "1"); // 1 hour expiry
    return { allowed: true, remainingTime: 0, attemptsRemaining: limitPerHour - 1 };
  }

  const count = parseInt(typeof currentData === "string" ? currentData : String(currentData));

  if (count >= limitPerHour) {
    // Limit exceeded
    const ttl = await redis.ttl(key);
    return { allowed: false, remainingTime: ttl, attemptsRemaining: 0 };
  }

  // Increment and allow
  await redis.incr(key);
  const ttl = await redis.ttl(key);
  return { allowed: true, remainingTime: 0, attemptsRemaining: limitPerHour - count - 1 };
}

/**
 * IP-based rate limiting for forgot password endpoint
 * Prevents abuse from single IP address
 * Limit: 10 requests per 1 hour per IP
 */
export async function checkIPRateLimit(
  ip: string,
  limitPerHour: number = 10
): Promise<{ allowed: boolean; remainingTime: number }> {
  const key = `rate:ip:${ip}`;
  const currentCount = await redis.get(key);

  if (!currentCount) {
    // First request from this IP
    await redis.setex(key, 3600, "1");
    return { allowed: true, remainingTime: 0 };
  }

  const count = parseInt(typeof currentCount === "string" ? currentCount : String(currentCount));

  if (count >= limitPerHour) {
    // Limit exceeded
    const ttl = await redis.ttl(key);
    return { allowed: false, remainingTime: ttl };
  }

  // Increment and allow
  await redis.incr(key);
  return { allowed: true, remainingTime: 0 };
}

/**
 * Clear rate limit (useful after successful verification)
 */
export async function clearRateLimit(key: string): Promise<void> {
  await redis.del(key);
}

