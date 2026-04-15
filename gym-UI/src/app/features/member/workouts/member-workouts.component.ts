import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';

// --- Interfaces for Type Safety ---
interface WorkoutSet {
  weight: number;
  reps: number;
}

interface WorkoutExercise {
  exercise_name: string;
  sets: WorkoutSet[];
}

interface Workout {
  name: string;
  exercises: WorkoutExercise[];
}

interface ExerciseLibraryItem {
  name: string;
  category: string;
  image: string;
}

@Component({
  selector: 'app-member-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-workouts.component.html',
  styleUrls: ['./member-workouts.component.scss']
})
export class MemberWorkoutsComponent implements OnInit {
  private memberService = inject(MemberService);
  // private cdr = inject(ChangeDetectorRef); // Usually unnecessary in default change detection

  loading = true;
  showCatalog = true;
  isSaving = false;

  exSearch = '';
  activeCategory = 'all';
  catalogScale = 1; // 1 = 100% (Controls grid column sizing)

  exerciseLibrary: ExerciseLibraryItem[] = [
    { name: 'Bench Press', category: 'chest', image: '/assets/images/exercises/bench-press.jpg' },
    { name: 'Incline Dumbbell Press', category: 'chest', image: '/assets/images/exercises/incline-press.jpg' },
    { name: 'Chest Flys', category: 'chest', image: '/assets/images/exercises/chest-flys.jpg' },
    { name: 'Pull Ups', category: 'back', image: '/assets/images/exercises/pull-ups.jpg' },
    { name: 'Bent Over Rows', category: 'back', image: '/assets/images/exercises/rows.jpg' },
    { name: 'Lat Pulldowns', category: 'back', image: '/assets/images/exercises/pull-ups.jpg' },
    { name: 'Squats', category: 'legs', image: '/assets/images/exercises/squats.jpg' },
    { name: 'Leg Press', category: 'legs', image: '/assets/images/exercises/leg-press.jpg' },
    { name: 'Lunges', category: 'legs', image: '/assets/images/exercises/lunges.jpg' },
    { name: 'Deadlift', category: 'legs', image: '/assets/images/exercises/deadlift.jpg' },
    { name: 'Overhead Press', category: 'shoulders', image: '/assets/images/exercises/overhead-press.jpg' },
    { name: 'Lateral Raises', category: 'shoulders', image: '/assets/images/exercises/lateral-raises.jpg' },
  ];

  selectedExercisesNames: string[] = [];
  workoutForm: Workout = {
    name: 'New Training Session',
    exercises: []
  };

  workoutHistory: any[] = []; // Update this to match your backend response type

  // --- Getters ---
  get filteredSelectedExercises() {
    const search = this.exSearch.toLowerCase();
    return this.exerciseLibrary.filter(ex =>
      this.selectedExercisesNames.includes(ex.name) &&
      ex.name.toLowerCase().includes(search) &&
      (this.activeCategory === 'all' || ex.category === this.activeCategory)
    );
  }

  get filteredExercises() {
    const search = this.exSearch.toLowerCase();
    return this.exerciseLibrary.filter(ex =>
      ex.name.toLowerCase().includes(search) &&
      (this.activeCategory === 'all' || ex.category === this.activeCategory)
    );
  }

  get gridScaleStyle() {
    return {
      'grid-template-columns': `repeat(auto-fill, minmax(${280 * this.catalogScale}px, 1fr))`
    };
  }

  ngOnInit(): void {
    this.loadHistory();
    this.loadPersonalCatalog();
  }

  // --- Persistence ---
  loadPersonalCatalog() {
    const saved = localStorage.getItem('zen_personal_catalog');
    if (saved) {
      try {
        this.selectedExercisesNames = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse catalog', e);
      }
    }
  }

  savePersonalCatalog() {
    localStorage.setItem('zen_personal_catalog', JSON.stringify(this.selectedExercisesNames));
  }

  loadHistory(): void {
    this.loading = true;
    this.memberService.getWorkoutHistory().subscribe({
      next: (res) => {
        this.workoutHistory = res.data || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // --- Logic Methods ---
  toggleCatalog(): void {
    this.showCatalog = !this.showCatalog;
  }

  addPresetExercise(name: string): void {
    if (!this.selectedExercisesNames.includes(name)) {
      this.selectedExercisesNames.push(name);
      this.savePersonalCatalog();
    }
    this.addExerciseToSession(name);
    this.showCatalog = false;
  }

  removeFromCatalog(name: string, event: Event): void {
    event.stopPropagation();
    // 1. Remove from Personal Catalog
    this.selectedExercisesNames = this.selectedExercisesNames.filter(n => n !== name);
    this.savePersonalCatalog();

    // 2. Remove all instances of this exercise from the current Active Session
    this.workoutForm.exercises = this.workoutForm.exercises.filter(ex => ex.exercise_name !== name);
  }

  addExerciseToSession(name: string = ''): void {
    this.workoutForm.exercises.push({
      exercise_name: name,
      sets: [{ weight: 0, reps: 0 }]
    });
  }

  removeExercise(index: number): void {
    const name = this.workoutForm.exercises[index].exercise_name;
    // 1. Remove from the Active Session
    this.workoutForm.exercises.splice(index, 1);

    // 2. Synchronize: Remove from Personal Catalog if it's not used anywhere else in the session
    const stillInSession = this.workoutForm.exercises.some(ex => ex.exercise_name === name);
    if (!stillInSession) {
      this.selectedExercisesNames = this.selectedExercisesNames.filter(n => n !== name);
      this.savePersonalCatalog();
    }
  }

  addSet(exerciseIndex: number): void {
    const sets = this.workoutForm.exercises[exerciseIndex].sets;
    const lastSet = sets[sets.length - 1];
    // Copy the last set's values (convenience for the user)
    sets.push({
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0
    });
  }

  removeSet(exerciseIndex: number, setIndex: number): void {
    const sets = this.workoutForm.exercises[exerciseIndex].sets;
    sets.splice(setIndex, 1);
    if (sets.length === 0) {
      this.removeExercise(exerciseIndex);
    }
  }

  saveWorkout(): void {
    // Basic validation
    const validExercises = this.workoutForm.exercises.filter(e => e.exercise_name.trim() !== '');
    if (validExercises.length === 0) {
      alert('Please add at least one exercise name.');
      return;
    }

    this.isSaving = true;
    this.memberService.saveWorkoutLog({ ...this.workoutForm, exercises: validExercises }).subscribe({
      next: () => {
        this.isSaving = false;
        alert('Workout Pulse Synchronized!');
        // Reset Form
        this.workoutForm = {
          name: 'Protocol ' + (this.workoutHistory.length + 2),
          exercises: []
        };
        this.showCatalog = true;
        this.loadHistory();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Pulse Sync Failed:', err);
        const msg = err.error?.message || 'Synchronization pulse failed to stabilize. Please try again.';
        alert(msg);
      }
    });
  }

  // --- TrackBy Helpers ---
  trackByExercise(index: number, item: WorkoutExercise): string {
    return item.exercise_name + index;
  }

  trackBySet(index: number, item: WorkoutSet): number {
    return index;
  }

  trackByLibraryItem(index: number, item: ExerciseLibraryItem): string {
    return item.name;
  }

  isInCatalog(name: string): boolean {
    return this.selectedExercisesNames.includes(name);
  }
}