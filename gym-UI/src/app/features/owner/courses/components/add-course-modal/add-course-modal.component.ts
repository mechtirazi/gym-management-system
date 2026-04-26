import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { finalize } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

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
  imagePreview = signal<string | null>(null);
  selectedFile: File | null = null;

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
      const rawImage = existing.image_url || existing.image || existing.picture || existing.logo || existing.logo_url;
      if (rawImage) {
        this.imagePreview.set(this.getImageUrl(rawImage));
      }
    }
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview.set(null);
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

    const formData = new FormData();
    Object.keys(this.addForm.controls).forEach(key => {
      formData.append(key, this.addForm.get(key)?.value);
    });

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.isAdding.set(true);
    const existing = this.editCourse();

    if (existing) {
      // EDIT mode
      const id = existing.id_course || existing.id;
      this.courseService.updateCourse(id, formData).pipe(finalize(() => this.isAdding.set(false))).subscribe({
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
      this.courseService.createCourse(formData).pipe(finalize(() => this.isAdding.set(false))).subscribe({
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
