import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerService } from '../services/trainer.service';
import { NutritionPlan } from '../../../shared/models/nutrition.model';
import { NutritionCardComponent } from '../components/nutrition-card/nutrition-card.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-trainer-nutrition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NutritionCardComponent
  ],
  templateUrl: './trainer-nutrition.component.html',
  styleUrl: './trainer-nutrition.component.scss'
})
export class TrainerNutritionComponent implements OnInit {
  private trainerService = inject(TrainerService);

  allPlans = signal<NutritionPlan[]>([]);
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  filterOptions = ['All Plans', 'Active', 'Upcoming', 'Expired'];

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.isLoading.set(true);
    this.error.set(null);
    this.trainerService.getNutritionPlans(1, 50)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.allPlans.set(response.data);
          } else if (Array.isArray(response)) {
            this.allPlans.set(response);
          }
        },
        error: (err: any) => {
          this.error.set('Could not fetch the nutrition plans list.');
        }
      });
  }

  onFilterChange(filter: string) {
    this.selectedFilter.set(filter);
  }

  filteredPlans = computed(() => {
    let list = this.allPlans();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();
    const today = new Date().toISOString().split('T')[0];

    if (query) {
      list = list.filter(p =>
        p.goal?.toLowerCase().includes(query) ||
        p.nutritionist?.name?.toLowerCase().includes(query) ||
        p.members?.some(m => m.name?.toLowerCase().includes(query))
      );
    }

    if (filter === 'Active') {
      list = list.filter(p => p.start_date <= today && p.end_date >= today);
    } else if (filter === 'Upcoming') {
      list = list.filter(p => p.start_date > today);
    } else if (filter === 'Expired') {
      list = list.filter(p => p.end_date < today);
    }

    return list;
  });
}
