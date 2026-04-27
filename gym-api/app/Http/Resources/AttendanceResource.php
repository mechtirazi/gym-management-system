<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $member = $this->member;
        $session = $this->session;
        $course = $session?->course;
        $gym = $course?->gym;

        return [
            'id_attendance' => $this->id_attendance,
            'id_member' => $this->id_member,
            'id_session' => $this->id_session,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Member details for the attendance list
            // Member details with fallbacks
            'member' => [
                'id' => $member->id_user ?? null,
                'first_name' => $member->name ?? 'Unknown',
                'last_name' => $member->last_name ?? '',
                'name' => ($member->name ?? 'Unknown') . ' ' . ($member->last_name ?? ''),
                'email' => $member->email ?? 'No email',
                'id_user' => $member->id_user ?? null, // Keep id_user for compatibility
            ],
            'session' => [
                'id_session' => $session?->id_session ?? null,
                'course' => [
                    'id_course' => $course?->id_course ?? null,
                    'name' => $course?->name ?? 'General Training',
                    'gym' => [
                        'id_gym' => $gym?->id_gym ?? null,
                        'name' => $gym?->name ?? 'Regional Hub',
                    ]
                ]
            ],
            
            // Helpful flat fields for the feed
            'gym_name' => $gym?->name ?? 'Regional Hub',
            'course_name' => $course?->name ?? 'General Training',
        ];
    }
}
