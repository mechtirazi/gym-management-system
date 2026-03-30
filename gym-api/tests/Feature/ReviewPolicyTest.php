<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Review;
use App\Models\User;
use App\Policies\ReviewPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewPolicyTest extends TestCase
{
    use RefreshDatabase;

    private ReviewPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new ReviewPolicy();
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private function makeReview(User $author, User $gymOwner): array
    {
        $gym    = Gym::factory()->create(['id_owner' => $gymOwner->id_user]);
        $event  = Event::factory()->create(['id_gym' => $gym->id_gym]);
        $review = Review::factory()->create([
            'id_user'  => $author->id_user,
            'id_event' => $event->id_event,
        ]);

        return compact('gym', 'event', 'review');
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
    public function viewAny_allows_all_except_super_admin()
    {
        $allowed = [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
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
    public function view_allows_every_authenticated_user()
    {
        $gymOwner = User::factory()->owner()->create();
        $author   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($author, $gymOwner);

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertTrue($this->policy->view($user, $review), "view failed for role: $role");
        }
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
    public function update_author_can_update_their_own_review()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertTrue($this->policy->update($member, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_other_user_cannot_update_review()
    {
        $gymOwner    = User::factory()->owner()->create();
        $member      = User::factory()->member()->create();
        $otherMember = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertFalse($this->policy->update($otherMember, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_owner_cannot_update_others_review()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertFalse($this->policy->update($gymOwner, $review));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_author_can_delete_their_own_review()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertTrue($this->policy->delete($member, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_gym_owner_can_delete_review_for_their_event()
    {
        $gymOwner = User::factory()->owner()->create();
        $member   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertTrue($this->policy->delete($gymOwner, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_owner_cannot_delete_review_for_other_gym()
    {
        $gymOwner  = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $member    = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertFalse($this->policy->delete($otherOwner, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_can_delete_review_in_assigned_gym()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['gym' => $gym, 'review' => $review] = $this->makeReview($member, $gymOwner);
        $this->assignStaffToGym($receptionist, $gym);

        $this->assertTrue($this->policy->delete($receptionist, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_receptionist_cannot_delete_review_in_unassigned_gym()
    {
        $gymOwner     = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member       = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertFalse($this->policy->delete($receptionist, $review));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_trainer_cannot_delete_others_review()
    {
        $gymOwner = User::factory()->owner()->create();
        $trainer  = User::factory()->trainer()->create();
        $member   = User::factory()->member()->create();
        ['review' => $review] = $this->makeReview($member, $gymOwner);

        $this->assertFalse($this->policy->delete($trainer, $review));
    }
}
