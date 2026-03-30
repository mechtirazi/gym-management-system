<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Http\Response;
use Laravel\Passport\Passport;
use App\Models\User;
use App\Models\Course;
use App\Models\Gym;
use App\Models\Attendance;
use App\Models\AttendanceEvent;
use App\Models\Event;
use App\Models\Notification;
use App\Models\NutritionPlan;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\Session;
use App\Models\Subscribe;
use App\Models\Enrollment;
use App\Policies\UserPolicy;
use App\Policies\CoursePolicy;
use App\Policies\GymPolicy;
use App\Policies\AttendancePolicy;
use App\Policies\AttendanceEventPolicy;
use App\Policies\EventPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\NutritionPlanPolicy;
use App\Policies\OrderPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\ProductPolicy;
use App\Policies\ReviewPolicy;
use App\Policies\SessionPolicy;
use App\Policies\SubscribePolicy;
use App\Policies\EnrollmentPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Course::class, CoursePolicy::class);
        Gate::policy(Gym::class, GymPolicy::class);
        Gate::policy(Attendance::class, AttendancePolicy::class);
        Gate::policy(AttendanceEvent::class, AttendanceEventPolicy::class);
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(Notification::class, NotificationPolicy::class);
        Gate::policy(NutritionPlan::class, NutritionPlanPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(Review::class, ReviewPolicy::class);
        Gate::policy(Session::class, SessionPolicy::class);
        Gate::policy(Subscribe::class, SubscribePolicy::class);
        Gate::policy(Enrollment::class, EnrollmentPolicy::class);
        
        Enrollment::observe(\App\Observers\EnrollmentObserver::class);

        // custom rate limiter for login route (5 per minute per IP+email)
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');
            $key   = Str::lower($email) . '|' . $request->ip();

            return Limit::perMinute(5)
                        ->by($key)
                        ->response(function () {
                            return response()->json([
                                'message' => 'Too many login attempts. Please try again later.'
                            ], 429);
                        });
        });

    }
}
