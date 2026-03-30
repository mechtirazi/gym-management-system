<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Subscribe;
use App\Models\User;
use App\Policies\EventPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventPolicyTest extends TestCase
{
    use RefreshDatabase;

    private EventPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new EventPolicy();
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
     * Assign a staff user (trainer / receptionist / nutritionist) to a gym.
     */
    private function assignStaffToGym(User $user, Gym $gym): void
    {
        GymStaff::factory()->create([
            'id_user' => $user->id_user,
            'id_gym'  => $gym->id_gym,
        ]);
    }

    /**
     * Subscribe a member to a gym.
     */
    private function subscribeMemberToGym(User $member, Gym $gym): void
    {
        Subscribe::factory()->create([
            'id_user' => $member->id_user,
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
    public function view_owner_can_view_event_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertTrue($this->policy->view($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_denied_event_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);

        $this->assertFalse($this->policy->view($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_event_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->view($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->view($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_can_view_event_in_assigned_gym()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);

        $this->assertTrue($this->policy->view($trainer, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_denied_in_unassigned_gym()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->view($trainer, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_can_view_event_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($nutritionist, $gym);

        $this->assertTrue($this->policy->view($nutritionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->view($nutritionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_can_view_event_in_subscribed_gym()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->subscribeMemberToGym($member, $gym);

        $this->assertTrue($this->policy->view($member, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_denied_event_in_unsubscribed_gym()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        // member NOT subscribed
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->view($member, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_super_admin_is_denied()
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $owner      = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->view($superAdmin, $event));
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
    public function update_owner_can_update_event_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertTrue($this->policy->update($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_denied_event_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);

        $this->assertFalse($this->policy->update($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->update($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->update($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);

        $this->assertFalse($this->policy->update($trainer, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->update($member, $event));
    }

    // ─────────────────────────────────────────────
    // delete  (delegates to update)
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_event_in_their_gym()
    {
        $owner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertTrue($this->policy->delete($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_denied_event_in_other_gym()
    {
        $owner      = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        ['event' => $event] = $this->makeEvent($otherOwner);

        $this->assertFalse($this->policy->delete($owner, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_in_assigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->delete($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_denied_in_unassigned_gym()
    {
        $owner        = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->delete($receptionist, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $owner   = User::factory()->owner()->create();
        $trainer = User::factory()->trainer()->create();
        ['gym' => $gym, 'event' => $event] = $this->makeEvent($owner);
        $this->assignStaffToGym($trainer, $gym);

        $this->assertFalse($this->policy->delete($trainer, $event));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_is_denied()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        ['event' => $event] = $this->makeEvent($owner);

        $this->assertFalse($this->policy->delete($member, $event));
    }
}
