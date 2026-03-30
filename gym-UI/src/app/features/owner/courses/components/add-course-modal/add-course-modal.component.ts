import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-course-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-course-modal.component.html',
  styleUrl: './add-course-modal.component.scss'
})
export class AddCourseModalComponent implements OnInit {
  private courseService = inject(CourseService);
  private fb = inject(FormBuilder);

  /** Pass an existing course to switch the modal to edit mode */
  editCourse = input<any | null>(null);

  close = output<void>();
  courseAdded = output<void>();

  isAdding = signal<boolean>(false);
  addError = signal<string | null>(null);

  get isEditMode(): boolean {
    return !!this.editCourse();
  }

  addForm: FormGroup;

  constructor() {
    this.addForm = this.fb.group({
      name:         ['', [Validators.required, Validators.minLength(3)]],
      description:  ['', [Validators.required, Validators.maxLength(500)]],
      max_capacity: [20, [Validators.required, Validators.min(1)]],
      price:        [0,  [Validators.required, Validators.min(0)]],
      count:        [10, [Validators.required, Validators.min(1)]],
      duration:     ['60 min', Validators.required]
    });
  }

  ngOnInit() {
    const existing = this.editCourse();
    if (existing) {
      this.addForm.patchValue({
        name:         existing.name,
        description:  existing.description,
        max_capacity: existing.max_capacity,
        price:        existing.price,
        count:        existing.count,
        duration:     existing.duration
      });
    }
  }

  cancelAdd() {
    this.close.emit();
  }

  submitAddCourse() {
    this.addError.set(null);

    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const payload = this.addForm.value;
    this.isAdding.set(true);

    const existing = this.editCourse();

    if (existing) {
      // EDIT mode
      const id = existing.id_course || existing.id;
      this.courseService.updateCourse(id, payload).pipe(finalize(() => this.isAdding.set(false))).subscribe({
        next: () => {
          this.courseAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Failed to update course.';
          this.addError.set(msg);
        }
      });
    } else {
      // ADD mode
      this.courseService.createCourse(payload).pipe(finalize(() => this.isAdding.set(false))).subscribe({
        next: () => {
          this.courseAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          const errorMessage = err.status === 0
            ? 'Network error. Please check if the backend server is running.'
            : (err.error?.message || err.message || 'Failed to create course. Please try again.');
          this.addError.set(errorMessage);
        }
      });
    }
  }
}
