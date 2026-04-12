import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerService } from '../services/trainer.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-trainer-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-courses.component.html',
  styleUrl: './trainer-courses.component.scss'
})
export class TrainerCoursesComponent implements OnInit {
  private trainerService = inject(TrainerService);

  allCourses = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedType = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  availableTypes = computed(() => {
    const list = this.allCourses();
    const types = new Set<string>();
    list.forEach(c => types.add(c.type || 'General'));
    return ['All Courses', ...Array.from(types).sort()];
  });

  filteredCourses = computed(() => {
    let list = this.allCourses();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();

    if (type !== 'All Courses' && type !== 'All') {
      list = list.filter(c => (c.type || 'General') === type);
    }

    if (query) {
      list = list.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading.set(true);
    this.error.set(null);
    this.trainerService.getCourses()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.allCourses.set(response.data);
          }
        },
        error: (err) => {
          this.error.set('Could not fetch your assigned courses.');
        }
      });
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value);
  }

  onTypeChange(event: any) {
    this.selectedType.set(event.target.value);
  }
}

