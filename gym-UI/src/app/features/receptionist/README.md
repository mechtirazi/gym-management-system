## Receptionist Dashboard

This feature lives under `src/app/features/receptionist/` and is mounted at routes under `/receptionist/*`.

### API endpoints used

All endpoints are **Laravel Passport protected** and require:

- `Authorization: Bearer <token>`
- Optional: `X-Gym-Id: <id>` (the Angular `jwtInterceptor` adds it automatically when `user.gym_id` is set)

#### Auth / identity
- **GET** `/api/me` (used indirectly by existing app flow)

#### Members / enrollments (reused existing owner screen)
- **GET** `/api/enrollments`
- **POST** `/api/enrollments`
- **PUT** `/api/users/{id_user}` (edit member profile basics)
- **DELETE** `/api/enrollments/{id_enrollment}`

#### Payments (new receptionist screen)
- **GET** `/api/payments`
- **POST** `/api/payments`
- **PUT** `/api/payments/{id_payment}`

#### Attendance (new receptionist screen)
- **GET** `/api/sessions`
- **GET** `/api/attendances?id_session={id_session}`
- **POST** `/api/attendances`
- **PUT** `/api/attendances/{id_attendance}`

#### Courses / Events / Products (reused existing owner screens)
- **GET/POST/PUT/DELETE** `/api/courses`
- **GET/POST/PUT/DELETE** `/api/sessions`
- **GET/POST/PUT/DELETE** `/api/events`
- **GET/POST/PUT/DELETE** `/api/attendance-events`
- **GET/POST/PUT/DELETE** `/api/products`
- **POST** `/api/products/recommend`
- **GET** `/api/products/{product}/orders`
- **GET/POST/PUT/DELETE** `/api/orders`

### Assumptions

- Receptionist permissions are enforced by backend **Policies** (e.g. `UserPolicy`, `EnrollmentPolicy`, `AttendancePolicy`, `PaymentPolicy`).
- Some endpoints rely on **service-layer scoping** (e.g. `PaymentPolicy` allows receptionist `view`, with scoping expected in backend services).
- `id_transaction` is required by backend to be unique on payment create; the UI auto-generates one via `crypto.randomUUID()` when not provided.

