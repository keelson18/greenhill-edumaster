# Greenhill Edu

You are an expert full-stack developer. Build a complete, modern School Management System called **EduMaster** based on the following detailed requirements.

### Product Overview

EduMaster is a web-based School Management System designed for Kenyan primary and junior secondary schools using the Competency-Based Curriculum (CBC). It must support grades PP1 to Grade 9, NEMIS numbers, Kenyan Shilling (KES), and CBC performance levels (Exceeding Expectation / Meeting Expectation / Approaching Expectation / Below Expectation).

Primary user in the first version: Principal / Admin.

### Design & UI Guidelines

- Clean, modern, professional interface

- Primary color: Deep green (#1B5E20 / #2E7D32)

- Light green accents and soft backgrounds

- Sidebar navigation (dark green)

- Top bar with search, notifications, and user profile

- Soft cards with subtle shadows

- Responsive (desktop-first)

- Use Tailwind CSS + shadcn/ui (or similar modern component library)

- Charts should be clean and professional

### Core Modules to Build

#### 1. Dashboard

- Personalized greeting (“Good morning, Mrs. Kamau”)

- KPI cards:

  - Total Students

  - Teaching Staff

  - Fees Collected (KES)

  - Average Attendance (%)

  - Active Exams

  - School Mean Score (%)

- Charts:

  - Fee Collection (Collected vs Outstanding) – line chart

  - Enrollment by Gender – donut chart

  - Weekly Attendance – bar chart

  - Academic Performance by Grade – line chart

- AI Insight banner (example: “Grade 7A shows 12% drop in Mathematics…”)

- Notifications panel

- Recent Fee Payments table

- Upcoming Events list

#### 2. Student Management

- Student list with filters by grade (PP1 – Grade 9)

- Search by name, Admission Number, or NEMIS

- Columns: Name, Adm No, NEMIS, Grade, Gender, Guardian, Balance, Status, Actions

- Student Profile modal with:

  - Personal details

  - Fee status (Paid / Outstanding)

  - “Send Reminder” and “View Report Card” buttons

- Admit Student + Bulk Upload + Export

#### 3. Examinations Module (Most Important)

Tabs:

- Examinations list

- Marks Compilation

- Marks Entry (editable grid with live total calculation)

- Results & Ranking

- AI Exam Compiler

- Report Cards

Key features:

- Marks Entry: editable table, auto-calculate totals and percentages

- Performance categories: EE (80-100%), ME (65-79%), AE (50-64%), BE (<50%)

- Results ranking table with subject scores

- AI Compiler: form to generate exams (Grade, Subject, Difficulty, Topics, Number of questions) with options for PDF, Marking Scheme, Answer Sheets

- Generate Single / Bulk Report Cards (CBC style)

#### 4. Other Modules (Basic structure)

- Teachers

- Timetable

- Homework

- Fees & Finance

- Payroll & HR

- Library, Inventory, Transport

### Technical Requirements

- Frontend: Next.js 14/15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

- Charts: Recharts

- State management: React Query / Zustand if needed

- Backend: Next.js API routes or separate NestJS/FastAPI (your choice, but prefer full-stack Next.js for speed)

- Database: Prisma + PostgreSQL (or SQLite for local demo)

- Authentication: NextAuth or Clerk (simple email/password for now)

- Role-based access (Principal, Teacher at minimum)

### Data to Seed

Create realistic sample data for a school called **Greenhill Academy**:

- 847 students

- Grades PP1 to Grade 9

- Kenyan names

- NEMIS numbers

- Fee balances

- Exam results with CBC levels

### Deliverables

1. Fully functional Dashboard

2. Working Student Management (list + profile)

3. Complete Examinations module (especially Marks Entry + Ranking + Report Card preview)

4. Clean sidebar navigation matching the described structure

5. Beautiful, production-ready UI

Start by creating the project structure, then implement the Dashboard and Student Management first, followed by the Examinations module.

Make the UI look premium and very close to a modern SaaS product.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/26143481-c709-4f61-a79b-6b8dfc8d6d9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
