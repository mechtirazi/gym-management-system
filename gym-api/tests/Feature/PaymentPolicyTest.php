<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\User;
use App\Policies\PaymentPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentPolicyTest extends TestCase
{
    use RefreshDatabase;

    private PaymentPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new PaymentPolicy();
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
    public function view_user_can_view_their_own_payment()
    {
        $user    = User::factory()->member()->create();
        $payment = Payment::factory()->create(['id_user' => $user->id_user]);

        $this->assertTrue($this->policy->view($user, $payment));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_any_payment()
    {
        $owner   = User::factory()->owner()->create();
        $member  = User::factory()->member()->create();
        $payment = Payment::factory()->create(['id_user' => $member->id_user]);

        $this->assertTrue($this->policy->view($owner, $payment));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_any_payment()
    {
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        $payment      = Payment::factory()->create(['id_user' => $member->id_user]);

        $this->assertTrue($this->policy->view($receptionist, $payment));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_cannot_view_another_users_payment()
    {
        $trainer = User::factory()->trainer()->create();
        $member  = User::factory()->member()->create();
        $payment = Payment::factory()->create(['id_user' => $member->id_user]);

        $this->assertFalse($this->policy->view($trainer, $payment));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_member_owner_receptionist_only()
    {
        $allowed = [User::ROLE_MEMBER, User::ROLE_OWNER, User::ROLE_RECEPTIONIST];

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
    public function update_allows_only_owner_and_receptionist()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST];
        $member  = User::factory()->member()->create();
        $payment = Payment::factory()->create(['id_user' => $member->id_user]);

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                in_array($role, $allowed),
                $this->policy->update($user, $payment),
                "update failed for role: $role"
            );
        }
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_allows_only_owner()
    {
        $member  = User::factory()->member()->create();
        $payment = Payment::factory()->create(['id_user' => $member->id_user]);

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                $role === User::ROLE_OWNER,
                $this->policy->delete($user, $payment),
                "delete failed for role: $role"
            );
        }
    }
}
