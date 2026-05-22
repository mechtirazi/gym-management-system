# Gym Management System - Current Architecture (Code-Accurate)

This architecture reflects what is currently implemented in the repository.

## 1) Presentation Layer

- **Frontend:** Angular 21 SPA (`gym-UI`)
- **Routing:** Role-based dashboards (`admin`, `owner`, `member`, `trainer`, `nutritionist`, `receptionist`)
- **Guards & State:** auth/role guards, social callback guard, local token/user storage
- **HTTP Pipeline:**
  - JWT interceptor adds `Authorization: Bearer <token>`
  - Gym context via `X-Gym-Id`
  - Error interceptor handles 401 logout and suspended-gym UX
- **UI Libraries:** Angular Material, Tailwind, ApexCharts, ngx-translate
- **Payment UI:** Stripe.js card flow used by member payment modals

## 2) Application Layer (Backend API)

- **Backend:** Laravel 12 (`gym-api`)
- **API Style:** REST endpoints in `routes/api.php`
- **AuthN/AuthZ:**
  - Passport guard (`auth:api`) for API token authentication
  - Social login via Socialite (Google/Facebook/GitHub)
  - Role middleware (`role:*`)
  - Gym status middleware (`gym.status`)
  - Owner subscription middleware (`subscription.check`)
- **Main Modules:**
  - Users, Gyms, Staff, Courses, Sessions, Attendances
  - Events, Products, Orders, Payments
  - Enrollments, Subscribes, Wallets/WalletTransactions
  - Nutrition plans/messages, Reviews, Notifications, Search
- **Background/Scheduling:**
  - Queued email verification notification
  - Scheduled command `sessions:sync-status` (every minute)

## 3) Data Layer

- **Primary DB:** MySQL
- **ORM:** Eloquent
- **Files:** Local/public Laravel storage (`/storage`) for images/receipts
- **Queue/Cache:** Database-backed tables by default, Redis configured/available in Docker runtime

## 4) External Integrations Actually Present

- **Stripe:** PaymentIntent creation (`StripeService`) + Stripe.js frontend confirmation
- **Social OAuth Providers:** Google, Facebook, GitHub through Socialite
- **AI APIs:**
  - Hugging Face inference API (`AIService`)
  - Pollinations text API (`AuraAiService::ask`)
  - Google Gemini Vision API (`AuraAiService::analyzeImage`)
- **Mail Transport:** Used for email verification notifications

## 5) Infra / Deployment

- **Dev Compose:** `api`, `ui`, `mysql`, `redis`, `phpmyadmin`
- **Prod Compose:** `api`, `ui`, `mysql`, `redis`
- **Frontend runtime:** Nginx serves Angular and proxies `/api` and `/storage` to Laravel API

## 6) Removed From Previous Diagram (Not in Current Code)

- Flutter app
- Firebase Authentication
- OpenStreetMap integration
- ImageKit media storage
- CSP scheduling engine module
