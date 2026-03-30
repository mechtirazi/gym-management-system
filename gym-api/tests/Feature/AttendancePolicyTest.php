<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Course;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Session;
use App\Models\User;
use App\Policies\AttendancePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendancePolicyTest extends TestCase
{
    use RefreshDatabase;

    private AttendancePolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new AttendancePolicy();
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

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

    /**
     * Build a full attendance record: gym → course → session → attendance.
     */
    private function makeAttendance(User $owner, ?User $trainer = null): array
    {
        $gym     = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $course  = Course::factory()->create(['id_gym' => $gym->id_gym]);
        $session = Session::factory()->create([
            'id_course'  => $course->id_course,
            'id_trainer' => $trainer?->id_user ?? User::factory()->trainer()->create()->id_user,
        ]);
        $att = Attendance::factory()->create(['id_session' => $session->id_session]);

        return compact('gym', 'course', 'session', 'att');
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_owner_trainer_receptionist_only()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_TRAINER, User::ROLE_RECEPTIONIST];
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
    public function view_member_can_view_their_own_attendance()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['session' => $session] = $this->makeAttendance($owner);

        // Attendance explicitly tied to this member
        $att = Attendance::factory()->create([
            'id_session' => $session->id_session,
            'id_member'  => $member->id_user,
        ]);

        $this->assertTrue($this->policy->view($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_cannot_view_another_members_attendance()
    {
        $owner        = User::factory()->owner()->create();
        $member       = User::factory()->member()->create();
        $otherMember  = User::factory()->member()->create();
        ['session' => $session] = $this->makeAttendance($owner);

        // Attendance belongs to otherMember, not member
        $att = Attendance::factory()->create([
            'id_session' => $session->id_session,
            'id_member'  => $otherMember->id_user,
        ]);

        $this->assertFalse($this->policy->view($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_can_view_their_own_session_attendance()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['att' => $att] = $this->makeAttendance($owner, $trainer);

        $this->assertTrue($this->policy->view($trainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_denied_for_other_trainers_session()
    {
        $owner        = User::factory()->owner()->create();
        $trainer      = User::factory()->trainer()->create();
        $otherTrainer = User::factory()->trainer()->create();
        ['att' => $att] = $this->makeAttendance($owner, $trainer);

        $this->assertFalse($this->policy->view($otherTrainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_attendance_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertTrue($this->policy->view($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($otherOwner);

        $this->assertFalse($this->policy->view($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_attendance_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'att' => $att] = $this->makeAttendance($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->view($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        // receptionist NOT assigned to the gym
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->view($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_super_admin_is_denied()
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $owner      = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->view($superAdmin, $att));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_owner_trainer_receptionist()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_TRAINER, User::ROLE_RECEPTIONIST];
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
    public function update_trainer_can_update_their_own_session_attendance()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['att' => $att] = $this->makeAttendance($owner, $trainer);

        $this->assertTrue($this->policy->update($trainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_denied_for_other_trainers_session()
    {
        $owner        = User::factory()->owner()->create();
        $trainer      = User::factory()->trainer()->create();
        $otherTrainer = User::factory()->trainer()->create();
        ['att' => $att] = $this->makeAttendance($owner, $trainer);

        $this->assertFalse($this->policy->update($otherTrainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_can_update_attendance_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertTrue($this->policy->update($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($otherOwner);

        $this->assertFalse($this->policy->update($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'att' => $att] = $this->makeAttendance($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->update($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->update($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->update($member, $att));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_attendance_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertTrue($this->policy->delete($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['att' => $att] = $this->makeAttendance($otherOwner);

        $this->assertFalse($this->policy->delete($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'att' => $att] = $this->makeAttendance($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->delete($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->delete($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['att' => $att] = $this->makeAttendance($owner, $trainer);

        $this->assertFalse($this->policy->delete($trainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['att' => $att] = $this->makeAttendance($owner);

        $this->assertFalse($this->policy->delete($member, $att));
    }
}
