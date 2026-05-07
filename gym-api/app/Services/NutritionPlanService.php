<?php

namespace App\Services;

use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Payment;
use Illuminate\Support\Str;

class NutritionPlanService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new NutritionPlan());
        $this->setRelations(['gym', 'nutritionist', 'members', 'meals', 'supplements']);
    }

    /**
     * Get all nutrition plans filtered by user access.
     * Respects the X-Gym-Id header to scope results to a single gym when switching context.
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Respect the active gym context sent by the frontend (X-Gym-Id header)
        $activeGymId = request()->header('X-Gym-Id');

        if ($user->role === User::ROLE_OWNER) {
            if ($activeGymId) {
                // Scoped to the selected gym, but still verify ownership
                $query = $query->where('id_gym', $activeGymId)
                               ->whereHas('gym', function ($q) use ($user) {
                                   $q->where('id_owner', $user->id_user);
                               });
            } else {
                // No gym selected: return all plans from all owned gyms
                $query = $query->whereHas('gym', function ($q) use ($user) {
                    $q->where('id_owner', $user->id_user);
                });
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            if ($user->role === User::ROLE_NUTRITIONIST) {
                $query = $query->where('id_nutritionist', $user->id_user);
            }
            
            // Respect active gym context using standardized helper
            $this->applyActiveGymScope($query, $user, 'id_gym');

            // If no active gym was applied, or if we want to fallback to allowed gyms
            // applyActiveGymScope only adds WHERE if active gym is present.
            // If it's NOT present, we might still want to scope to all allowed gyms to avoid seeing EVERYTHING in the db.
            if (!$this->getActiveGymId()) {
                $query = $query->whereIn('id_gym', $user->allowedGymIds());
            }

            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_MEMBER) {
            // Members see only plans they are assigned to
            $query = $query->whereHas('members', function ($q) use ($user) {
                $q->where('users.id_user', $user->id_user);
            });
            if ($activeGymId) {
                $query = $query->where('id_gym', $activeGymId);
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return $perPage ? $query->paginate($perPage) : collect();
    }

    /**
     * Override create to sync members, meals and supplements
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        return \DB::transaction(function () use ($data) {
            $idMembers = $data['id_members'] ?? [];
            $meals = $data['meals'] ?? [];
            $supplements = $data['supplements'] ?? [];

            // Handle base64 image if present
            if (isset($data['image']) && strpos($data['image'], 'data:image') === 0) {
                $data['image'] = $this->saveBase64Image($data['image'], 'nutrition_plans');
            }

            unset($data['id_members'], $data['meals'], $data['supplements']);

            $plan = $this->model->create($data);

            if (!empty($idMembers)) {
                $plan->members()->sync($idMembers);
            }

            foreach ($meals as $meal) {
                $plan->meals()->create($meal);
            }

            foreach ($supplements as $supplement) {
                $plan->supplements()->create($supplement);
            }

            return $plan->fresh($this->relations);
        });
    }

    /**
     * Override update to sync members, meals and supplements
     */
    public function update(\Illuminate\Database\Eloquent\Model $plan, array $data): \Illuminate\Database\Eloquent\Model
    {
        return \DB::transaction(function () use ($plan, $data) {
            // Handle base64 image if present
            if (isset($data['image']) && strpos($data['image'], 'data:image') === 0) {
                $data['image'] = $this->saveBase64Image($data['image'], 'nutrition_plans');
            }

            if (array_key_exists('id_members', $data)) {
                $idMembers = $data['id_members'] ?? [];
                $plan->members()->sync($idMembers);
                unset($data['id_members']);
            }

            if (array_key_exists('meals', $data)) {
                $plan->meals()->delete();
                foreach ($data['meals'] as $meal) {
                    $plan->meals()->create($meal);
                }
                unset($data['meals']);
            }

            if (array_key_exists('supplements', $data)) {
                $plan->supplements()->delete();
                foreach ($data['supplements'] as $supplement) {
                    $plan->supplements()->create($supplement);
                }
                unset($data['supplements']);
            }

            $plan->update($data);

            return $plan->fresh($this->relations);
        });
    }

    /**
     * Save base64 image to storage
     */
    private function saveBase64Image(string $base64, string $folder): string
    {
        try {
            $format = explode('/', explode(':', substr($base64, 0, strpos($base64, ';')))[1])[1];
            $image = str_replace(' ', '+', substr($base64, strpos($base64, ',') + 1));
            $imageName = Str::random(20) . '.' . $format;
            $path = $folder . '/' . $imageName;
            
            \Storage::disk('public')->put($path, base64_decode($image));
            
            return $path;
        } catch (\Exception $e) {
            \Log::error('Base64 Image Save Error: ' . $e->getMessage());
            return $base64; // Fallback to raw if it fails
        }
    }

    /**
     * Get plans by nutritionist ID
     */
    public function getPlansByNutritionistId($nutritionistId)
    {
        return $this->getBy('id_nutritionist', $nutritionistId);
    }

    /**
     * Get plans by member ID
     */
    public function getPlansByMemberId($memberId)
    {
        return $this->getBy('id_member', $memberId);
    }

    /**
     * Get active plans
     */
    public function getActivePlans()
    {
        return $this->query()
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();
    }

    /**
     * Purchase a nutrition plan for a member.
     */
    public function purchase(NutritionPlan $plan, User $user, array $data = [])
    {
        $method = $data['method'] ?? 'zen_wallet';
        
        return \DB::transaction(function () use ($plan, $user, $method) {
            // 1. Check if already owned
            if ($plan->members()->where('users.id_user', $user->id_user)->exists()) {
                throw new \Exception('You already have this metabolic protocol synchronized.');
            }

            $price = $plan->price ?? 19.99; // Default price if not set

            if ($method === 'zen_wallet') {
                // 2. Check wallet balance for this gym
                $wallet = $user->walletForGym($plan->id_gym);
                
                if (!$wallet || $wallet->balance < $price) {
                    throw new \Exception('Insufficient Zen Credits. Required: ' . $price . ' pts.');
                }

                // 3. Deduct from wallet
                $wallet->decrement('balance', $price);

                // 4. Create Wallet Transaction
                \App\Models\WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'amount' => $price,
                    'type' => 'debit',
                    'description' => "Nutrition Protocol Acquisition: {$plan->name}",
                    'reference_type' => NutritionPlan::class,
                    'reference_id' => $plan->id_plan
                ]);

                // 5. Create Payment Record (Zen Wallet)
                \App\Models\Payment::create([
                    'id_user' => $user->id_user,
                    'id_gym' => $plan->id_gym,
                    'amount' => $price,
                    'method' => 'zen_wallet',
                    'type' => Payment::TYPE_NUTRITION,
                    'status' => 'finalized',
                    'id_transaction' => 'ZEN-NUT-' . strtoupper(\Str::random(12))
                ]);
            } else {
                // 5. Create Payment Record (Credit Card / External)
                \App\Models\Payment::create([
                    'id_user' => $user->id_user,
                    'id_gym' => $plan->id_gym,
                    'amount' => $price,
                    'method' => 'credit_card',
                    'type' => Payment::TYPE_NUTRITION,
                    'status' => 'finalized',
                    'id_transaction' => 'EXT-NUT-' . strtoupper(\Str::random(12))
                ]);
            }

            // 6. Sync Member to Plan
            $plan->members()->attach($user->id_user);

            return [
                'success' => true,
                'message' => 'Protocol Synchronized!',
                'new_balance' => ($method === 'zen_wallet' && isset($wallet)) ? $wallet->fresh()->balance : null
            ];
        });
    }
}
