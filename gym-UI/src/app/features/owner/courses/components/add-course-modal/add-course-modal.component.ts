import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { SessionService } from '../../services/session.service';
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
  private sessionService = inject(SessionService);
  private fb = inject(FormBuilder);

  /** Pass an existing course to switch the modal to edit mode */
  editCourse = input<any | null>(null);

  close = output<void>();
  courseAdded = output<void>();

  isAdding = signal<boolean>(false);
  addError = signal<string | null>(null);
  imagePreview = signal<string | null>(null);
  selectedFile: File | null = null;
  trainers = signal<any[]>([]);
  activeTab = signal<string>('basic');

  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  get isEditMode(): boolean {
    return !!this.editCourse();
  }

  addForm: FormGroup;

  constructor() {
    this.addForm = this.fb.group({
      name:         ['', [Validators.required, Validators.minLength(3)]],
      description:  ['', [Validators.required, Validators.maxLength(500)]],
      max_capacity: [20, [Validators.required, Validators.min(1), Validators.max(500)]],
      isFree:       [false],
      price:        [49.99,  [Validators.required, Validators.min(0), Validators.max(10000)]],
      count:        [1, [Validators.required, Validators.min(0)]],
      duration_hours: [1, [Validators.min(0)]],
      duration_minutes: [0, [Validators.min(0), Validators.max(59)]],
      duration:     [60], // Hidden or calculated
      
      // Abonnement Logic
      is_subscription_enabled: [false],
      subscription_price: [99.99, [Validators.min(0), Validators.max(20000)]],

      // Recurring Logic
      is_recurring: [false],
      recurring_days: this.fb.array([]),
      recurring_start_time: ['10:00'],
      recurring_end_time: ['11:00'],
      recurrence_weeks: [4, [Validators.min(1), Validators.max(52)]],
      id_trainer: ['']
    });

    // Automatically toggle price based on isFree
    this.addForm.get('isFree')?.valueChanges.subscribe(isFree => {
      const priceControl = this.addForm.get('price');
      if (isFree) {
        priceControl?.setValue(0);
        priceControl?.disable();
      } else {
        priceControl?.setValue(49.99);
        priceControl?.enable();
      }
    });

    // Handle tab redirection if subscription is disabled while on automation tab
    this.addForm.get('is_subscription_enabled')?.valueChanges.subscribe(enabled => {
      if (!enabled && this.activeTab() === 'schedule') {
        this.setActiveTab('basic');
      }
    });
  }

  ngOnInit() {
    this.loadTrainers();
    const existing = this.editCourse();
    if (existing) {
      this.addForm.patchValue({
        name:         existing.name,
        description:  existing.description,
        max_capacity: existing.max_capacity,
        isFree:       existing.price === 0,
        price:        existing.price,
        count:        existing.count,
        duration_hours: Math.floor((parseInt(existing.duration) || 60) / 60),
        duration_minutes: (parseInt(existing.duration) || 60) % 60,
        duration:     parseInt(existing.duration) || 60,
        is_subscription_enabled: !!existing.is_subscription_enabled,
        subscription_price: existing.subscription_price,
        is_recurring: !!existing.is_recurring,
        recurring_start_time: existing.recurring_start_time,
        recurring_end_time: existing.recurring_end_time,
        recurrence_weeks: existing.recurrence_weeks,
        id_trainer: existing.id_trainer || (existing.sessions && existing.sessions.length > 0 ? (existing.sessions[0].id_trainer || existing.sessions[0].user?.id_user) : '')
      });

      if (existing.recurring_days) {
        try {
          const daysArray = this.addForm.get('recurring_days') as FormArray;
          daysArray.clear(); // Ensure clean state before patching
          const days = typeof existing.recurring_days === 'string' ? JSON.parse(existing.recurring_days) : existing.recurring_days;
          days.forEach((day: string) => this.onDayToggle(day, true));
        } catch(e) {}
      }
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

  loadTrainers() {
    this.sessionService.getTrainers().subscribe({
      next: (res) => this.trainers.set(res),
      error: () => {}
    });
  }

  onDayToggle(day: string, checked: boolean) {
    const daysArray = this.addForm.get('recurring_days') as FormArray;
    if (checked) {
      daysArray.push(new FormControl(day));
    } else {
      const index = daysArray.controls.findIndex(x => x.value === day);
      if (index !== -1) daysArray.removeAt(index);
    }
  }

  isDaySelected(day: string): boolean {
    const daysArray = this.addForm.get('recurring_days') as FormArray;
    return daysArray.value.includes(day);
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
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

    const totalMinutes = (this.addForm.get('duration_hours')?.value || 0) * 60 + (this.addForm.get('duration_minutes')?.value || 0);
    this.addForm.patchValue({ duration: totalMinutes });

    this.isAdding.set(true);
    const formData = new FormData();
    const rawValue = this.addForm.getRawValue();

    Object.keys(this.addForm.controls).forEach(key => {
      const value = rawValue[key];
      if (key === 'duration_hours' || key === 'duration_minutes') return; // Skip these internal helpers
      
      if (key === 'recurring_days' && Array.isArray(value)) {
        value.forEach((day: string) => formData.append('recurring_days[]', day));
      } else if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, value);
        }
      }
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
