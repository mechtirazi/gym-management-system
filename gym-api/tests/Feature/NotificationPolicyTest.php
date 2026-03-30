<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Policies\NotificationPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPolicyTest extends TestCase
{
    use RefreshDatabase;

    private NotificationPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new NotificationPolicy();
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_every_valid_role()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertTrue($this->policy->viewAny($user), "viewAny failed for role: $role");
        }
    }

    // ─────────────────────────────────────────────
    // view
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_user_can_view_their_own_notification()
    {
        $user  = User::factory()->create();
        $notif = Notification::factory()->create(['id_user' => $user->id_user]);

        $this->assertTrue($this->policy->view($user, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_user_cannot_view_another_users_notification()
    {
        $user      = User::factory()->create();
        $otherUser = User::factory()->create();
        $other     = Notification::factory()->create(['id_user' => $otherUser->id_user]);

        $this->assertFalse($this->policy->view($user, $other));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_only_owner_and_receptionist()
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
    public function update_owner_can_update_any_notification()
    {
        $owner = User::factory()->owner()->create();
        $notif = Notification::factory()->create(); // belongs to someone else

        $this->assertTrue($this->policy->update($owner, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_any_notification()
    {
        $receptionist = User::factory()->receptionist()->create();
        $notif        = Notification::factory()->create();

        $this->assertTrue($this->policy->update($receptionist, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_user_can_update_their_own_notification()
    {
        $user  = User::factory()->member()->create();
        $notif = Notification::factory()->create(['id_user' => $user->id_user]);

        $this->assertTrue($this->policy->update($user, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_user_cannot_update_another_users_notification()
    {
        $user      = User::factory()->trainer()->create();
        $otherUser = User::factory()->create();
        $notif     = Notification::factory()->create(['id_user' => $otherUser->id_user]);

        $this->assertFalse($this->policy->update($user, $notif));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_user_can_delete_their_own_notification()
    {
        $user  = User::factory()->member()->create();
        $notif = Notification::factory()->create(['id_user' => $user->id_user]);

        $this->assertTrue($this->policy->delete($user, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_any_notification()
    {
        $owner = User::factory()->owner()->create();
        $notif = Notification::factory()->create();

        $this->assertTrue($this->policy->delete($owner, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_any_notification()
    {
        $receptionist = User::factory()->receptionist()->create();
        $notif        = Notification::factory()->create();

        $this->assertTrue($this->policy->delete($receptionist, $notif));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_cannot_delete_another_users_notification()
    {
        $trainer   = User::factory()->trainer()->create();
        $otherUser = User::factory()->create();
        $notif     = Notification::factory()->create(['id_user' => $otherUser->id_user]);

        $this->assertFalse($this->policy->delete($trainer, $notif));
    }
}
