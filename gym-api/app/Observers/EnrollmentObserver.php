<?php

namespace App\Observers;

use App\Models\Enrollment;
use Illuminate\Support\Facades\DB;

class EnrollmentObserver
{
    /**
     * Handle the Enrollment "saved" event.
     */
    public function saved(Enrollment $enrollment): void
    {
        $this->syncUserStatus($enrollment->id_member);
    }

    /**
     * Handle the Enrollment "deleted" event.
     */
    public function deleted(Enrollment $enrollment): void
    {
        $this->syncUserStatus($enrollment->id_member);
    }
    
    protected function syncUserStatus($userId)
    {
        if (!$userId) return;
        
        $hasActive = Enrollment::where('id_member', $userId)
            ->where('status', 'active')
            ->exists();
            
        $newStatus = $hasActive ? 'active' : 'inactive';
        
        DB::table('users')->where('id_user', $userId)->update(['status' => $newStatus]);
    }
}
