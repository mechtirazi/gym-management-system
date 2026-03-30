import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionService } from './services/nutrition.service';
import { NutritionPlan } from '../../../shared/models/nutrition.model';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { FilterControlsComponent } from '../components/filter-controls/filter-controls.component';
import { NutritionCardComponent } from './components/nutrition-card/nutrition-card.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-nutrition-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    FilterControlsComponent,
    NutritionCardComponent
  ],
  templateUrl: './nutrition.component.html',
  styleUrl: './nutrition.component.scss'
})
export class NutritionManagementComponent implements OnInit {
  private nutritionService = inject(NutritionService);

  allPlans = signal<NutritionPlan[]>([]);
  nutritionists = signal<any[]>([]);
  members = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  showModal = signal<boolean>(false);
  modalMode = signal<'add' | 'edit'>('add');
  planForm = signal<NutritionPlan>({
    id_plan: '',
    goal: '',
    start_date: '',
    end_date: '',
    id_nutritionist: '',
    id_members: [],
    price: 0,
  });

  filterOptions = ['All Plans', 'Active', 'Upcoming', 'Expired', 'By Nutritionist'];

  currentPage = signal(1);
  perPage = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);

  ngOnInit() {
    this.loadPlans();
    this.loadUsers();
  }

  private showNotification(type: 'success' | 'error' | 'info', text: string) {
    this.notification.set({ type, text });
    setTimeout(() => this.notification.set(null), 3800);
  }

  loadPlans() {
    this.isLoading.set(true);
    this.error.set(null);
    this.nutritionService.getNutritionPlans(this.currentPage(), this.perPage())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            // Check for modern BaseApiController aligned pagination structure
            if (response.current_page !== undefined) {
              this.allPlans.set(response.data);
              this.totalPages.set(response.last_page || 1);
              this.totalItems.set(response.total || response.data.length);
            } else {
              this.allPlans.set(response.data);
            }
          } else if (Array.isArray(response)) {
            this.allPlans.set(response);
          }
        },
        error: (err) => {
          console.error('Failed to load nutrition plans', err);
          this.error.set('Could not fetch the nutrition plans list.');
          this.showNotification('error', 'Failed to load nutrition plans.');
        }
      });
  }

  loadUsers() {
    this.nutritionService.getUsers().subscribe({
      next: (response) => {
        const users = response.data || response;
        if (Array.isArray(users)) {
          this.nutritionists.set(users.filter(u => u.role === 'nutritionist'));
          this.members.set(users.filter(u => u.role === 'member'));
        }
      },
      error: (err) => console.error('Failed to load users', err)
    });
  }

  onFilterChange(filter: string) {
    this.selectedFilter.set(filter);
    this.currentPage.set(1);
    this.loadPlans();
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPlans();
  }

  onAddPlan() {
    this.modalMode.set('add');
    this.planForm.set({
      id_plan: '',
      goal: '',
      start_date: '',
      end_date: '',
      id_nutritionist: '',
      id_members: [],
      price: 0,
    });
    this.showModal.set(true);
  }

  onViewPlan(plan: NutritionPlan) {
    this.modalMode.set('edit');
    const memberIds = (plan as any).id_members || plan.members?.map(m => m.id_user) || [];
    this.planForm.set({
      ...plan,
      id_members: Array.isArray(memberIds) ? memberIds : [memberIds].filter(id => id),
      id_nutritionist: plan.id_nutritionist || (plan as any).nutritionist?.id_user,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitPlan() {
    const plan = this.planForm();
    const memberIds = (plan as any).id_members || [];

    if (!plan.goal || !plan.start_date || !plan.end_date || !plan.id_nutritionist || (Array.isArray(memberIds) && memberIds.length === 0)) {
      this.showNotification('error', 'Please fill all required fields and select at least one member.');
      return;
    }

    if (this.modalMode() === 'add') {
      const payload = {
        goal: plan.goal,
        start_date: plan.start_date,
        end_date: plan.end_date,
        price: plan.price,
        id_nutritionist: plan.id_nutritionist,
        id_members: memberIds,
      };

      this.nutritionService.createNutritionPlan(payload as any).subscribe({
        next: () => {
          this.loadPlans();
          this.closeModal();
          this.showNotification('success', 'Nutrition plan created successfully.');
        },
        error: (err) => {
          console.error('Create failed', err);
          this.showNotification('error', 'Failed to create nutrition plan.');
        }
      });
    } else {
      const payload = {
        goal: plan.goal,
        start_date: plan.start_date,
        end_date: plan.end_date,
        price: plan.price,
        id_nutritionist: plan.id_nutritionist,
        id_members: memberIds,
      };

      this.nutritionService.updateNutritionPlan(plan.id_plan, payload as any).subscribe({
        next: () => {
          this.loadPlans();
          this.closeModal();
          this.showNotification('success', 'Nutrition plan updated successfully.');
        },
        error: (err) => {
          console.error('Update failed', err);
          this.showNotification('error', 'Failed to update nutrition plan.');
        }
      });
    }
  }

  onDeletePlan(id: string) {
    if (!confirm('Delete this nutrition plan?')) {
      return;
    }
    this.nutritionService.deleteNutritionPlan(id).subscribe({
      next: () => {
        this.loadPlans();
        this.showNotification('success', 'Nutrition plan deleted successfully.');
      },
      error: () => {
        this.showNotification('error', 'Failed to delete nutrition plan.');
      }
    });
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
        p.nutritionist?.last_name?.toLowerCase().includes(query) ||
        p.members?.some(m => 
          m.name?.toLowerCase().includes(query) || 
          m.last_name?.toLowerCase().includes(query)
        )
      );
    }

    if (filter === 'Active') {
      list = list.filter(p => p.start_date <= today && p.end_date >= today);
    } else if (filter === 'Upcoming') {
      list = list.filter(p => p.start_date > today);
    } else if (filter === 'Expired') {
      list = list.filter(p => p.end_date < today);
    } else if (filter === 'By Nutritionist') {
      list = list.filter(p => !!p.nutritionist?.name);
    }

    return list;
  });
}

