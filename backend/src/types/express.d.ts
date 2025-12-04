import { User, Tenant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        tenantId: string;
      };
      tenant?: {
        id: string;
        name: string;
        shopifyDomain: string;
        isActive: boolean;
      };
      rawBody?: string; // For webhook verification
    }
  }
}

export {};

