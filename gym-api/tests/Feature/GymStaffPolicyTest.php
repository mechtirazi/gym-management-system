<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\User;
use App\Policies\GymStaffPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GymStaffPolicyTest extends TestCase
{
    use RefreshDatabase;

    private GymStaffPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new GymStaffPolicy();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_roles()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST];
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(in_array($role, $allowed), $this->policy->viewAny($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function owner_can_view_update_delete_own_staff()
    {
        $owner = User::factory()->owner()->create();
        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $staff = GymStaff::factory()->create(['id_gym' => $gym->id_gym]);

        $this->assertTrue($this->policy->view($owner, $staff));
        $this->assertTrue($this->policy->update($owner, $staff));
        $this->assertTrue($this->policy->delete($owner, $staff));

        $otherOwner = User::factory()->owner()->create();
        $this->assertFalse($this->policy->view($otherOwner, $staff));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function receptionist_can_view_only_assigned_gym_staff()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $trainer      = User::factory()->trainer()->create();
        $gym          = Gym::factory()->create(['id_owner' => $owner->id_user]);

        // staff record explicitly owned by the trainer (not the receptionist)
        $staff = GymStaff::factory()->create([
            'id_gym'  => $gym->id_gym,
            'id_user' => $trainer->id_user,
        ]);

        // receptionist not assigned to the gym yet — should be denied
        $this->assertFalse($this->policy->view($receptionist, $staff));

        // now assign the receptionist to the gym
        GymStaff::factory()->create([
            'id_user' => $receptionist->id_user,
            'id_gym'  => $gym->id_gym,
        ]);
        $this->assertTrue($this->policy->view($receptionist, $staff));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function only_owner_can_create()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $expected = $role === User::ROLE_OWNER;
            $this->assertEquals($expected, $this->policy->create($user));
        }
    }
}
