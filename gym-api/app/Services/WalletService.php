<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WalletService
{
    /**
     * Credit a user’s wallet and record a transaction.
     *
     * @throws \LogicException if user is not a member
     */
    public function creditBonus(User $user, float $amount, string $description = '', ?Model $reference = null)
    {
        if ($user->role !== User::ROLE_MEMBER) {
            throw new \LogicException('Only members may receive wallet credits.');
        }

        return DB::transaction(function () use ($user, $amount, $description, $reference) {
            $wallet = $user->wallet()->lockForUpdate()->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return $wallet->transactions()->create([
                'type'           => 'bonus',
                'amount'         => $amount,
                'description'    => $description,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id'   => $reference?->getKey(),
            ]);
        });
    }

    /**
     * Reward a user for participating in an event.
     */
    public function rewardEventParticipation(User $user, Event $event)
    {
        if ($event->reward_amount > 0 && ! $event->is_rewarded && $user->role === User::ROLE_MEMBER) {
            $transaction = $this->creditBonus(
                $user,
                $event->reward_amount,
                'Reward for event #'.$event->id,
                $event
            );

            $event->is_rewarded = true;
            $event->save();

            return $transaction;
        }

        return null;
    }
}
