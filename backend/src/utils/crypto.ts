import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Encrypt sensitive data (like Shopify access tokens)
 */
export const encrypt = (text: string): string => {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from encryption key using PBKDF2
  const key = crypto.pbkdf2Sync(
    env.ENCRYPTION_KEY,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the text
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  
  // Get auth tag
  const tag = cipher.getAuthTag();
  
  // Combine all parts: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  
  return result.toString('base64');
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedText: string): string => {
  // Decode from base64
  const buffer = Buffer.from(encryptedText, 'base64');
  
  // Extract parts
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  // Derive key
  const key = crypto.pbkdf2Sync(
    env.ENCRYPTION_KEY,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
};

/**
 * Verify Shopify webhook HMAC signature
 */
export const verifyShopifyWebhook = (
  body: string,
  hmacHeader: string,
  secret: string
): boolean => {
  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac),
    Buffer.from(hmacHeader)
  );
};

/**
 * Generate a random token (for webhook secrets, etc.)
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a value using SHA256
 */
export const hashSHA256 = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};



