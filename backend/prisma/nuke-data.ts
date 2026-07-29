import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  WARNING: This will DELETE all data except Admin login accounts!\n');

  try {
    // Delete in correct order respecting foreign key constraints

    // 1. EmailLog (references Employee + Payslip)
    const emailLogs = await prisma.emailLog.deleteMany();
    console.log(`✓ Deleted ${emailLogs.count} EmailLog records`);

    // 2. GeneratedPayslip (references Payslip + Employee + Admin)
    const generatedPayslips = await prisma.generatedPayslip.deleteMany();
    console.log(`✓ Deleted ${generatedPayslips.count} GeneratedPayslip records`);

    // 3. ParsedSalaryData (references UploadedFile + Employee)
    const parsedSalaryData = await prisma.parsedSalaryData.deleteMany();
    console.log(`✓ Deleted ${parsedSalaryData.count} ParsedSalaryData records`);

    // 4. Attendance (references Employee)
    const attendance = await prisma.attendance.deleteMany();
    console.log(`✓ Deleted ${attendance.count} Attendance records`);

    // 5. AttendanceSummary (references Employee)
    const attendanceSummary = await prisma.attendanceSummary.deleteMany();
    console.log(`✓ Deleted ${attendanceSummary.count} AttendanceSummary records`);

    // 6. Payslip (references Employee)
    const payslips = await prisma.payslip.deleteMany();
    console.log(`✓ Deleted ${payslips.count} Payslip records`);

    // 7. SalaryHistory (references Employee)
    const salaryHistory = await prisma.salaryHistory.deleteMany();
    console.log(`✓ Deleted ${salaryHistory.count} SalaryHistory records`);

    // 8. Employee (no more child references)
    const employees = await prisma.employee.deleteMany();
    console.log(`✓ Deleted ${employees.count} Employee records`);

    // 9. UploadedFile (no more child references after ParsedSalaryData deleted)
    const uploadedFiles = await prisma.uploadedFile.deleteMany();
    console.log(`✓ Deleted ${uploadedFiles.count} UploadedFile records`);

    // 10. JibbleSyncHistory (no foreign key references)
    const jibbleSyncHistory = await prisma.jibbleSyncHistory.deleteMany();
    console.log(`✓ Deleted ${jibbleSyncHistory.count} JibbleSyncHistory records`);

    // 11. Designation (references Department)
    const designations = await prisma.designation.deleteMany();
    console.log(`✓ Deleted ${designations.count} Designation records`);

    // 12. Department
    const departments = await prisma.department.deleteMany();
    console.log(`✓ Deleted ${departments.count} Department records`);

    // 13. SMTPConfig
    const smtpConfigs = await prisma.sMTPConfig.deleteMany();
    console.log(`✓ Deleted ${smtpConfigs.count} SMTPConfig records`);

    // 14. CompanyProfile
    const companyProfiles = await prisma.companyProfile.deleteMany();
    console.log(`✓ Deleted ${companyProfiles.count} CompanyProfile records`);

    // 15. Setting
    const settings = await prisma.setting.deleteMany();
    console.log(`✓ Deleted ${settings.count} Setting records`);

    // 16. AuditLog (references Admin - but Admin is preserved)
    const auditLogs = await prisma.auditLog.deleteMany();
    console.log(`✓ Deleted ${auditLogs.count} AuditLog records`);

    // Re-seed config data
    console.log('\n📋 Re-seeding config data...');

    // Seed CompanyProfile
    const company = await prisma.companyProfile.create({
      data: {
        companyName: 'ShineCraft',
        address: '123 Business Park, Mumbai, India 400001',
        gstNumber: '27AABCU9603R1ZM',
        panNumber: 'AABCU9603R',
        phoneNumber: '+91 9876543210',
        email: 'info@shinecraft.com',
        website: 'https://shinecraft.com',
        authorizedSignatory: 'ShineCraft HR',
        footerText: 'This is a computer-generated payslip and does not require a physical signature.'
      }
    });
    console.log(`✓ Created CompanyProfile: ${company.companyName}`);

    // Seed Departments
    const departmentsData = [
      { name: 'Engineering', code: 'ENG', description: 'Software Engineering Department' },
      { name: 'Human Resources', code: 'HR', description: 'Human Resources Department' },
      { name: 'Finance', code: 'FIN', description: 'Finance and Accounting' },
      { name: 'Sales', code: 'SALES', description: 'Sales and Business Development' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing and Communications' },
      { name: 'Operations', code: 'OPS', description: 'Operations Department' },
      { name: 'IT', code: 'IT', description: 'Information Technology' },
      { name: 'Legal', code: 'LEGAL', description: 'Legal and Compliance' }
    ];

    for (const dept of departmentsData) {
      await prisma.department.create({ data: dept });
    }
    console.log(`✓ Created ${departmentsData.length} Departments`);

    // Seed Settings
    const settingsData = [
      { key: 'company_theme', value: 'light', category: 'theme', description: 'Application theme' },
      { key: 'default_currency', value: 'INR', category: 'finance', description: 'Default currency' },
      { key: 'financial_year_start', value: '2026-04-01', category: 'finance', description: 'Financial year start date' },
      { key: 'notification_enabled', value: 'true', category: 'notification', description: 'Enable notifications' },
      { key: 'default_pf_rate', value: '12', category: 'salary', description: 'Default PF contribution rate (%)' },
      { key: 'default_esi_rate', value: '0.75', category: 'salary', description: 'Default ESI contribution rate (%)' },
      { key: 'esi_salary_limit', value: '21000', category: 'salary', description: 'ESI applicable salary limit' },
      { key: 'pf_salary_limit', value: '15000', category: 'salary', description: 'PF applicable salary limit' }
    ];

    for (const setting of settingsData) {
      await prisma.setting.create({ data: setting });
    }
    console.log(`✓ Created ${settingsData.length} Settings`);

    // Show preserved Admin accounts
    const admins = await prisma.admin.findMany({
      select: { email: true, name: true, role: true }
    });
    console.log('\n🔒 Preserved Admin accounts:');
    admins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name}) [${admin.role}]`);
    });

    console.log('\n✅ Database reset complete! All data deleted except Admin login.');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Failed to reset database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
