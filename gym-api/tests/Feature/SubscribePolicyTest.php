<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Subscribe;
use App\Models\User;
use App\Policies\SubscribePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscribePolicyTest extends TestCase
{
    use RefreshDatabase;

    private SubscribePolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new SubscribePolicy();
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private function makeSubscription(User $member, User $gymOwner): array
    {
        $gym  = Gym::factory()->create(['id_owner' => $gymOwner->id_user]);
        $sub  = Subscribe::factory()->create([
            'id_user' => $member->id_user,
            'id_gym'  => $gym->id_gym,
        ]);

        return compact('gym', 'sub');
    }

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
    public function viewAny_allows_owner_receptionist_member_only()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST, User::ROLE_MEMBER];

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
    public function view_member_can_view_their_own_subscription()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->view($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_cannot_view_another_members_subscription()
    {
        $gymOwner    = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($otherMember, $gymOwner);

        $this->assertFalse($this->policy->view($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_subscription_to_their_gym()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->view($gymOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_cannot_view_subscription_to_other_gym()
    {
        $gymOwner  = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member    = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->view($otherOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_subscription_in_assigned_gym()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'sub' => $sub] = $this->makeSubscription($member, $gymOwner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->view($receptionist, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_cannot_view_subscription_in_unassigned_gym()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->view($receptionist, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_is_denied()
    {
        $gymOwner = User::factory()->owner()->create();
        $trainer  = User::factory()->trainer()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->view($trainer, $sub));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_only_member()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                $role === User::ROLE_MEMBER,
                $this->policy->create($user),
                "create failed for role: $role"
            );
        }
    }

    // ─────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_can_update_their_own_subscription()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->update($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_cannot_update_another_members_subscription()
    {
        $gymOwner    = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($otherMember, $gymOwner);

        $this->assertFalse($this->policy->update($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_can_update_subscription_to_their_gym()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->update($gymOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_cannot_update_subscription_to_other_gym()
    {
        $gymOwner   = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->update($otherOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_is_denied()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->update($receptionist, $sub));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_can_delete_their_own_subscription()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->delete($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_cannot_delete_another_members_subscription()
    {
        $gymOwner    = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($otherMember, $gymOwner);

        $this->assertFalse($this->policy->delete($member, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_subscription_to_their_gym()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertTrue($this->policy->delete($gymOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_cannot_delete_subscription_to_other_gym()
    {
        $gymOwner   = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member     = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->delete($otherOwner, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_is_denied()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->delete($receptionist, $sub));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $gymOwner = User::factory()->owner()->create();
        $trainer  = User::factory()->trainer()->create();
        $member   = User::factory()->member()->create();
        ['sub' => $sub] = $this->makeSubscription($member, $gymOwner);

        $this->assertFalse($this->policy->delete($trainer, $sub));
    }
}
