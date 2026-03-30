<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\Gym;
use App\Models\User;
use App\Policies\EnrollmentPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentPolicyTest extends TestCase
{
    use RefreshDatabase;

    private EnrollmentPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new EnrollmentPolicy();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_roles()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST, User::ROLE_MEMBER];
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(in_array($role, $allowed), $this->policy->viewAny($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function member_can_view_own_enrollment_only()
    {
        $member = User::factory()->member()->create();
        $enr = Enrollment::factory()->create(['id_member' => $member->id_user]);
        $other = Enrollment::factory()->create();

        $this->assertTrue($this->policy->view($member, $enr));
        $this->assertFalse($this->policy->view($member, $other));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function receptionists_and_owners_can_create_and_update()
    {
        $owner = User::factory()->owner()->create();
        $recept = User::factory()->receptionist()->create();
        $this->assertTrue($this->policy->create($owner));
        $this->assertTrue($this->policy->create($recept));
        $this->assertFalse($this->policy->create(User::factory()->member()->create()));
    }
}
