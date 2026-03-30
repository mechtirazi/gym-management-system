<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Session;
use App\Models\User;
use App\Policies\SessionPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionPolicyTest extends TestCase
{
    use RefreshDatabase;

    private SessionPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new SessionPolicy();
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    /**
     * Build a gym → course → session chain owned by $owner,
     * optionally assigning $trainer as the session trainer.
     */
    private function makeSession(User $owner, ?User $trainer = null): array
    {
        $gym     = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $course  = Course::factory()->create(['id_gym' => $gym->id_gym]);
        $session = Session::factory()->create([
            'id_course'  => $course->id_course,
            'id_trainer' => $trainer?->id_user ?? User::factory()->trainer()->create()->id_user,
        ]);

        return compact('gym', 'course', 'session');
    }

    /**
     * Assign a staff user (trainer / receptionist) to a gym via gym_staff.
     */
    private function assignStaffToGym(User $user, Gym $gym): void
    {
        GymStaff::factory()->create([
            'id_user' => $user->id_user,
            'id_gym'  => $gym->id_gym,
        ]);
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_member_owner_trainer_receptionist_only()
    {
        $allowed = [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST,
        ];

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                in_array($role, $allowed),
                $this->policy->viewAny($user),
                "viewAny failed for role: $role"
            );
        }
    }

    // ─────────────────────────────────────────────
    // view
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_can_view_any_session()
    {
        $owner   = User::factory()->owner()->create();
        $member  = User::factory()->member()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertTrue($this->policy->view($member, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_can_view_their_own_session()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['session' => $session] = $this->makeSession($owner, $trainer);

        $this->assertTrue($this->policy->view($trainer, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_denied_for_another_trainers_session()
    {
        $owner        = User::factory()->owner()->create();
        $trainer      = User::factory()->trainer()->create();
        $otherTrainer = User::factory()->trainer()->create();
        ['session' => $session] = $this->makeSession($owner, $trainer);

        $this->assertFalse($this->policy->view($otherTrainer, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_session_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertTrue($this->policy->view($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_denied_session_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($otherOwner);

        $this->assertFalse($this->policy->view($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_session_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'session' => $session] = $this->makeSession($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->view($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        // receptionist NOT assigned
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->view($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_super_admin_is_denied()
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $owner      = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->view($superAdmin, $session));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_owner_and_receptionist_only()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST];

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                in_array($role, $allowed),
                $this->policy->create($user),
                "create failed for role: $role"
            );
        }
    }

    // ─────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_can_update_their_own_session()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['session' => $session] = $this->makeSession($owner, $trainer);

        $this->assertTrue($this->policy->update($trainer, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_denied_for_another_trainers_session()
    {
        $owner        = User::factory()->owner()->create();
        $trainer      = User::factory()->trainer()->create();
        $otherTrainer = User::factory()->trainer()->create();
        ['session' => $session] = $this->makeSession($owner, $trainer);

        $this->assertFalse($this->policy->update($otherTrainer, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_can_update_session_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertTrue($this->policy->update($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_denied_session_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($otherOwner);

        $this->assertFalse($this->policy->update($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'session' => $session] = $this->makeSession($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->update($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->update($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->update($member, $session));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_session_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertTrue($this->policy->delete($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_denied_session_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['session' => $session] = $this->makeSession($otherOwner);

        $this->assertFalse($this->policy->delete($owner, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'session' => $session] = $this->makeSession($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->delete($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->delete($receptionist, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['session' => $session] = $this->makeSession($owner, $trainer);

        $this->assertFalse($this->policy->delete($trainer, $session));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['session' => $session] = $this->makeSession($owner);

        $this->assertFalse($this->policy->delete($member, $session));
    }
}
