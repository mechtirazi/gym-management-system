<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GymController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\AttendanceEventController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SubscribeController;
use App\Http\Controllers\Api\NutritionPlanController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\GymStaffController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\OwnerDashboardController;
use App\Http\Controllers\Api\OwnerRevenueController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\SuperAdminAnalyticsController;
use App\Http\Controllers\Api\OwnerController;

// Public Auth Routes (no authentication required)
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('login', [AuthController::class, 'login'])
         ->name('auth.login')
         ->middleware('throttle:login');

    // Email Verification
    Route::get('verify/{id}/{hash}', [AuthController::class, 'verify'])->name('verification.verify');
    Route::post('resend-verification', [AuthController::class, 'resendVerification'])->name('verification.resend');

    // Social Media Login
    Route::get('{provider}/redirect', [SocialAuthController::class, 'redirectToProvider'])->name('auth.social.redirect');
    Route::get('{provider}/callback', [SocialAuthController::class, 'handleProviderCallback'])->name('auth.social.callback');
});

// Authenticated routes without gym status check (logout must work when suspended)
Route::middleware('auth:api')->group(function () {
    Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
});

// Protected Routes (require authentication + gym not suspended)
Route::middleware(['auth:api', 'gym.status'])->group(function () {
    // Auth info
    Route::get('me', [AuthController::class, 'me'])->name('auth.me');
    Route::post('refresh', [AuthController::class, 'refresh'])->name('auth.refresh');

    // User routes
    Route::apiResource('users', UserController::class);

    // Gym routes
    Route::apiResource('gyms', GymController::class);

    // Course routes
    Route::apiResource('courses', CourseController::class);

    // Session routes
    Route::apiResource('sessions', SessionController::class);

    // Attendance routes
    Route::apiResource('attendances', AttendanceController::class);

    // Event routes
    Route::apiResource('events', EventController::class);

    // Attendance Event routes
    Route::apiResource('attendance-events', AttendanceEventController::class);

    // Product routes
    Route::post('products/recommend', [ProductController::class, 'recommend'])->name('products.recommend');
    Route::get('products/{product}/orders', [ProductController::class, 'orders'])->name('products.orders');
    Route::apiResource('products', ProductController::class);

    // Order routes
    Route::apiResource('orders', OrderController::class);

    // Payment routes
    Route::apiResource('payments', PaymentController::class);

    // Review routes
    Route::apiResource('reviews', ReviewController::class);

    // Subscribe routes
    Route::apiResource('subscribes', SubscribeController::class);

    // Nutrition Plan routes
    Route::apiResource('nutrition-plans', NutritionPlanController::class);

    // Notification routes
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::apiResource('notifications', NotificationController::class);

    // Enrollment routes
    Route::apiResource('enrollments', EnrollmentController::class);

    // Gym Staff routes
    Route::apiResource('gym-staff', GymStaffController::class);

    // Gym Receipt Upload (Excluded from subscription check so they can pay when expired)
    Route::post('owner/gyms/{gym}/upload-receipt', [OwnerController::class, 'uploadReceipt'])
        ->name('owner.gyms.upload-receipt');

    // Owner Dashboard routes (with subscription check)
    Route::middleware(['subscription.check'])->group(function () {
        Route::prefix('owner')->group(function () {
            Route::get('dashboard-stats', [OwnerDashboardController::class, 'getDashboardStats'])->name('owner.dashboard-stats');
            Route::get('revenue-chart', [OwnerDashboardController::class, 'getRevenueChart'])->name('owner.revenue-chart');
            Route::get('recent-checkins', [OwnerDashboardController::class, 'getRecentCheckins'])->name('owner.recent-checkins');
            Route::get('revenue-stats', [OwnerRevenueController::class, 'getAdvancedStats'])->name('owner.revenue-stats');
        });
    });

    // Super Admin routes
    Route::middleware('role:super_admin')->prefix('admin')->group(function () {
        Route::post('impersonate/{id_user}', [AdminController::class, 'impersonate'])->name('admin.impersonate');
        Route::get('gyms', [AdminController::class, 'index']);
        Route::get('owners', [AdminController::class, 'getOwners']);
        Route::get('owners/{id_owner}/gyms', [AdminController::class, 'getOwnerGyms']);
        Route::post('notifications/all', [AdminController::class, 'broadcastNotification'])->name('admin.notifications.all');
        Route::post('notifications/owner/{id_owner}', [AdminController::class, 'notifyOwner'])->name('admin.notifications.owner');
        Route::post('gyms/{id_gym}/renew', [AdminController::class, 'renewGymSubscription'])->name('admin.gyms.renew');
        Route::get('analytics/revenue', [AdminController::class, 'getRevenueStats'])->name('admin.analytics.revenue');
        Route::get('metrics/overview', [SuperAdminAnalyticsController::class, 'getOverviewMetrics'])->name('admin.metrics.overview');
        Route::post('gyms/{id_gym}/suspend', [AdminController::class, 'suspendGym'])->name('admin.gyms.suspend');
        Route::post('gyms/{id_gym}/activate', [AdminController::class, 'activateGym'])->name('admin.gyms.activate');
        Route::post('owners/{id_owner}/disable-gyms', [AdminController::class, 'disableAllOwnerGyms'])->name('admin.owners.disable-gyms');
        Route::post('owners/{id_owner}/activate-gyms', [AdminController::class, 'activateAllOwnerGyms'])->name('admin.owners.activate-gyms');
    });

});
