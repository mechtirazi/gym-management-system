# Gym API - OAuth 2.0 Authentication System Documentation

## Table of Contents
1. [Overview](#overview)
2. [What Was Installed](#what-was-installed)
3. [How It Works](#how-it-works)
4. [Database Tables](#database-tables)
5. [Authentication Flow](#authentication-flow)
6. [API Endpoints](#api-endpoints)
7. [Usage Examples](#usage-examples)
8. [Security Features](#security-features)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## Overview

I've implemented **Laravel Passport**, which is an OAuth 2.0 server implementation for Laravel. This provides enterprise-grade authentication for your Gym API with token-based access control.

### Why Passport?
- ✅ OAuth 2.0 compliant (industry standard)
- ✅ Personal access tokens for API authentication
- ✅ Token refresh mechanism
- ✅ Scope-based permissions (future phases)
- ✅ Built-in token revocation
- ✅ Perfect for mobile apps and SPAs

---

## What Was Installed

### 1. **Laravel Passport Package**
```bash
composer require laravel/passport
```
**What it does:** Provides OAuth 2.0 server implementation and token management

### 2. **Configuration Files Created**
- **`config/passport.php`** - Passport configuration
- **`bootstrap/app.php`** - Updated to register Passport

### 3. **Database Migrations Created**
Five new tables to store OAuth 2.0 data:

| Table | Purpose |
|-------|---------|
| `oauth_clients` | Stores OAuth client applications |
| `oauth_access_tokens` | Stores user access tokens |
| `oauth_refresh_tokens` | Stores refresh tokens for token renewal |
| `oauth_auth_codes` | Stores authorization codes |
| `oauth_personal_access_clients` | Stores personal access client configurations |

### 4. **Updated Files**
- **`app/Models/User.php`** - Added `HasApiTokens` trait
- **`config/auth.php`** - Added `api` guard with Passport driver
- **`routes/api.php`** - Created protected authentication routes
- **`app/Http/Controllers/Api/AuthController.php`** - New authentication controller

---

## How It Works

### Authentication Flow Diagram

```
┌─────────────────┐
│   User (App)    │
└────────┬────────┘
         │
         │ 1. POST /api/auth/register
         │    or POST /api/auth/login
         ↓
┌─────────────────────────────────┐
│   Laravel Passport Server       │
│ (oauth_clients, oauth_tokens)   │
└────────┬────────────────────────┘
         │
         │ 2. Validate credentials
         │    Generate access token
         ↓
┌─────────────────┐
│  Client App     │
│ (with token)    │
└────────┬────────┘
         │
         │ 3. POST /api/auth/me
         │    + Authorization: Bearer {token}
         ↓
┌─────────────────────────────┐
│  Passport Middleware        │
│  Validates token & user     │
└────────┬────────────────────┘
         │
         │ 4. Token valid?
         ↓
✅ Allow access to protected resources
```

---

## Database Tables

### 1. `oauth_clients`
Stores OAuth client configurations (your app is a client)

```
Columns:
- id (Primary Key)
- user_id (nullable - for personal clients)
- name (Client name)
- secret (Client secret for security)
- provider (nullable)
- redirect (Redirect URI)
- personal_access_client (Boolean)
- password_client (Boolean)
- confidential (Boolean)
- timestamps
```

### 2. `oauth_access_tokens`
Stores valid access tokens issued to users

```
Columns:
- id (Primary Key)
- client_id (Links to oauth_clients)
- user_id (Links to users table)
- name (Token name/description)
- scopes (JSON - permissions)
- revoked (Boolean - is token invalidated?)
- expires_at (Token expiration time)
- timestamps
```

### 3. `oauth_refresh_tokens`
Allows users to get new access tokens without re-logging in

```
Columns:
- id (Primary Key)
- access_token_id (Links to oauth_access_tokens)
- revoked (Boolean)
- expires_at (Refresh token expiration)
```

### 4. `oauth_auth_codes`
Temporary codes for authorization code flow (OAuth 2.0 standard)

```
Columns:
- id (Primary Key)
- user_id (Links to users table)
- client_id (Links to oauth_clients)
- scopes (JSON - requested permissions)
- revoked (Boolean)
- expires_at (Code expiration)
```

### 5. `oauth_personal_access_clients`
Designates which clients can issue personal access tokens

```
Columns:
- id (Primary Key)
- client_id (Links to oauth_clients)
- timestamps
```

---

## Authentication Flow

### Step 1: User Registration
```
POST /api/auth/register

Request:
{
  "name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123",
  "phone": "1234567890",
  "role": "member"
}

What Happens:
1. Controller validates input
2. Password is hashed using bcrypt
3. User is created in `users` table
4. Personal access token is generated
5. Token is stored in `oauth_access_tokens` table

Response (201 Created):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id_user": 1,
      "name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "member",
      "phone": "1234567890"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjMwMzNhOWRjYz...",
    "token_type": "Bearer"
  }
}
```

### Step 2: User Login
```
POST /api/auth/login

Request:
{
  "email": "john@example.com",
  "password": "SecurePass123"
}

What Happens:
1. Find user by email in `users` table
2. Verify password using Hash::check()
3. Create new access token
4. Store token in `oauth_access_tokens` table

Response (200 OK):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "access_token": "...",
    "token_type": "Bearer"
  }
}
```

### Step 3: Using Protected Endpoints
```
GET /api/auth/me
Header: Authorization: Bearer {access_token}

What Happens:
1. Passport middleware intercepts request
2. Extracts token from Authorization header
3. Queries `oauth_access_tokens` table
4. Verifies token is valid and not revoked
5. Verifies token hasn't expired
6. Returns authenticated user data

Response (200 OK):
{
  "success": true,
  "data": {
    "id_user": 1,
    "name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member",
    "phone": "1234567890",
    "creation_date": "2026-02-13T10:00:00Z"
  }
}
```

### Step 4: Token Refresh
```
POST /api/auth/refresh
Header: Authorization: Bearer {access_token}

What Happens:
1. Get current user from token
2. Revoke old token (mark as revoked in DB)
3. Create new access token
4. Store new token in `oauth_access_tokens`
5. Return new token

Response (200 OK):
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjQ5MzY1NDk3Ny4.",
    "token_type": "Bearer"
  }
}
```

### Step 5: Logout
```
POST /api/auth/logout
Header: Authorization: Bearer {access_token}

What Happens:
1. Get current user from token
2. Revoke the token (set revoked=true in DB)
3. Token is now invalid for future requests

Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. User Registration
```
POST /api/auth/register

Required Fields:
- name: string (required)
- last_name: string (required)
- email: string (required, unique)
- password: string (required, min 8 chars)
- password_confirmation: string (required, must match password)

Optional Fields:
- phone: string
- role: string (default: 'member')
  Valid roles: super_admin, owner, trainer, member, nutritionist, receptionist

Returns: User object + access token
Status: 201 Created
```

#### 2. User Login
```
POST /api/auth/login

Required Fields:
- email: string
- password: string

Returns: User object + access token
Status: 200 OK
```

---

### Protected Endpoints (Authentication Required)

All protected endpoints require this header:
```
Authorization: Bearer {access_token}
```

#### 3. Get Current User
```
GET /api/auth/me

Returns: Current authenticated user
Status: 200 OK
```

#### 4. Refresh Token
```
POST /api/auth/refresh

Returns: New access token
Status: 200 OK
```

#### 5. Logout
```
POST /api/auth/logout

Returns: Success message
Status: 200 OK
```

#### 6. All Resource Endpoints (Protected)
```
GET /api/users - List all users
POST /api/users - Create new user
GET /api/users/{id} - Get specific user
PUT /api/users/{id} - Update user
DELETE /api/users/{id} - Delete user

Same for: gyms, courses, sessions, products, orders, payments, etc.
```

---

## Usage Examples

### Example 1: Complete Registration & Protected Request Flow

**Step 1: Register User**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "password_confirmation": "SecurePass123",
    "phone": "1234567890",
    "role": "member"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id_user": 1,
      "name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "member",
      "phone": "1234567890"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjMwMzNhOWRjYzAyNmE5MGMxNzg5ZTI2ZWEyMWYzOTdiN2FmM2RhMThiMDdkY2JmZDBhMjJjY2E4OTkyZDM0YTI2NDBkZTc1NzNkNDFlNzc1YTAifQ...",
    "token_type": "Bearer"
  }
}
```

**Step 2: Use Token to Access Protected Resource**
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjMwMzNhOWRjYzAyNmE5MGMxNzg5ZTI2ZWEyMWYzOTdiN2FmM2RhMThiMDdkY2JmZDBhMjJjY2E4OTkyZDM0YTI2NDBkZTc1NzNkNDFlNzc1YTAifQ..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id_user": 1,
    "name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member",
    "phone": "1234567890",
    "creation_date": "2026-02-13T10:00:00Z"
  }
}
```

---

### Example 2: Login & Create Gym

**Step 1: Login**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Step 2: Create Gym (Protected)**
```bash
curl -X POST http://localhost:8000/api/gyms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "name": "Fitness Plus",
    "adress": "123 Main Street",
    "capacity": 100,
    "open_hour": "06:00",
    "id_owner": 1
  }'
```

---

## Security Features

### 1. Password Hashing
```php
// In AuthController
$validated['password'] = Hash::make($validated['password']);
```
- Uses bcrypt hashing algorithm
- Password is never stored in plain text
- Passwords are salted automatically

### 2. Token Security
```php
// Token is created with scopes
$token = $user->createToken('auth_token', ['*'])->accessToken;
```
- Tokens are JWT (JSON Web Tokens)
- Cryptographically signed
- Cannot be forged or modified
- Expire after set time

### 3. Token Revocation
```php
// When user logs out
$request->user()->token()->revoke();
```
- Old tokens are marked as revoked in database
- Cannot be reused after logout
- Refresh tokens are also revoked

### 4. Email Validation
```php
'email' => 'required|string|email|max:255|unique:users,email'
```
- Prevents duplicate accounts
- Validates email format

### 5. Password Validation
```php
'password' => 'required|string|min:8|confirmed'
```
- Minimum 8 characters
- Must match confirmation field
- Prevents weak passwords

### 6. Role-Based Access (Future)
```php
const VALID_ROLES = ['super_admin', 'owner', 'trainer', 'member', 'nutritionist', 'receptionist'];
```
- System supports multiple roles
- Foundation for RBAC in Phase 3

---

## Troubleshooting

### Issue 1: "Unauthenticated" Error (401)
**Problem:** Token is missing or invalid

**Solutions:**
1. Check Authorization header format: `Authorization: Bearer {token}`
2. Verify token hasn't expired
3. Re-login to get new token
4. Ensure token is from `access_token` field, not the entire response

### Issue 2: "SQLSTATE: Column 'password' not found"
**Problem:** User model doesn't have password field

**Solution:** This shouldn't happen with current setup, but verify users table has `password` column

### Issue 3: "Invalid credentials" (401)
**Problem:** Email or password is incorrect

**Solutions:**
1. Double-check email spelling
2. Verify password is correct
3. Confirm user exists (try registering new user)

### Issue 4: Token Doesn't Work After Logout
**Problem:** Token was revoked during logout

**Solution:** Re-login to get new token

---

## How Protected Routes Work

### Current Route Structure

**File: `routes/api.php`**

```php
// PUBLIC ROUTES (no auth needed)
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// PROTECTED ROUTES (require auth:api middleware)
Route::middleware('auth:api')->group(function () {
    // Auth protected routes
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
    
    // All resource routes (gyms, users, courses, etc.)
    Route::apiResource('gyms', GymController::class);
    Route::apiResource('users', UserController::class);
    // ... etc
});
```

### What `middleware('auth:api')` Does

```
Request comes in
    ↓
Middleware checks Authorization header
    ↓
Extracts token from "Bearer {token}"
    ↓
Queries oauth_access_tokens table
    ↓
Verifies:
  ✓ Token exists
  ✓ Token not revoked
  ✓ Token not expired
  ✓ User still exists
    ↓
If valid → Pass user to controller
If invalid → Return 401 Unauthenticated
```

---

## Database Changes Made

### New Tables Created (via migrations)
```
2026_02_13_000001_create_oauth_clients_table
2026_02_13_000002_create_oauth_access_tokens_table
2026_02_13_000003_create_oauth_refresh_tokens_table
2026_02_13_000004_create_oauth_auth_codes_table
2026_02_13_000005_create_oauth_personal_access_clients_table
```

### Existing Tables Modified
**None** - All authentication data is in new OAuth tables

### User Model Changes
- Updated `app/Models/User.php`
- Added `HasApiTokens` trait from Passport
- This allows methods like `createToken()` and `token()->revoke()`

---

## Files Modified/Created

### Created:
```
✓ config/passport.php - Passport configuration
✓ app/Http/Controllers/Api/AuthController.php - Authentication controller
✓ database/migrations/2026_02_13_000001_*.php - 5 OAuth tables
```

### Modified:
```
✓ bootstrap/app.php - Added Passport initialization
✓ config/auth.php - Added 'api' guard with Passport driver
✓ routes/api.php - Added auth routes and protected middleware
✓ app/Models/User.php - Added HasApiTokens trait
```

### Configuration:
```
✓ User model has 'id_user' as primary key (custom)
✓ Auth guard 'api' uses 'passport' driver
✓ All protected routes use 'auth:api' middleware
```

---

## Next Steps (Phase 2-5)

### Phase 2: Email Verification ✨
- Verify email on registration
- Send verification emails
- Resend verification tokens

### Phase 3: Social Login 🔐
- Login with Google OAuth
- Login with Apple ID
- Login with GitHub
- Redirect URIs configuration

### Phase 4: RBAC (Role-Based Access Control) 🛡️
- Admin-only endpoints
- Trainer-only endpoints
- Permission-based access
- Middleware for role checking

### Phase 5: Advanced Security 🔒
- Two-Factor Authentication (2FA)
- Audit logging (track all actions)
- Rate limiting (prevent brute force)
- Token expiration policies
- Scope-based permissions

---

## Quick Reference

| Task | Endpoint | Method | Auth? |
|------|----------|--------|-------|
| Register | `/api/auth/register` | POST | ❌ |
| Login | `/api/auth/login` | POST | ❌ |
| Get Me | `/api/auth/me` | GET | ✅ |
| Logout | `/api/auth/logout` | POST | ✅ |
| Refresh Token | `/api/auth/refresh` | POST | ✅ |
| List Gyms | `/api/gyms` | GET | ✅ |
| Create Gym | `/api/gyms` | POST | ✅ |
| Update Gym | `/api/gyms/{id}` | PUT | ✅ |
| Delete Gym | `/api/gyms/{id}` | DELETE | ✅ |

---

## Test Your Setup

### Quick Test Script
```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","last_name":"User","email":"test@example.com","password":"Pass123456","password_confirmation":"Pass123456"}' \
  | jq -r '.data.access_token')

# 2. Use token
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 3. Logout
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Support & Documentation

- **Laravel Passport Docs:** https://laravel.com/docs/passport
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **JWT Explained:** https://jwt.io/introduction

---

**Last Updated:** February 13, 2026  
**Version:** 1.0 - Passport OAuth 2.0 Implementation
