<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Policies\ProductPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPolicyTest extends TestCase
{
    use RefreshDatabase;

    private ProductPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new ProductPolicy();
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_every_role()
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
    public function view_allows_every_role()
    {
        $product = Product::factory()->create();

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertTrue($this->policy->view($user, $product), "view failed for role: $role");
        }
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
    public function update_allows_only_owner_and_receptionist()
    {
        $allowed = [User::ROLE_OWNER, User::ROLE_RECEPTIONIST];
        $product = Product::factory()->create();

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                in_array($role, $allowed),
                $this->policy->update($user, $product),
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
        $product = Product::factory()->create();

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                $role === User::ROLE_OWNER,
                $this->policy->delete($user, $product),
                "delete failed for role: $role"
            );
        }
    }
}
