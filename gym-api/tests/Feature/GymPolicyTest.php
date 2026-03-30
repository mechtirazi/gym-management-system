<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use App\Models\GymStaff;
use App\Policies\GymPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GymPolicyTest extends TestCase
{
    use RefreshDatabase;

    private GymPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new GymPolicy();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_roles()
    {
        $allowed = [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST,
        ];

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(in_array($role, $allowed), $this->policy->viewAny($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_logic_based_on_role()
    {
        $owner = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member = User::factory()->member()->create();
        $owner2 = User::factory()->owner()->create();

        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $otherGym = Gym::factory()->create(['id_owner' => $owner2->id_user]);

        // member can view any gym
        $this->assertTrue($this->policy->view($member, $gym));
        $this->assertTrue($this->policy->view($member, $otherGym));

        // owner only own gym
        $this->assertTrue($this->policy->view($owner, $gym));
        $this->assertFalse($this->policy->view($owner, $otherGym));

        // assigned gym logic
        // assign trainer via GymStaff factory
        GymStaff::factory()->create([
            'id_user' => $trainer->id_user,
            'id_gym' => $gym->id_gym,
        ]);
        $this->assertTrue($this->policy->view($trainer, $gym));
        $this->assertFalse($this->policy->view($trainer, $otherGym));

        GymStaff::factory()->create([
            'id_user' => $receptionist->id_user,
            'id_gym' => $otherGym->id_gym,
        ]);
        $this->assertTrue($this->policy->view($receptionist, $otherGym));
        $this->assertFalse($this->policy->view($receptionist, $gym));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_only_owner()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $expected = $role === User::ROLE_OWNER;
            $this->assertEquals($expected, $this->policy->create($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_and_delete_only_owner_own_gym()
    {
        $owner = User::factory()->owner()->create();
        $other = User::factory()->owner()->create();

        $gym = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $otherGym = Gym::factory()->create(['id_owner' => $other->id_user]);

        $this->assertTrue($this->policy->update($owner, $gym));
        $this->assertFalse($this->policy->update($owner, $otherGym));

        $this->assertTrue($this->policy->delete($owner, $gym));
        $this->assertFalse($this->policy->delete($owner, $otherGym));
    }
}
