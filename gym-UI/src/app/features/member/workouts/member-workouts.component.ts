import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-workouts.component.html',
  styleUrls: ['./member-workouts.component.scss']
})
export class MemberWorkoutsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  showCatalog = true;

  // Exercise Library State
  exSearch = '';
  activeCategory = 'all';
  exerciseLibrary = [
    { name: 'Bench Press', category: 'chest', image: '/assets/images/exercises/bench-press.jpg' },
    { name: 'Incline Dumbbell Press', category: 'chest', image: '/assets/images/exercises/incline-press.jpg' },
    { name: 'Chest Flys', category: 'chest', image: '/assets/images/exercises/chest-flys.jpg' },
    { name: 'Pull Ups', category: 'back', image: '/assets/images/exercises/pull-ups.jpg' },
    { name: 'Bent Over Rows', category: 'back', image: '/assets/images/exercises/rows.jpg' },
    { name: 'Lat Pulldowns', category: 'back', image: '/assets/images/exercises/pull-ups.jpg' }, // Pull-ups as best visual match
    { name: 'Squats', category: 'legs', image: '/assets/images/exercises/squats.jpg' },
    { name: 'Leg Press', category: 'legs', image: '/assets/images/exercises/leg-press.jpg' },
    { name: 'Lunges', category: 'legs', image: '/assets/images/exercises/lunges.jpg' },
    { name: 'Deadlift', category: 'legs', image: '/assets/images/exercises/deadlift.jpg' },
    { name: 'Overhead Press', category: 'shoulders', image: '/assets/images/exercises/overhead-press.jpg' },
    { name: 'Lateral Raises', category: 'shoulders', image: '/assets/images/exercises/lateral-raises.jpg' },
  ];

  // Workout Logger State
  selectedExercisesNames: string[] = []; // TRACKS PERSISTENTLY CHOSEN EXERCISES
  workoutForm: any = {
    name: 'New Training Session',
    exercises: []
  };

  workoutHistory: any[] = [];
  isSaving = false;

  get filteredSelectedExercises() {
    // Only exercises specifically 'chosen' from the Catalog
    return this.exerciseLibrary.filter(ex => {
      const isOwned = this.selectedExercisesNames.includes(ex.name);
      const matchesSearch = ex.name.toLowerCase().includes(this.exSearch.toLowerCase());
      const matchesCat = this.activeCategory === 'all' || ex.category === this.activeCategory;
      return isOwned && matchesSearch && matchesCat;
    });
  }

  get filteredExercises() {
    // Show all library exercises for the Main Catalog Grid
    return this.exerciseLibrary.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(this.exSearch.toLowerCase());
      const matchesCat = this.activeCategory === 'all' || ex.category === this.activeCategory;
      return matchesSearch && matchesCat;
    });
  }

  ngOnInit(): void {
    this.loadHistory();
    this.loadPersonalCatalog();
  }

  loadPersonalCatalog() {
    const saved = localStorage.getItem('zen_personal_catalog');
    if (saved) {
      try {
        this.selectedExercisesNames = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load personal catalog', e);
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
        // Optional: Populate selectedExercisesNames from history if we want persistence
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  toggleCatalog(): void {
    this.showCatalog = !this.showCatalog;
  }

  // --- Logger Methods ---

  addPresetExercise(name: string): void {
    // Persistent choice: Add to our private set
    if (!this.selectedExercisesNames.includes(name)) {
      this.selectedExercisesNames.push(name);
      this.savePersonalCatalog();
    }

    this.workoutForm.exercises.push({
      exercise_name: name,
      sets: [{ weight: 0, reps: 0 }]
    });
    if (this.showCatalog) {
      this.showCatalog = false;
    }
    this.cdr.detectChanges();
  }

  removeFromCatalog(name: string, event: Event): void {
    event.stopPropagation();
    this.selectedExercisesNames = this.selectedExercisesNames.filter(n => n !== name);
    this.savePersonalCatalog();
    this.cdr.detectChanges();
  }

  addExerciseToSession(name: string): void {
    // Logic for adding from the left pane (Personal Catalog)
    this.workoutForm.exercises.push({
      exercise_name: name,
      sets: [{ weight: 0, reps: 0 }]
    });
    this.cdr.detectChanges();
  }

  addExercise(): void {
    this.workoutForm.exercises.push({
      exercise_name: '',
      sets: [{ weight: 0, reps: 0 }]
    });
    this.cdr.detectChanges();
  }

  removeExercise(index: number): void {
    this.workoutForm.exercises.splice(index, 1);
    this.cdr.detectChanges();
  }

  addSet(exerciseIndex: number): void {
    const sets = this.workoutForm.exercises[exerciseIndex].sets;
    const lastSet = sets[sets.length - 1];
    sets.push({
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0
    });
    this.cdr.detectChanges();
  }

  removeSet(exerciseIndex: number, setIndex: number): void {
    this.workoutForm.exercises[exerciseIndex].sets.splice(setIndex, 1);
    if (this.workoutForm.exercises[exerciseIndex].sets.length === 0) {
      this.removeExercise(exerciseIndex);
    }
    this.cdr.detectChanges();
  }

  saveWorkout(): void {
    if (this.workoutForm.exercises.length === 0) return;

    this.isSaving = true;
    this.memberService.saveWorkoutLog(this.workoutForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        alert('Workout Pulse Synchronized! +50 Evolution Points.');
        this.workoutForm = { name: 'Protocol ' + (this.workoutHistory.length + 1), exercises: [] };
        this.showCatalog = true;
        this.loadHistory();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error?.message || 'Synchronization failed.');
      }
    });
  }
}
