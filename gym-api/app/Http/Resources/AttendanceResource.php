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
        return [
            'id_attendance' => $this->id_attendance,
            'id_member' => $this->id_member,
            'id_session' => $this->id_session,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Member details for the attendance list
            'member' => [
                'id' => $this->member->id_user ?? null,
                'first_name' => $this->member->name ?? 'Unknown',
                'last_name' => $this->member->last_name ?? '',
                'name' => ($this->member->name ?? 'Unknown') . ' ' . ($this->member->last_name ?? ''),
                'email' => $this->member->email ?? 'No email',
            ],
            
            // Nested data with fallbacks
            'session' => [
                'id_session' => $this->session->id_session ?? null,
                'course' => [
                    'id_course' => $this->session->course->id_course ?? null,
                    'name' => $this->session->course->name ?? 'General Training',
                    'gym' => [
                        'id_gym' => $this->session->course->gym->id_gym ?? null,
                        'name' => $this->session->course->gym->name ?? 'Regional Hub',
                    ]
                ]
            ],
            
            // Helpful flat fields for the feed
            'gym_name' => $this->session->course->gym->name ?? 'Regional Hub',
            'course_name' => $this->session->course->name ?? 'General Training',
        ];
    }
}
