<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Session;
use App\Models\User;
use App\Policies\CoursePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoursePolicyTest extends TestCase
{
    use RefreshDatabase;

    private CoursePolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new CoursePolicy();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function viewAny_roles()
    {
        $allowed = [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER,
        ];

        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $this->assertEquals(in_array($role, $allowed), $this->policy->viewAny($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function view_permission_matrix()
    {
        $gymOwner = User::factory()->owner()->create();
                $gymOwner2 = User::factory()->owner()->create();

        $trainer = User::factory()->trainer()->create();
          $trainer3 = User::factory()->trainer()->create();
        $receptionist = User::factory()->receptionist()->create();
        $member = User::factory()->member()->create();
        $gym = Gym::factory()->create(['id_owner' => $gymOwner->id_user]);
        $gym2 = Gym::factory()->create(['id_owner' => $gymOwner2->id_user]);

        // create course without explicit trainer; trainer association will
        // be established via a session below
        $course = Course::factory()->create(['id_gym' => $gym->id_gym]);
        $otherCourse = Course::factory()->create(['id_gym' => $gym2->id_gym]); // course in another gym

        // give the trainer a session for the first course so policy finds them
        Session::factory()->create([
            'id_course' => $course->id_course,
            'id_trainer' => $trainer->id_user,
        ]);
          Session::factory()->create([
            'id_course' => $otherCourse->id_course,
            'id_trainer' => $trainer3->id_user, // some other trainer
        ]);

        // member
        $this->assertTrue($this->policy->view($member, $course));
        $this->assertTrue($this->policy->view($member, $otherCourse));

        // receptionist can only view if assigned
        GymStaff::factory()->create([
            'id_user' => $receptionist->id_user,
            'id_gym' => $gym->id_gym,
        ]);
        $this->assertTrue($this->policy->view($receptionist, $course));
        $this->assertFalse($this->policy->view($receptionist, $otherCourse));

        // trainer can view course once they have a session on it
        $this->assertTrue($this->policy->view($trainer, $course));
        $this->assertFalse($this->policy->view($trainer, $otherCourse));

        // owner views courses in own gyms
        $this->assertTrue($this->policy->view($gymOwner, $course));
        $this->assertFalse($this->policy->view($gymOwner, $otherCourse));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_only_owner_or_member()
    {
        foreach (User::VALID_ROLES as $role) {
            $user = User::factory()->create(['role' => $role]);
            $expected = $role === User::ROLE_OWNER;
            $this->assertEquals($expected, $this->policy->create($user));
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_delete_respect_assignment_and_ownership()
    {
        $gymOwner = User::factory()->owner()->create();
        $receptionist = User::factory()->receptionist()->create();
        $gym = Gym::factory()->create(['id_owner' => $gymOwner->id_user]);
        $course = Course::factory()->create(['id_gym' => $gym->id_gym]);
        $gymOwner2 = User::factory()->owner()->create();
         $gym2 = Gym::factory()->create(['id_owner' => $gymOwner2->id_user]);
     $otherCourse = Course::factory()->create(['id_gym' => $gym2->id_gym]); // course in another gym

        // receptionist assigned via GymStaff factory
        GymStaff::factory()->create([
            'id_user' => $receptionist->id_user,
            'id_gym' => $gym->id_gym,
        ]);

        // update
        $this->assertTrue($this->policy->update($gymOwner, $course));
        $this->assertFalse($this->policy->update($gymOwner, $otherCourse));
        // receptionist already assigned above, no need to recreate
        $this->assertTrue($this->policy->update($receptionist, $course));
        $this->assertFalse($this->policy->update($receptionist, $otherCourse));

        // delete uses same logic
        $this->assertTrue($this->policy->delete($gymOwner, $course));
        $this->assertFalse($this->policy->delete($gymOwner, $otherCourse));
        $this->assertTrue($this->policy->delete($receptionist, $course));
        $this->assertFalse($this->policy->delete($receptionist, $otherCourse));
    }
}
