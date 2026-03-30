<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPolicyTest extends TestCase
{
    use RefreshDatabase;

    private UserPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new UserPolicy();
    }

    /**
     * Helper to associate a user with a gym as staff
     */
    private function assignToGym(User $user, Gym $gym): void
    {
        GymStaff::factory()->create([
            'id_user' => $user->id_user,
            'id_gym' => $gym->id_gym,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_all_except_members()
    {
        $roles = [
            User::ROLE_SUPER_ADMIN => true,
            User::ROLE_OWNER => true,
            User::ROLE_TRAINER => true,
            User::ROLE_NUTRITIONIST => true,
            User::ROLE_RECEPTIONIST => true,
            User::ROLE_MEMBER => false,
        ];

        foreach ($roles as $role => $expected) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals($expected, $this->policy->viewAny($user), "Failed for role: $role");
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_allows_self()
    {
       
        $roles = [
            User::ROLE_SUPER_ADMIN => true,
            User::ROLE_OWNER => true,
            User::ROLE_TRAINER => true,
            User::ROLE_NUTRITIONIST => true,
            User::ROLE_RECEPTIONIST => true,
            User::ROLE_MEMBER => false,
        ];

        foreach ($roles as $role => $expected) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals($expected, $this->policy->view($user,$user), "Failed for role: $role");
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_super_admin_can_only_see_owners()
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();

        $this->assertTrue($this->policy->view($admin, $owner));
        $this->assertFalse($this->policy->view($admin, $trainer));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_checks_gym_sharing()
    {
        $owner = User::factory()->owner()->create();
        $gym1 = Gym::factory()->create(['id_owner' => $owner->id_user]);
        
        $otherOwner = User::factory()->owner()->create();
        $gym2 = Gym::factory()->create(['id_owner' => $otherOwner->id_user]);

        $memberSameGym = User::factory()->member()->create();
        $this->assignToGym($memberSameGym, $gym1);

        $memberOtherGym = User::factory()->member()->create();
        $this->assignToGym($memberOtherGym, $gym2);

        $this->assertTrue($this->policy->view($owner, $memberSameGym));
        $this->assertFalse($this->policy->view($owner, $memberOtherGym));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_staff_permissions_within_gym()
    {
        $owner = User::factory()->owner()->create();
        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        
        $trainer = User::factory()->trainer()->create();
        $this->assignToGym($trainer, $gym);

        $otherTrainer = User::factory()->trainer()->create();
        $this->assignToGym($otherTrainer, $gym);

        $member = User::factory()->member()->create();
        $this->assignToGym($member, $gym);

        // Trainers can see members in same gym
        $this->assertTrue($this->policy->view($trainer, $member));
        
        // Trainers cannot see other staff (trainers/nutritionists) even in same gym
        $this->assertFalse($this->policy->view($trainer, $otherTrainer));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_role_restrictions()
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $trainer = User::factory()->trainer()->create();

        $this->assertTrue($this->policy->create($admin));
        $this->assertTrue($this->policy->create($owner));
        $this->assertTrue($this->policy->create($receptionist));
        $this->assertFalse($this->policy->create($trainer));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function canCreateRole_matrix()
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();

        // Admin -> Owner only
        $this->assertTrue($this->policy->canCreateRole($admin, User::ROLE_OWNER));
        $this->assertFalse($this->policy->canCreateRole($admin, User::ROLE_MEMBER));

        // Owner -> All staff + members (but not owner)
        $this->assertTrue($this->policy->canCreateRole($owner, User::ROLE_TRAINER));
        $this->assertTrue($this->policy->canCreateRole($owner, User::ROLE_MEMBER));
        $this->assertFalse($this->policy->canCreateRole($owner, User::ROLE_OWNER));
        $this->assertFalse($this->policy->canCreateRole($owner, User::ROLE_SUPER_ADMIN));

        // Receptionist -> Member only
        $this->assertTrue($this->policy->canCreateRole($receptionist, User::ROLE_MEMBER));
        $this->assertFalse($this->policy->canCreateRole($receptionist, User::ROLE_TRAINER));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function canCreateInGym_logic()
    {
        $owner = User::factory()->owner()->create();
        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        
        $admin = User::factory()->superAdmin()->create();
        $otherOwner = User::factory()->owner()->create();

        $this->assertTrue($this->policy->canCreateInGym($admin, $gym->id_gym));
        $this->assertTrue($this->policy->canCreateInGym($owner, $gym->id_gym));
        $this->assertFalse($this->policy->canCreateInGym($otherOwner, $gym->id_gym));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_permissions()
    {
        $owner = User::factory()->owner()->create();
        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        
        $receptionist = User::factory()->receptionist()->create();
        $this->assignToGym($receptionist, $gym);

        $member = User::factory()->member()->create();
        $this->assignToGym($member, $gym);

        $trainer = User::factory()->trainer()->create();
        $this->assignToGym($trainer, $gym);

        // Owner can update everyone in gym
        $this->assertTrue($this->policy->update($owner, $member));
        $this->assertTrue($this->policy->update($owner, $trainer));

        // Receptionist can only update members
        $this->assertTrue($this->policy->update($receptionist, $member));
        $this->assertFalse($this->policy->update($receptionist, $trainer));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_restrictions()
    {
        $user = User::factory()->create();
        
        // Cannot delete self
        $this->assertFalse($this->policy->delete($user, $user));

        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->owner()->create();
        
        // Admin can delete owners
        $this->assertTrue($this->policy->delete($admin, $owner));
        
        // Admin cannot delete members (directly via policy logic)
        $member = User::factory()->member()->create();
        $this->assertFalse($this->policy->delete($admin, $member));
    }

}
