<div align="center">
  <h1>ShineCraft Payslip Generator</h1>
  <p><b>Full-stack employee payslip generation & management system</b></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js">
    <img src="https://img.shields.io/badge/Express.js-4.x-white?style=flat-square&logo=express" alt="Express.js">
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma" alt="Prisma">
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  </p>
</div>

---

## Overview

ShineCraft Payslip Generator is a production-ready full-stack application that streamlines **salary data processing**, **payslip generation**, **attendance tracking**, and **HR reporting**. Upload employee salary data in CSV or Excel format, and the system handles parsing, validation, payslip creation, and PDF export automatically.

## Tech Stack

| Layer      | Technology |
|-----------|------------|
| **Frontend**  | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query, Axios, Sonner |
| **Backend**   | Express.js 4, TypeScript, Prisma ORM, PostgreSQL, Multer, xlsx, csv-parser, JWT |
| **Auth**      | JWT-based authentication with admin role management & bcrypt password hashing |
| **APIs**      | RESTful architecture with Zod validation, rate limiting, and CORS |

## Features

- **Bulk Upload** — Parse employee salary data from CSV or Excel (standard & attendance-sheet formats)
- **Employee Management** — Full CRUD with auto-created records from uploads
- **Payslip Generation** — Generate, view, and manage payslips with PDF export
- **Attendance Tracking** — Track attendance summaries with LOP calculation
- **Dashboard & Reports** — Statistics, filtering, and reporting with data visualisation
- **Company Settings** — Configurable company profile and admin profile management
- **Email Integration** — SMTP-based payslip dispatch to employees
- **Jibble Integration** — OAuth2-based time tracking data import (optional)

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 14+ running locally or remotely
- **npm** 9+ or **yarn** 1.22+

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/karneish/Payslip-Generator.git
cd Payslip-Generator
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env        # configure your database and JWT settings
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                 # starts on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:3000
```

### 4. Default Credentials

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | `admin@shinecraft.com`  | `Admin@123` |

## Project Structure

```
payslip-shinecraft/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Seed data
│   └── src/
│       ├── config/                # Database, JWT configuration
│       ├── controllers/           # Request handlers
│       ├── middlewares/           # Auth, upload, error handling
│       ├── routes/                # Express route definitions
│       ├── services/              # Business logic layer
│       ├── utils/                 # Helpers (salary calc, date, logger)
│       ├── validators/            # Zod validation schemas
│       └── index.ts               # Express app entry point
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/         # Login page
│   │   └── (dashboard)/          # Upload, employees, payslips, reports...
│   ├── components/
│   │   ├── layout/               # Dashboard layout, sidebar, header
│   │   ├── employees/            # Employee form, view components
│   │   └── providers/            # React Query + Sonner provider
│   ├── hooks/                    # Zustand auth store, custom hooks
│   └── lib/                      # Axios instance, constants
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint           | Description            |
|--------|--------------------|------------------------|
| POST   | `/api/auth/login`  | Admin login            |
| GET    | `/api/auth/me`     | Get current admin      |

### Employees
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/employees`          | List employees           |
| GET    | `/api/employees/:id`      | Get employee details     |
| POST   | `/api/employees`          | Create employee          |
| PUT    | `/api/employees/:id`      | Update employee          |
| DELETE | `/api/employees/:id`      | Delete employee          |

### Uploads & Payslips
| Method | Endpoint                        | Description                     |
|--------|----------------------------------|---------------------------------|
| POST   | `/api/upload`                    | Upload salary data (CSV/Excel) |
| GET    | `/api/payslips`                  | List payslips                   |
| GET    | `/api/payslips/:id`              | Get payslip details             |
| GET    | `/api/payslips/:id/pdf`          | Download payslip as PDF         |
| POST   | `/api/payslips/bulk`             | Bulk generate payslips          |

### Reports & Settings
| Method | Endpoint                   | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/reports/dashboard`  | Dashboard statistics     |
| GET    | `/api/settings/company`   | Company profile          |
| PUT    | `/api/settings/company`   | Update company profile   |

## Supported Upload Formats

### Standard CSV
```csv
Employee Name, Employee ID, Basic Salary, Gross Salary, Net Salary, LOP Days, Working Days
John Doe, EMP001, 50000, 60000, 55000, 2, 28
```

### Attendance Sheet Format (per-employee blocks)
Each employee block consists of two lines:
1. **Header line** — Employee name, day numbers (1–31), labels like "Monthly Salary", "Net Salary"
2. **Data line** — Month prefix (e.g. `Feb-26`) followed by attendance markers (`P`/`H`/`PL`/`A`) and numeric values

Both formats are auto-detected and handled by a unified parser.

## Key Fixes

| File | Issue & Resolution |
|------|-------------------|
| `backend/src/services/upload.service.ts` | Employee name extraction now reads from header line instead of data line; empty comma-only lines filtered out |
| `backend/src/services/payslip.service.ts` | Removed `absentDays` variable name collision; inline `leaveDays + lopDays` calculation |
| `backend/src/index.ts` | Uses Prisma singleton from `config/database` instead of `new PrismaClient()` |
| `backend/prisma/seed.ts` | `findFirst` + conditional `create`/`update` avoids invalid UUID in `upsert` |
| `backend/src/routes/employee.routes.ts` | Relaxed Zod validation — phone, PAN, Aadhaar, bank fields optional with defaults |
| `backend/src/validators/employee.validator.ts` | Matching validation relaxation |
| `backend/src/services/employee.service.ts` | Default values for optional fields; duplicate check on non-empty fields only |
| `backend/src/controllers/upload.controller.ts` | `adminId` resolves from both `req.user?.id` and `req.admin?.id` |
| `backend/src/services/report.service.ts` | Case-insensitive employee status check (`'Active'`, `'ACTIVE'`, `'active'`) |
| `frontend/components/layout/dashboard-layout.tsx` | Sidebar margin dynamically switches between expanded (260px) and collapsed (72px) |
| `frontend/components/layout/sidebar.tsx` | Accepts `collapsed`/`onToggle` props instead of managing own state |
| `frontend/app/(dashboard)/upload/page.tsx` | Robust response parsing with fallback chain for `records` and `id` |

## Contributing

Contributions are welcome. Please ensure your code follows the existing style and includes appropriate type annotations. Open an issue first to discuss significant changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

<p align="center">Built with ❤️ by the ShineCraft team</p>
