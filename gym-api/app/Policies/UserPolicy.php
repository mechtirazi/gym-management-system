<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**Reviewed
     * Determine if the user can view any users
     */
    public function viewAny(User $user): bool
    {
        // Super admin and staff/owners (except members) can see user lists
        return $user->role !== User::ROLE_MEMBER;
    }

    /**
     * Determine if the user can view the user
     */
    public function view(User $user, User $targetUser): bool
    {
        // Always allow seeing self
        if ($user->id_user === $targetUser->id_user) {
            return true;
        }

        // Super Admin can only see Owners
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $targetUser->role === User::ROLE_OWNER;
        }

        // Determine whether the trainer case or standard gym overlap check applies.
        // Trainers get special treatment: they may also see members who have
        // attended one of their sessions even if there is no recorded gym
        // enrollment (e.g. a guest attending a class).
        $sameGym = $this->sharesGym($user, $targetUser);
        $sameCourse = false;
        if ($user->role === User::ROLE_TRAINER && $targetUser->role === User::ROLE_MEMBER) {
            $sameCourse = $targetUser->attendances()
                ->whereHas('session', function ($q) use ($user) {
                    $q->where('id_trainer', $user->id_user);
                })
                ->exists();
        }

        if (! ($sameGym || $sameCourse)) {
            return false;
        }

        // Owners and Receptionists can see everyone in their gym
        if (in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST])) {
            return true;
        }

        // Staff rules
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            // trainers are already covered by $sameCourse/$sameGym logic above,
            // so at this point we just need to confirm the target is a member.
            return $targetUser->role === User::ROLE_MEMBER;
        }

        return false;
    }

    /**
     * Determine if the user can create a user
     */
    public function create(User $user): bool
    {
        // Super admin can create owners
        // Owners can create any staff/member
        // Receptionists can only create members
        return in_array($user->role, [User::ROLE_SUPER_ADMIN, User::ROLE_OWNER, User::ROLE_RECEPTIONIST]);
    }

    /**
     * Determine if the user can create a user with a specific role
     */
    public function canCreateRole(User $user, string $targetRole): bool
    {
        // Super admin can only create Owners
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $targetRole === User::ROLE_OWNER;
        }

        // Owner can create trainer, member, nutritionist, receptionist (NOT owner)
        if ($user->role === User::ROLE_OWNER) {
            return in_array($targetRole, [
                User::ROLE_TRAINER,
                User::ROLE_MEMBER,
                User::ROLE_NUTRITIONIST,
                User::ROLE_RECEPTIONIST,
            ]);
        }

        // Receptionists can only create members
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $targetRole === User::ROLE_MEMBER;
        }

        // All other roles cannot create users
        return false;
    }

    /**
     * Determine if the user can create a user in a specific gym
     */
    public function canCreateInGym(User $user, $gymId): bool
    {
        // Super admin may create owners without gym scope
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return false;
        }

        $allowedGyms = $user->allowedGymIds();

        if (is_null($allowedGyms)) {
            return false;
        }

        return $allowedGyms->contains($gymId);
    }

    /**
     * Determine if the user can update a user
     */
    public function update(User $user, User $targetUser): bool
    {
        if ($user->id_user === $targetUser->id_user) {
            return true;
        }

        // Super Admin can modify Owners
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $targetUser->role === User::ROLE_OWNER;
        }

        if (! $this->sharesGym($user, $targetUser)) {
            return false;
        }

        // Owners manage everyone in their gym
        if ($user->role === User::ROLE_OWNER) {
            return true;
        }

        // Receptionists manage members only
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $targetUser->role === User::ROLE_MEMBER;
        }

        return false;
    }

    /**
     * Determine if the user can delete a user
     */
    public function delete(User $user, User $targetUser): bool
    {
        // Users cannot delete themselves via this endpoint
        if ($user->id_user === $targetUser->id_user) {
            return false;
        }

        // Super Admin can delete Owners
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $targetUser->role === User::ROLE_OWNER;
        }

        if (! $this->sharesGym($user, $targetUser)) {
            return false;
        }

        // Owners can delete anyone in their gym
        if ($user->role === User::ROLE_OWNER) {
            return true;
        }

        // Receptionists delete members only
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $targetUser->role === User::ROLE_MEMBER;
        }

        return false;
    }

    /**
     * Determine if the user can restore a user
     */
    public function restore(User $user, User $targetUser): bool
    {
        return $this->delete($user, $targetUser);
    }

    /**
     * Determine if the user can permanently delete a user
     */
    public function forceDelete(User $user, User $targetUser): bool
    {
        return $this->delete($user, $targetUser);
    }

    /**
     * Private helper to check gym overlap
     */
    private function sharesGym(User $user, User $targetUser): bool
    {
        $userGyms = $user->allowedGymIds();
        $targetGyms = $targetUser->allowedGymIds();
        return $userGyms->intersect($targetGyms)->isNotEmpty();
    }
}
