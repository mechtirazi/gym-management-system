<?php
echo "Total enrollments: " . App\Models\Enrollment::count() . "\n";
echo "Expired: " . App\Models\Enrollment::where('status', 'expired')->count() . "\n";
echo "Active: " . App\Models\Enrollment::where('status', 'active')->count() . "\n";
echo "Pending: " . App\Models\Enrollment::where('status', 'pending')->count() . "\n";
