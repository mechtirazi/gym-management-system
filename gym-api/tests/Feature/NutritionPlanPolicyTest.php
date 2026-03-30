<?php

namespace Tests\Feature;

use App\Models\NutritionPlan;
use App\Models\User;
use App\Policies\NutritionPlanPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NutritionPlanPolicyTest extends TestCase
{
    use RefreshDatabase;

    private NutritionPlanPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new NutritionPlanPolicy();
    }

    // ─────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────

    private function makePlan(User $nutritionist, User $member): NutritionPlan
    {
        return NutritionPlan::factory()->create([
            'id_nutritionist' => $nutritionist->id_user,
            'id_member'       => $member->id_user,
        ]);
    }

    // ─────────────────────────────────────────────
    // viewAny
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_allows_owner_nutritionist_receptionist_member()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_RECEPTIONIST,
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
    public function view_member_can_view_their_own_plan()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->view($member, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_member_cannot_view_another_members_plan()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $otherMember  = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $otherMember);

        $this->assertFalse($this->policy->view($member, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_can_view_their_own_plan()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->view($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_nutritionist_cannot_view_another_nutritionists_plan()
    {
        $nutritionist      = User::factory()->nutritionist()->create();
        $otherNutritionist = User::factory()->nutritionist()->create();
        $member            = User::factory()->member()->create();
        $plan              = $this->makePlan($otherNutritionist, $member);

        $this->assertFalse($this->policy->view($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_owner_can_view_any_plan()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->view($owner, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_receptionist_can_view_any_plan()
    {
        $receptionist = User::factory()->receptionist()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->view($receptionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_trainer_is_denied()
    {
        $trainer      = User::factory()->trainer()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertFalse($this->policy->view($trainer, $plan));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_allows_only_nutritionist()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(
                $role === User::ROLE_NUTRITIONIST,
                $this->policy->create($user),
                "create failed for role: $role"
            );
        }
    }

    // ─────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_nutritionist_can_update_their_own_plan()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->update($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_nutritionist_cannot_update_another_nutritionists_plan()
    {
        $nutritionist      = User::factory()->nutritionist()->create();
        $otherNutritionist = User::factory()->nutritionist()->create();
        $member            = User::factory()->member()->create();
        $plan              = $this->makePlan($otherNutritionist, $member);

        $this->assertFalse($this->policy->update($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_can_update_any_plan()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->update($owner, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_receptionist_can_update_any_plan()
    {
        $receptionist = User::factory()->receptionist()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->update($receptionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_member_is_denied()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertFalse($this->policy->update($member, $plan));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_nutritionist_can_delete_their_own_plan()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->delete($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_nutritionist_cannot_delete_another_nutritionists_plan()
    {
        $nutritionist      = User::factory()->nutritionist()->create();
        $otherNutritionist = User::factory()->nutritionist()->create();
        $member            = User::factory()->member()->create();
        $plan              = $this->makePlan($otherNutritionist, $member);

        $this->assertFalse($this->policy->delete($nutritionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_can_delete_any_plan()
    {
        $owner        = User::factory()->owner()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertTrue($this->policy->delete($owner, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_is_denied()
    {
        $receptionist = User::factory()->receptionist()->create();
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertFalse($this->policy->delete($receptionist, $plan));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_member_is_denied()
    {
        $nutritionist = User::factory()->nutritionist()->create();
        $member       = User::factory()->member()->create();
        $plan         = $this->makePlan($nutritionist, $member);

        $this->assertFalse($this->policy->delete($member, $plan));
    }
}
