import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService } from './services/course.service';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { FilterControlsComponent } from '../components/filter-controls/filter-controls.component';
import { CourseCardComponent } from './components/course-card/course-card.component';
import { AddCourseModalComponent } from './components/add-course-modal/add-course-modal.component';
import { SessionsModalComponent } from './components/sessions-modal/sessions-modal.component';
import { finalize } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    FilterControlsComponent,
    CourseCardComponent,
    AddCourseModalComponent,
    SessionsModalComponent
  ],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.scss'
})
export class CourseManagementComponent implements OnInit {
  private courseService = inject(CourseService);
  private confirmService = inject(ConfirmDialogService);

  allCourses = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedType = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  showAddModal = signal<boolean>(false);

  // Sessions Modal State
  showSessionsModal = signal<boolean>(false);
  selectedCourseForSessions = signal<any | null>(null);

  // Edit Modal State
  selectedCourseForEdit = signal<any | null>(null);

  // Map of professional categories and their associated keywords
  private CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Fitness': ['fitness', 'hiit', 'cardio', 'strength', 'crossfit', 'workout', 'gym', 'core', 'pump', 'body'],
    'Yoga': ['yoga', 'pilates', 'stretch', 'flow', 'meditation', 'flexibility'],
    'Boxing': ['boxing', 'kickboxing', 'mma', 'martial', 'fight', 'combat', 'strike'],
    'Zumba': ['zumba', 'dance', 'aerobics', 'rhythm', 'step'],
    'Cycling': ['spin', 'cycling', 'bike', 'ride'],
    'Aquatics': ['swim', 'water', 'aqua', 'pool']
  };

  // Helper method to intelligently classify a course
  private getCourseCategory(course: any): string {
    // If backend ever adds category property, use it directly
    if (course.category) return course.category;
    if (course.type) return course.type;
    
    const textToSearch = `${course.name || ''} ${course.description || ''}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => textToSearch.includes(kw))) {
        return category;
      }
    }
    return 'General Programs'; // Fallback if no keywords match
  }

  // Dynamically extract categories based on intelligent classification
  availableTypes = computed(() => {
    const list = this.allCourses();
    const types = new Set<string>();
    
    list.forEach(c => {
      types.add(this.getCourseCategory(c));
    });

    return ['All Courses', ...Array.from(types).sort()];
  });

  filteredCourses = computed(() => {
    let list = this.allCourses();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();

    if (type !== 'All') {
      list = list.filter(c => this.getCourseCategory(c) === type);
    }

    if (query) {
      list = list.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(query);
        const descMatch = (c.description || '').toLowerCase().includes(query);
        
        // Search through sessions to find matching trainer names
        const trainerMatch = (c.sessions || []).some((s: any) => {
          const t = s.trainer;
          if (!t) return false;
          const fullName = `${t.name || ''} ${t.last_name || ''}`.toLowerCase();
          return fullName.includes(query) || 
                 (t.name || '').toLowerCase().includes(query) || 
                 (t.last_name || '').toLowerCase().includes(query);
        });

        return nameMatch || descMatch || trainerMatch;
      });
    }
    return list;
  });

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading.set(true);
    this.error.set(null);
    this.courseService.getCourses()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.allCourses.set(response.data);
          }
        },
        error: (err) => {
          console.error('Failed to load courses', err);
          this.error.set('Could not fetch the courses list.');
        }
      });
  }

  onDeleteCourse(id: string) {
    this.confirmService.open({
      title: 'Delete Course',
      message: 'Are you completely sure you want to permanently delete this course?',
      confirmText: 'Delete Course',
      icon: 'warning',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.courseService.deleteCourse(id).subscribe({
          next: () => this.loadCourses(),
          error: (err) => this.error.set('Action failed to delete course.')
        });
      }
    });
  }

  onManageClasses(course: any) {
    this.selectedCourseForSessions.set(course);
    this.showSessionsModal.set(true);
  }

  onEditCourse(course: any) {
    this.selectedCourseForEdit.set(course);
    this.showAddModal.set(true);
  }
}
