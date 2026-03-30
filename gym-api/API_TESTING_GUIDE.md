# API Testing Guide

## Prerequisites

- Laravel server running on `http://127.0.0.1:8000`
- Postman installed
- Database seeded with test data

## Quick Start

### 1. Start Laravel Server

```bash
php artisan serve
```

The server will run at `http://127.0.0.1:8000`

### 2. Seed Sample Data (if needed)

```bash
php artisan db:seed
```

### 3. Import Postman Collection

1. Open Postman
2. Click **Import** → Select `PFE_Backend_APIs.postman_collection.json`
3. The collection will be imported with all test requests

### 4. Update Base URL (if different)

- In Postman, go to **Variables** tab
- Change `base_url` value if your server runs on a different port

---

## API Endpoints & Testing

### Base URL

```
http://127.0.0.1:8000/api
```

### All Available Endpoints

#### **Attendance**

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| GET    | `/attendance`      | List all attendance     |
| POST   | `/attendance`      | Create attendance       |
| GET    | `/attendance/{id}` | Get specific attendance |
| PUT    | `/attendance/{id}` | Update attendance       |
| DELETE | `/attendance/{id}` | Delete attendance       |

#### **Users**

| Method | Endpoint      | Description       |
| ------ | ------------- | ----------------- |
| GET    | `/users`      | List all users    |
| POST   | `/users`      | Create user       |
| GET    | `/users/{id}` | Get specific user |
| PUT    | `/users/{id}` | Update user       |
| DELETE | `/users/{id}` | Delete user       |

#### **Courses**

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| GET    | `/courses`      | List all courses    |
| POST   | `/courses`      | Create course       |
| GET    | `/courses/{id}` | Get specific course |
| PUT    | `/courses/{id}` | Update course       |
| DELETE | `/courses/{id}` | Delete course       |

#### **Gyms**

| Method | Endpoint     | Description      |
| ------ | ------------ | ---------------- |
| GET    | `/gyms`      | List all gyms    |
| POST   | `/gyms`      | Create gym       |
| GET    | `/gyms/{id}` | Get specific gym |
| PUT    | `/gyms/{id}` | Update gym       |
| DELETE | `/gyms/{id}` | Delete gym       |

#### **Products**

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/products`      | List all products    |
| POST   | `/products`      | Create product       |
| GET    | `/products/{id}` | Get specific product |
| PUT    | `/products/{id}` | Update product       |
| DELETE | `/products/{id}` | Delete product       |

#### **Orders**

| Method | Endpoint       | Description        |
| ------ | -------------- | ------------------ |
| GET    | `/orders`      | List all orders    |
| POST   | `/orders`      | Create order       |
| GET    | `/orders/{id}` | Get specific order |
| PUT    | `/orders/{id}` | Update order       |
| DELETE | `/orders/{id}` | Delete order       |

#### **Sessions**

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/sessions`      | List all sessions    |
| POST   | `/sessions`      | Create session       |
| GET    | `/sessions/{id}` | Get specific session |
| PUT    | `/sessions/{id}` | Update session       |
| DELETE | `/sessions/{id}` | Delete session       |

#### **Reviews**

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| GET    | `/reviews`      | List all reviews    |
| POST   | `/reviews`      | Create review       |
| GET    | `/reviews/{id}` | Get specific review |
| PUT    | `/reviews/{id}` | Update review       |
| DELETE | `/reviews/{id}` | Delete review       |

#### **Notifications**

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/notifications`      | List all notifications    |
| POST   | `/notifications`      | Create notification       |
| GET    | `/notifications/{id}` | Get specific notification |
| PUT    | `/notifications/{id}` | Update notification       |
| DELETE | `/notifications/{id}` | Delete notification       |

#### **Nutrition Plans**

| Method | Endpoint                | Description       |
| ------ | ----------------------- | ----------------- |
| GET    | `/nutrition-plans`      | List all plans    |
| POST   | `/nutrition-plans`      | Create plan       |
| GET    | `/nutrition-plans/{id}` | Get specific plan |
| PUT    | `/nutrition-plans/{id}` | Update plan       |
| DELETE | `/nutrition-plans/{id}` | Delete plan       |

#### **Payments**

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/payments`      | List all payments    |
| POST   | `/payments`      | Create payment       |
| GET    | `/payments/{id}` | Get specific payment |
| PUT    | `/payments/{id}` | Update payment       |
| DELETE | `/payments/{id}` | Delete payment       |

#### **Subscriptions**

| Method | Endpoint           | Description               |
| ------ | ------------------ | ------------------------- |
| GET    | `/subscribes`      | List all subscriptions    |
| POST   | `/subscribes`      | Create subscription       |
| GET    | `/subscribes/{id}` | Get specific subscription |
| PUT    | `/subscribes/{id}` | Update subscription       |
| DELETE | `/subscribes/{id}` | Delete subscription       |

#### **Attendance Events**

| Method | Endpoint                  | Description        |
| ------ | ------------------------- | ------------------ |
| GET    | `/attendance-events`      | List all events    |
| POST   | `/attendance-events`      | Create event       |
| GET    | `/attendance-events/{id}` | Get specific event |
| PUT    | `/attendance-events/{id}` | Update event       |
| DELETE | `/attendance-events/{id}` | Delete event       |

---

## Manual Testing Examples

### Using cURL

#### List all users:

```bash
curl -X GET "http://127.0.0.1:8000/api/users"
```

#### Create a user:

```bash
curl -X POST "http://127.0.0.1:8000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"123456","phone":"1234567890"}'
```

#### Get specific user:

```bash
curl -X GET "http://127.0.0.1:8000/api/users/1"
```

#### Update user:

```bash
curl -X PUT "http://127.0.0.1:8000/api/users/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'
```

#### Delete user:

```bash
curl -X DELETE "http://127.0.0.1:8000/api/users/1"
```

---

## Expected Response Format

### Success Response (200/201)

```json
{
  "success": true,
  "data": {...},
  "message": "Resource retrieved/created/updated successfully"
}
```

### Error Response (validation error 422)

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": {
        "field_name": ["Error message"]
    }
}
```

### Server Error (500)

```json
{
    "success": false,
    "message": "Error message description"
}
```

---

## Test Checklist

All APIs follow this pattern - test each with:

- [ ] GET (list all) - should return array
- [ ] POST (create) with valid data - should return 201
- [ ] POST (create) with invalid data - should return 422 with validation errors
- [ ] GET (show) with valid ID - should return 200
- [ ] GET (show) with invalid ID - should return 404
- [ ] PUT (update) with valid data - should return 200
- [ ] DELETE - should return 204

---

## Troubleshooting

### Connection Refused

- Ensure Laravel server is running: `php artisan serve`

### 404 Not Found

- Check endpoint URL spelling
- Verify resource exists before GET/PUT/DELETE

### 422 Unprocessable Entity

- Check request body meets validation requirements
- Review error messages in response

### 500 Server Error

- Check Laravel logs: `storage/logs/laravel.log`
- Run `php artisan migrate` if database issues
