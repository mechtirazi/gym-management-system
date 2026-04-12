# Gym Management System - Comprehensive Project Guide

The Gym Management System is a modern, enterprise-grade platform designed to streamline gym operations, staff management, and member experience. It features a robust Laravel backend and a high-fidelity Angular frontend.

## 🚀 Technology Stack

### Backend (Laravel v12 + MySQL)
- **API Security**: Laravel Passport (OAuth2).
- **Architecture**: Service-oriented with decoupled business logic (e.g., `AuthService`, `WalletService`, `AIService`).
- **Data Scoping**: Multi-gym support (scoped via `id_gym` headers).
- **Integrations**: 
  - **Hugging Face**: For review sentiment analysis and smart product recommendations.
  - **Social Auth**: Google, Facebook, and GitHub login support.
- **Background Tasks**: Database queues for asynchronous processing.

### Frontend (Angular v21)
- **State Management**: Angular Signals for high-performance reactivity.
- **Styling**: Tailwind CSS & Angular Material.
- **Data Viz**: ApexCharts for real-time KPIs and revenue trends.
- **Modular Design**: Scoped feature modules for Admin, Owner, Receptionist, Nutritionist, and Member roles.

---

## 👥 Roles & Access Control (RBAC)

| Role | Responsibility | Key Features |
| :--- | :--- | :--- |
| **Super Admin** | Platform oversight. | Owners management, global analytics, global broadcasts. |
| **Gym Owner** | Single-gym manager. | Revenue tracking, staff hiring, detailed KPIs. |
| **Receptionist** | Front-desk desk op. | Member check-ins, payment processing, events. |
| **Trainer** | Fitness coaching. | Training session management, course tracking. |
| **Nutritionist** | Diet planning. | Meal plans creation and assignment. |
| **Member** | The customer. | Attendance tracking, wallet rewards, product purchases. |

---

## 🛠️ Core Business Logic

### 1. Unified Dashboard System
Every role has a tailored view. The **Receptionist Dashboard**, for example, provides:
- **KPIs**: Active members, expiring enrollments, check-ins today, and daily revenue.
- **Sessions**: Upcoming training schedules.
- **Attendance**: Real-time list of recent member check-ins.

### 2. Enrollment & Membership
Automated status tracking (Active, Expired, Suspended) for tiered memberships.

### 3. Reward & Wallet System
Members earn reward credits (bonus balance) by participating in gym events, which can be stored in their virtual **Wallet**.

### 4. AI-Enhanced Feedback
Sentiment analysis categorizes reviews (e.g., *Staff*, *Equipment*) to help owners improve their operations.

---

## 🔧 Setup & Local Development

### Backend (`gym-api`)
```bash
cd gym-api
composer install && npm install
php artisan migrate --seed
php artisan passport:install
php -S 127.0.0.1:8000 -t public public/index.php
```

### Frontend (`gym-UI`)
```bash
cd gym-UI
npm install --legacy-peer-deps
ng serve --port 4200
```
