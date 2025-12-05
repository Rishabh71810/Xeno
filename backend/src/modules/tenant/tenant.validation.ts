import { z } from 'zod';

// Update tenant schema
export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name too long')
    .optional(),
  shopifyAccessToken: z
    .string()
    .min(1, 'Shopify access token cannot be empty')
    .optional(),
  shopifyApiKey: z
    .string()
    .optional()
    .nullable(),
  shopifyApiSecret: z
    .string()
    .optional()
    .nullable(),
  webhookSecret: z
    .string()
    .optional()
    .nullable(),
});

// Update Shopify credentials schema
export const updateShopifyCredentialsSchema = z.object({
  shopifyDomain: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
      'Invalid Shopify domain. Format: your-store.myshopify.com'
    )
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  shopifyAccessToken: z
    .string()
    .min(1, 'Shopify access token is required'),
  shopifyApiKey: z
    .string()
    .optional(),
  shopifyApiSecret: z
    .string()
    .optional(),
});

// Invite user to tenant schema
export const inviteUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.toLowerCase().trim()),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  role: z
    .enum(['ADMIN', 'MANAGER', 'VIEWER'], {
      errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or VIEWER' }),
    })
    .default('VIEWER'),
});

// Update user role schema
export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or VIEWER' }),
  }),
});

// Query params for listing
export const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v > 0, 'Page must be positive'),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .refine((v) => v > 0 && v <= 100, 'Limit must be between 1 and 100'),
  search: z.string().optional(),
});

// Type exports
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type UpdateShopifyCredentialsInput = z.infer<typeof updateShopifyCredentialsSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;



