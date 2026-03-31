<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderPolicyTest extends TestCase
{
    use RefreshDatabase;

    private OrderPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new OrderPolicy();
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_owner_receptionist_nutritionist_member_only()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
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
    public function view_member_can_view_their_own_order()
    {
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->view($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_cannot_view_another_members_order()
    {
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        $order       = Order::factory()->create(['id_member' => $otherMember->id_user]);

        $this->assertFalse($this->policy->view($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_any_order()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->view($owner, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_any_order()
    {
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->view($receptionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_can_view_any_order()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->view($nutritionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_is_denied()
    {
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        $order   = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertFalse($this->policy->view($trainer, $order));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_owner_receptionist_nutritionist_member()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_NUTRITIONIST,
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
    public function update_member_can_update_their_own_pending_order()
    {
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create([
            'id_member' => $member->id_user,
            'status'    => Order::STATUS_PENDING,
        ]);

        $this->assertTrue($this->policy->update($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_cannot_update_confirmed_order()
    {
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create([
            'id_member' => $member->id_user,
            'status'    => Order::STATUS_CONFIRMED,
        ]);

        $this->assertFalse($this->policy->update($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_cannot_update_another_members_order()
    {
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        $order       = Order::factory()->create([
            'id_member' => $otherMember->id_user,
            'status'    => Order::STATUS_PENDING,
        ]);

        $this->assertFalse($this->policy->update($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_can_update_any_order()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->update($owner, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_any_order()
    {
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->update($receptionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_nutritionist_can_update_any_order()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->update($nutritionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_trainer_is_denied()
    {
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        $order   = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertFalse($this->policy->update($trainer, $order));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_can_delete_their_own_pending_order()
    {
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create([
            'id_member' => $member->id_user,
            'status'    => Order::STATUS_PENDING,
        ]);

        $this->assertTrue($this->policy->delete($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_cannot_delete_confirmed_order()
    {
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create([
            'id_member' => $member->id_user,
            'status'    => Order::STATUS_CONFIRMED,
        ]);

        $this->assertFalse($this->policy->delete($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_cannot_delete_another_members_order()
    {
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        $order       = Order::factory()->create([
            'id_member' => $otherMember->id_user,
            'status'    => Order::STATUS_PENDING,
        ]);

        $this->assertFalse($this->policy->delete($member, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_any_order()
    {
        $owner  = User::factory()->owner()->create();
        $member = User::factory()->member()->create();
        $order  = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertTrue($this->policy->delete($owner, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_is_denied()
    {
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertFalse($this->policy->delete($receptionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_nutritionist_is_denied()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $order        = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertFalse($this->policy->delete($nutritionist, $order));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_is_denied()
    {
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        $order   = Order::factory()->create(['id_member' => $member->id_user]);

        $this->assertFalse($this->policy->delete($trainer, $order));
    }
}
