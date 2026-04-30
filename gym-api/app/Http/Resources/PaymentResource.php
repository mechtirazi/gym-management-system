<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Number;

class PaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id_payment,
            'public_id' => $this->id_payment,
            'external_reference' => $this->external_reference ?? $this->id_transaction,
            'status' => [
                'value' => $this->status->value ?? $this->status, // Support both enum and raw string if cast fails
                'label' => ucfirst($this->status->value ?? $this->status),
                'is_locked' => $this->is_locked
            ],
            'amount' => [
                'value' => $this->amount,
                'formatted' => Number::currency($this->amount / 100, 'TND')
            ],
            'category' => [
                'value' => $this->type,
                'label' => ucfirst($this->type ?? 'Standard')
            ],
            'gateway' => [
                'value' => $this->method,
                'label' => ucwords(str_replace('_', ' ', $this->method))
            ],
            'member' => [
                'name' => $this->user ? $this->user->name . ($this->user->last_name ? ' ' . $this->user->last_name : '') : ($this->member_name ?? 'Guest'),
                'email' => $this->user ? $this->user->email : $this->email
            ],
            'date' => $this->created_at->format('M d, Y, g:i A'),
            'is_editable' => !$this->is_locked,
            'product' => ($this->order && $this->order->products->count() > 0) ? [
                'name' => $this->order->products->first()->name,
                'id' => $this->order->products->first()->id_product
            ] : null,
            'gym_name' => $this->gym->name ?? 'Our Gym',
            'processed_by' => $this->createdBy->name ?? 'System',
        ];
    }
}
