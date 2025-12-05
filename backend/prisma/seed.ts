import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { shopifyDomain: 'demo-store.myshopify.com' },
    update: {},
    create: {
      name: 'Demo Store',
      shopifyDomain: 'demo-store.myshopify.com',
      shopifyAccessToken: 'demo-access-token-replace-with-real-one',
      shopifyApiKey: 'demo-api-key',
      shopifyApiSecret: 'demo-api-secret',
      isActive: true,
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      passwordHash,
      name: 'Manager User',
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  console.log(`✅ Created manager user: ${managerUser.email}`);

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@demo.com' },
    update: {},
    create: {
      email: 'viewer@demo.com',
      passwordHash,
      name: 'Viewer User',
      role: UserRole.VIEWER,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  console.log(`✅ Created viewer user: ${viewerUser.email}`);

  // Create some demo customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '1001' } },
      update: {},
      create: {
        shopifyId: '1001',
        tenantId: tenant.id,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        totalSpent: 1500.00,
        totalOrders: 5,
        acceptsMarketing: true,
        defaultAddressCity: 'New York',
        defaultAddressCountry: 'United States',
        shopifyCreatedAt: new Date('2024-01-15'),
      },
    }),
    prisma.customer.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '1002' } },
      update: {},
      create: {
        shopifyId: '1002',
        tenantId: tenant.id,
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        totalSpent: 2300.50,
        totalOrders: 8,
        acceptsMarketing: false,
        defaultAddressCity: 'Los Angeles',
        defaultAddressCountry: 'United States',
        shopifyCreatedAt: new Date('2024-02-20'),
      },
    }),
    prisma.customer.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '1003' } },
      update: {},
      create: {
        shopifyId: '1003',
        tenantId: tenant.id,
        email: 'bob.wilson@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        totalSpent: 750.00,
        totalOrders: 3,
        acceptsMarketing: true,
        defaultAddressCity: 'Chicago',
        defaultAddressCountry: 'United States',
        shopifyCreatedAt: new Date('2024-03-10'),
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} demo customers`);

  // Create some demo products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '2001' } },
      update: {},
      create: {
        shopifyId: '2001',
        tenantId: tenant.id,
        title: 'Premium T-Shirt',
        description: 'High-quality cotton t-shirt',
        vendor: 'FashionBrand',
        productType: 'Apparel',
        status: 'active',
        totalInventory: 100,
        minPrice: 29.99,
        maxPrice: 34.99,
        shopifyCreatedAt: new Date('2024-01-01'),
      },
    }),
    prisma.product.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '2002' } },
      update: {},
      create: {
        shopifyId: '2002',
        tenantId: tenant.id,
        title: 'Classic Jeans',
        description: 'Comfortable denim jeans',
        vendor: 'FashionBrand',
        productType: 'Apparel',
        status: 'active',
        totalInventory: 75,
        minPrice: 59.99,
        maxPrice: 79.99,
        shopifyCreatedAt: new Date('2024-01-01'),
      },
    }),
    prisma.product.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '2003' } },
      update: {},
      create: {
        shopifyId: '2003',
        tenantId: tenant.id,
        title: 'Running Shoes',
        description: 'Lightweight running shoes',
        vendor: 'SportsCo',
        productType: 'Footwear',
        status: 'active',
        totalInventory: 50,
        minPrice: 89.99,
        maxPrice: 119.99,
        shopifyCreatedAt: new Date('2024-01-01'),
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} demo products`);

  // Create some demo orders
  const orders = await Promise.all([
    prisma.order.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '3001' } },
      update: {},
      create: {
        shopifyId: '3001',
        tenantId: tenant.id,
        customerId: customers[0].id,
        orderNumber: 1001,
        name: '#1001',
        email: 'john.doe@example.com',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        currency: 'USD',
        totalPrice: 89.98,
        subtotalPrice: 84.98,
        totalTax: 5.00,
        itemCount: 2,
        shippingCity: 'New York',
        shippingCountry: 'United States',
        shopifyCreatedAt: new Date('2024-06-01'),
      },
    }),
    prisma.order.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '3002' } },
      update: {},
      create: {
        shopifyId: '3002',
        tenantId: tenant.id,
        customerId: customers[1].id,
        orderNumber: 1002,
        name: '#1002',
        email: 'jane.smith@example.com',
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        currency: 'USD',
        totalPrice: 179.98,
        subtotalPrice: 169.98,
        totalTax: 10.00,
        itemCount: 3,
        shippingCity: 'Los Angeles',
        shippingCountry: 'United States',
        shopifyCreatedAt: new Date('2024-06-15'),
      },
    }),
    prisma.order.upsert({
      where: { tenantId_shopifyId: { tenantId: tenant.id, shopifyId: '3003' } },
      update: {},
      create: {
        shopifyId: '3003',
        tenantId: tenant.id,
        customerId: customers[2].id,
        orderNumber: 1003,
        name: '#1003',
        email: 'bob.wilson@example.com',
        financialStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        currency: 'USD',
        totalPrice: 119.99,
        subtotalPrice: 109.99,
        totalTax: 10.00,
        itemCount: 1,
        shippingCity: 'Chicago',
        shippingCountry: 'United States',
        shopifyCreatedAt: new Date('2024-06-20'),
      },
    }),
  ]);

  console.log(`✅ Created ${orders.length} demo orders`);

  console.log('');
  console.log('🎉 Database seed completed!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Admin: admin@demo.com / password123');
  console.log('  Manager: manager@demo.com / password123');
  console.log('  Viewer: viewer@demo.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


