import { z } from 'zod';

export const parentMerchantSchema = z.object({
  parent_store_name: z.string().min(2, 'Store name is required'),
  registered_phone: z.string().min(8, 'Phone number is required'),
  merchant_type: z.enum(['LOCAL', 'BRAND']),
  owner_name: z.string().optional(),
  owner_email: z.string().email('Invalid email').optional(),
});

export type ParentMerchantInput = z.infer<typeof parentMerchantSchema>;
