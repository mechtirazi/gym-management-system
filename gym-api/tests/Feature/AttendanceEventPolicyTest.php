<?php

namespace Tests\Feature;

use App\Models\AttendanceEvent;
use App\Models\Event;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\User;
use App\Policies\AttendanceEventPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceEventPolicyTest extends TestCase
{
    use RefreshDatabase;

    private AttendanceEventPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new AttendanceEventPolicy();
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    /**
     * Create a gym owned by $owner and an event inside it.
     */
    private function makeEvent(User $owner): array
    {
        $gym   = Gym::factory()->create(['id_owner' => $owner->id_user]);
        $event = Event::factory()->create(['id_gym' => $gym->id_gym]);

        return compact('gym', 'event');
    }

    /**
     * Create an AttendanceEvent record for $member attending $event.
     */
    private function makeAttendanceEvent(User $member, Event $event): AttendanceEvent
    {
        return AttendanceEvent::factory()->create([
            'id_member' => $member->id_user,
            'id_event'  => $event->id_event,
        ]);
    }

    /**
     * Assign a staff user (trainer / receptionist / nutritionist) to a gym.
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
    public function viewAny_allows_all_roles_except_super_admin()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_MEMBER,
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
    public function view_owner_can_view_attendance_in_their_gym()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->view($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->view($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_attendance_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->view($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->view($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_can_view_attendance_in_assigned_gym()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->view($trainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_denied_in_unassigned_gym()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->view($trainer, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_can_view_attendance_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($nutritionist, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->view($nutritionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->view($nutritionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_can_view_their_own_attendance()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->view($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_cannot_view_another_members_attendance()
    {
        $owner       = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($otherMember, $event);

        $this->assertFalse($this->policy->view($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_super_admin_is_denied()
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $owner      = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->view($superAdmin, $att));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_owner_receptionist_and_member_only()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
        ];

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
    public function update_owner_can_update_attendance_in_their_gym()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->update($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->update($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->update($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->update($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_can_update_their_own_attendance()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->update($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_cannot_update_another_members_attendance()
    {
        $owner       = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($otherMember, $event);

        $this->assertFalse($this->policy->update($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->update($trainer, $att));
    }

    // ─────────────────────────────────────────────
    // delete  (delegates to update)
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_attendance_in_their_gym()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->delete($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_denied_attendance_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->delete($owner, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->delete($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->delete($receptionist, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_can_delete_their_own_attendance()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertTrue($this->policy->delete($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_cannot_delete_another_members_attendance()
    {
        $owner       = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);
        $att = $this->makeAttendanceEvent($otherMember, $event);

        $this->assertFalse($this->policy->delete($member, $att));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);
        $att = $this->makeAttendanceEvent($member, $event);

        $this->assertFalse($this->policy->delete($trainer, $att));
    }
}
