import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  try {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@shinecraft.com' },
      update: {},
      create: {
        email: 'admin@shinecraft.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      }
    });
    console.log(`Admin created: ${admin.email}`);

    const existingCompany = await prisma.companyProfile.findFirst();
    let company;
    if (existingCompany) {
      company = await prisma.companyProfile.update({
        where: { id: existingCompany.id },
        data: {
          companyName: 'Shine Craft',
          nameLine2: 'technologies',
          tagline: 'CREATE | CRAFT | CONNECT',
          address: '123 Business Park, Mumbai, India 400001',
          gstNumber: '27AABCU9603R1ZM',
          panNumber: 'AABCU9603R',
          phoneNumber: '+91 9876543210',
          email: 'info@shinecraft.com',
          website: 'www.shinecrafttechnologies.com',
          authorizedSignatory: 'ShineCraft HR',
          footerText: 'This is a computer-generated payslip and does not require a physical signature.'
        }
      });
    } else {
      company = await prisma.companyProfile.create({
        data: {
          companyName: 'Shine Craft',
          nameLine2: 'technologies',
          tagline: 'CREATE | CRAFT | CONNECT',
          address: '123 Business Park, Mumbai, India 400001',
          gstNumber: '27AABCU9603R1ZM',
          panNumber: 'AABCU9603R',
          phoneNumber: '+91 9876543210',
          email: 'info@shinecraft.com',
          website: 'www.shinecrafttechnologies.com',
          authorizedSignatory: 'ShineCraft HR',
          footerText: 'This is a computer-generated payslip and does not require a physical signature.'
        }
      });
    }
    console.log(`Company profile created: ${company.companyName}`);

    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Software Engineering Department' },
      { name: 'Human Resources', code: 'HR', description: 'Human Resources Department' },
      { name: 'Finance', code: 'FIN', description: 'Finance and Accounting' },
      { name: 'Sales', code: 'SALES', description: 'Sales and Business Development' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing and Communications' },
      { name: 'Operations', code: 'OPS', description: 'Operations Department' },
      { name: 'IT', code: 'IT', description: 'Information Technology' },
      { name: 'Legal', code: 'LEGAL', description: 'Legal and Compliance' }
    ];

    for (const dept of departments) {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: dept
      });
    }
    console.log(`${departments.length} departments created`);

    const settings = [
      { key: 'company_theme', value: 'light', category: 'theme', description: 'Application theme' },
      { key: 'default_currency', value: 'INR', category: 'finance', description: 'Default currency' },
      { key: 'financial_year_start', value: '2026-04-01', category: 'finance', description: 'Financial year start date' },
      { key: 'notification_enabled', value: 'true', category: 'notification', description: 'Enable notifications' },
      { key: 'default_pf_rate', value: '12', category: 'salary', description: 'Default PF contribution rate (%)' },
      { key: 'default_esi_rate', value: '0.75', category: 'salary', description: 'Default ESI contribution rate (%)' },
      { key: 'esi_salary_limit', value: '21000', category: 'salary', description: 'ESI applicable salary limit' },
      { key: 'pf_salary_limit', value: '15000', category: 'salary', description: 'PF applicable salary limit' }
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting
      });
    }
    console.log(`${settings.length} settings created`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
