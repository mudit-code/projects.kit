# projects.kit

> **Academic Project Lifecycle & Directory Portal for Kanpur Institute of Technology (KIT)**  
> Department of Computer Science & Engineering (CSE)

`projects.kit` is an academic project management and student directory portal designed for Kanpur Institute of Technology. It streamlines capstone, mini-project, and major-project workflows—ranging from departmental initiative forms and project archives to comprehensive student directories.

---

## 🏛️ Brand & Institutional Identity
- **Institution**: Kanpur Institute of Technology (KIT)
- **Department**: Computer Science & Engineering (CSE)
- **Primary Color**: Navy (`#0A2A5E` / `#0D3481`)
- **Action / Interactive Color**: Bright Blue (`#1E5BD8`)
- **Accent Color**: Amber (`#F59E0B` / `#F28832`)
- **Design Philosophy**: Clean, responsive, glass-subtle, data-dense academic dashboards.

---

## 🚀 Key Modules & Architecture

### 1. Student Directory (`/students`)
- **Batch Directory**: Displays complete student records backed by [students.json](src/data/students.json) (348 student records).
- **Interactive Controls**:
  - Global search by Name, AFN, Roll Number, and Email.
  - Stream filter (e.g., Computer Science & Engineering, Information Technology, etc.).
  - Gender filter.
  - Multi-column sortable table headers.
  - 20-row client-side pagination with count badges and smooth page switching.

### 2. Departmental Forms & Project Initiation (`/forms`)
- **HOD Project Dispatch**: Configure course (`B.Tech`, `MCA`, `M.Tech`), stream (`CSE`, `AI & ML`), semester/year, and target cohort sections.
- **Dynamic Lifecycle Filtering**:
  - `All`: Complete registry of departmental forms.
  - `Ongoing`: Active projects within the submission window (`startDate` &rarr; `deadline`).
  - `Completed`: Projects that have reached or passed the final submission deadline.
- **Section Isolation**: Clean single-letter identifiers (`A`, `B`, `C`), removing cohort prefix clutter.

### 3. Project Directory (`/projects`)
- Comprehensive multi-session capstone archive.
- Instant 4-tier filtering: Academic Session (`2026-27`), Course, Branch, and Year.
- Dedicated empty state and directory filter cards.

---

## 📂 Route Directory

```
projects.kit/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── forms/              # Departmental forms table (All, Ongoing, Completed)
│   │   │   ├── projects/           # Project directory (empty state & archive)
│   │   │   │   └── new/            # Project initiation form
│   │   │   ├── students/           # Student directory (348 records, search, filter)
│   │   │   ├── roles/              # Role assignment & permissions
│   │   │   └── layout.tsx          # Authenticated dashboard wrapper
│   │   ├── layout.tsx              # Root HTML & PageLoadingProvider
│   │   └── page.tsx                # Welcome & sign-in portal
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── FormsTable.tsx      # Forms management table component
│   │   │   ├── ProjectsTable.tsx   # Project directory table component
│   │   │   ├── StudentsTable.tsx   # Searchable & filterable student directory
│   │   │   └── DashboardLayoutClient.tsx # Dynamic collapsible sidebar
│   │   ├── KitScreenLoader.tsx     # Kanpur Institute of Technology branded loader
│   │   └── Logo.tsx                # Official KIT insignia
│   └── data/
│       ├── students.json           # Active student database (348 records)
│       ├── projects.json           # Departmental projects & forms data
│       └── forms.json              # Published forms data
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`

### 2. Installation
```bash
npm install
```

### 3. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 📜 License
Internal academic software developed for **Kanpur Institute of Technology (KIT)**. All rights reserved.
