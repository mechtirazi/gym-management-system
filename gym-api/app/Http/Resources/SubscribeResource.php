<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscribeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_subscribe' => $this->id_subscribe,
            'id_user' => $this->id_user,
            'id_gym' => $this->id_gym,
            'subscribe_date' => $this->subscribe_date,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Nested gym name with fallback
            'gym' => [
                'id_gym' => $this->gym->id_gym ?? null,
                'name' => $this->gym->name ?? 'Local Facility',
            ],
            
            // Subscription plan info (if relationship exists)
            'plan' => $this->plan ? [
                'id_plan' => $this->plan->id_plan,
                'name' => $this->plan->name,
            ] : null,

            // Member info
            'user' => $this->user ? [
                'id_user' => $this->user->id_user,
                'name' => $this->user->name,
                'last_name' => $this->user->last_name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
            ] : null,
        ];
    }
}
