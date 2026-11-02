import { z } from 'zod';

export const CATEGORIES = ['Dairy', 'Meat', 'Vegetables', 'Fruit', 'Bakery', 'Frozen', 'Drinks', 'Other'];
export const STATUSES = ['active', 'used', 'wasted'];

// A real calendar date in YYYY-MM-DD form. Rejects values like 2026-02-30.
const isoDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, 'must be a valid date in YYYY-MM-DD format');

const name = z.string().trim().min(1, 'is required').max(100, 'must be 100 characters or fewer');
const email = z.string().trim().toLowerCase().email('must be a valid email').max(254);

export const registerSchema = z.object({
  email,
  // bcrypt only uses the first 72 bytes, so longer passwords are refused.
  password: z.string().min(8, 'must be at least 8 characters').max(72, 'must be 72 characters or fewer'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'is required').max(72),
});

export const createItemSchema = z.object({
  name,
  expiryDate: isoDate,
  category: z.enum(CATEGORIES).nullable().optional(),
});

export const updateItemSchema = z
  .object({
    name: name.optional(),
    expiryDate: isoDate.optional(),
    category: z.enum(CATEGORIES).nullable().optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'at least one field is required');
