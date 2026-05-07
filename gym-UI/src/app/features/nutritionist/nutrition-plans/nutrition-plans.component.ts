import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { NutritionPlan } from '../../../shared/models/nutrition.model';
import { AuthService } from '../../../core/services/auth.service';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { extractApiList, isMemberUser, isOwnedByNutritionist } from '../utils/nutritionist-dashboard.utils';
import { environment } from '../../../../environments/environment';

import { PageHeaderComponent } from '../../owner/components/page-header/page-header.component';
import { FilterControlsComponent } from '../../owner/components/filter-controls/filter-controls.component';
import { NutritionCardComponent } from '../../owner/nutrition/components/nutrition-card/nutrition-card.component';
import { NutritionMessagesComponent } from '../utils/nutrition-messages.component';

@Component({
  selector: 'app-nutritionist-nutrition-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FilterControlsComponent, NutritionCardComponent, NutritionMessagesComponent],
  templateUrl: './nutrition-plans.component.html',
  styleUrl: './nutrition-plans.component.scss'
})
export class NutritionistNutritionPlansComponent implements OnInit {
  private api = inject(NutritionistNutritionService);
  private auth = inject(AuthService);
  private gymsApi = inject(GymService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchInput$ = new Subject<string>();
  private searchSub = this.searchInput$
    .pipe(debounceTime(250), distinctUntilChanged())
    .subscribe(value => this.searchQuery.set(value));

  isLoading = signal(true);
  error = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  gyms = signal<GymInfo[]>([]);
  members = signal<any[]>([]);

  allPlans = signal<NutritionPlan[]>([]);
  rawSearchQuery = signal('');
  searchQuery = signal('');
  selectedFilter = signal<string>('All');
  filterOptions = ['All Plans', 'Active', 'Upcoming', 'Expired'];

  // Optional member filter coming from Clients screen
  memberIdFilter = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  perPage = signal(10);

  // Modal
  showModal = signal(false);
  modalMode = signal<'add' | 'edit'>('add');
  selectedGymId: number | null = null;
  pendingDeleteId = signal<string | null>(null);

  planForm = signal<NutritionPlan>({
    id_plan: '',
    name: '',
    description: '',
    image: '',
    goal: '',
    start_date: '',
    end_date: '',
    id_nutritionist: '',
    id_members: [],
    price: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    calories: 0,
    score: 95,
    meals: [],
    supplements: []
  });

  // Dynamic Item Management
  addMeal() {
    const current = this.planForm();
    const meals = [...(current.meals || []), { name: '', time: '08:00', protein: 0, carbs: 0, fats: 0, calories: 0 }];
    this.planForm.set({ ...current, meals });
  }

  removeMeal(index: number) {
    const current = this.planForm();
    const meals = [...(current.meals || [])];
    meals.splice(index, 1);
    this.planForm.set({ ...current, meals });
  }

  addSupplement() {
    const current = this.planForm();
    const supplements = [...(current.supplements || []), { name: '', dosage: '', timing: '', type: 'capsule' as const }];
    this.planForm.set({ ...current, supplements });
  }

  removeSupplement(index: number) {
    const current = this.planForm();
    const supplements = [...(current.supplements || [])];
    supplements.splice(index, 1);
    this.planForm.set({ ...current, supplements });
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.showToast('error', 'Image size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      this.planForm.update(prev => ({ ...prev, image: base64String }));
    };
    reader.readAsDataURL(file);
  }

  ngOnInit(): void {
    this.memberIdFilter.set(this.route.snapshot.queryParamMap.get('memberId'));
    this.loadGyms();
    this.loadMembers();
    this.loadPlans();

    if (this.route.snapshot.queryParamMap.get('autoOpen') === 'true') {
      setTimeout(() => this.onAddPlan(), 500);
    }
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
  }

  private meId(): string | undefined {
    return this.auth.currentUser()?.id_user;
  }

  private showToast(type: 'success' | 'error' | 'info', text: string) {
    this.notification.set({ type, text });
    setTimeout(() => this.notification.set(null), 3500);
  }

  getAvatarUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/storage/${path}`;
  }

  loadGyms(): void {
    this.gymsApi.getMyGyms().subscribe({
      next: gyms => {
        this.gyms.set((gyms || []).filter(Boolean));
        const preferred = (this.auth.connectedGymId() as any) ?? null;
        const fallback = gyms?.[0]?.id_gym ?? null;
        this.selectedGymId = preferred ?? fallback;
      },
      error: () => this.gyms.set([])
    });
  }

  loadMembers(): void {
    this.api.getClients().subscribe({
      next: res => {
        this.members.set(extractApiList<any>(res).filter(isMemberUser));
      },
      error: () => this.members.set([])
    });
  }

  loadPlans(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.api
      .getNutritionPlans(1, 50)
      .pipe(
        switchMap(first => {
          const firstData = extractApiList<NutritionPlan>(first);
          const lastPage = Number(first?.last_page ?? 1);
          if (lastPage <= 1) return of(firstData);
          const requests = [];
          for (let page = 2; page <= lastPage; page++) {
            requests.push(this.api.getNutritionPlans(page, 50));
          }
          return forkJoin(requests).pipe(
            map(restResponses => {
              const restData = restResponses.flatMap(r => extractApiList<NutritionPlan>(r));
              return [...firstData, ...restData];
            })
          );
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: allPlans => this.allPlans.set(allPlans),
        error: () => {
          this.error.set('Could not load nutrition plans.');
          this.showToast('error', 'Failed to load nutrition plans.');
        }
      });
  }

  onFilterChange(filter: string) {
    this.selectedFilter.set(filter);
    this.currentPage.set(1);
    this.loadPlans();
  }

  onSearchChange(value: string): void {
    this.rawSearchQuery.set(value);
    this.searchInput$.next(value);
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onAddPlan(): void {
    const me = this.meId();
    if (!me) {
      this.showToast('error', 'You must be logged in to create a plan.');
      return;
    }
    if (this.gyms().length === 0) {
      this.showToast('error', 'No gyms assigned to your account.');
      return;
    }

    const preselectedMember = this.memberIdFilter();

    this.modalMode.set('add');
    this.planForm.set({
      id_plan: '',
      name: '',
      description: '',
      image: '',
      goal: '',
      start_date: '',
      end_date: '',
      id_nutritionist: me,
      id_members: preselectedMember ? [preselectedMember] : [],
      price: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      calories: 0,
      score: 95,
      meals: [],
      supplements: []
    });
    this.showModal.set(true);
  }

  onEditPlan(plan: NutritionPlan): void {
    if (!isOwnedByNutritionist(plan, this.meId())) {
      this.showToast('error', 'You can only edit your own plans.');
      return;
    }
    const memberIds = (plan as any).id_members || plan.members?.map(m => m.id_user) || [];
    this.modalMode.set('edit');
    this.planForm.set({
      ...plan,
      id_members: Array.isArray(memberIds) ? memberIds : [memberIds].filter(Boolean),
      id_nutritionist: (plan as any).id_nutritionist || (plan as any).nutritionist?.id_user || this.meId() || '',
      meals: plan.meals || [],
      supplements: plan.supplements || []
    });
    const gymId = (plan as any)?.id_gym;
    this.selectedGymId = gymId ? Number(gymId) : this.selectedGymId;
    this.showModal.set(true);
  }

  selectedMemberForPlanChat = signal<any | null>(null);
  showMemberSelector = signal<any[] | null>(null);
  currentPlanMembers = signal<any[]>([]);

  onMessagePlan(plan: NutritionPlan): void {
    let members = plan.members || [];
    
    if (members.length === 0 && (plan as any).id_members?.length > 0) {
      const ids = (plan as any).id_members;
      members = this.members().filter(m => ids.includes(m.id_user));
    }

    if (members.length === 0) {
      this.showToast('info', 'No members are currently synchronized with this metabolic protocol.');
      return;
    }

    this.currentPlanMembers.set(members);

    if (members.length > 1) {
      this.showMemberSelector.set(members);
      this.selectedMemberForPlanChat.set(null);
      return;
    }
    
    this.initiateBioLink(members[0]);
  }

  initiateBioLink(member: any): void {
    this.selectedMemberForPlanChat.set(null);
    this.showMemberSelector.set(null);
    
    setTimeout(() => {
      this.selectedMemberForPlanChat.set({
        id_user: member.id_user,
        name: member.name,
        last_name: member.last_name || ''
      });
    }, 50);
  }

  closePlanChat(): void {
    this.selectedMemberForPlanChat.set(null);
    this.showMemberSelector.set(null);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitPlan(): void {
    const me = this.meId();
    const plan = this.planForm();
    const memberIds = (plan as any).id_members || [];
    const gymId = this.selectedGymId;

    if (!me) {
      this.showToast('error', 'You must be logged in.');
      return;
    }
    if (!gymId) {
      this.showToast('error', 'Please select a gym.');
      return;
    }
    if (!plan.goal || !plan.start_date || !plan.end_date || !Array.isArray(memberIds) || memberIds.length === 0) {
      this.showToast('error', 'Please fill required fields and select at least one client.');
      return;
    }

    const payload: any = {
      id_gym: gymId,
      name: plan.name,
      image: plan.image,
      goal: plan.goal,
      start_date: plan.start_date,
      end_date: plan.end_date,
      price: plan.price,
      id_nutritionist: me,
      id_members: memberIds,
      // Metabolic Metrics
      protein: plan.protein || 0,
      carbs: plan.carbs || 0,
      fats: plan.fats || 0,
      calories: plan.calories || 0,
      score: plan.score || 95,
      // Nested Protocol Data
      meals: (plan.meals || []).map(m => ({
        name: m.name,
        time: m.time,
        description: m.description || '',
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fats: m.fats || 0,
        calories: m.calories || 0
      })),
      supplements: (plan.supplements || []).map(s => ({
        name: s.name,
        dosage: s.dosage,
        timing: s.timing,
        type: s.type || 'capsule'
      }))
    };

    if (this.modalMode() === 'add') {
      this.api.createNutritionPlan(payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadPlans();
          this.showToast('success', 'Nutrition plan created.');
          this.router.navigate([], { queryParams: { memberId: null }, queryParamsHandling: 'merge' });
        },
        error: () => this.showToast('error', 'Failed to create plan.')
      });
      return;
    }

    if (!isOwnedByNutritionist(plan, me)) {
      this.showToast('error', 'You can only update your own plans.');
      return;
    }

    this.api.updateNutritionPlan(plan.id_plan, payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadPlans();
        this.showToast('success', 'Nutrition plan updated.');
      },
      error: () => this.showToast('error', 'Failed to update plan.')
    });
  }

  requestDelete(id: string): void {
    const target = this.allPlans().find(p => p.id_plan === id);
    if (!target || !isOwnedByNutritionist(target, this.meId())) {
      this.showToast('error', 'You can only delete your own plans.');
      return;
    }
    this.pendingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.pendingDeleteId.set(null);
    this.api.deleteNutritionPlan(id).subscribe({
      next: () => {
        // Optimistic removal without full refetch.
        this.allPlans.update(list => list.filter(plan => plan.id_plan !== id));
        this.showToast('success', 'Nutrition plan deleted.');
      },
      error: () => this.showToast('error', 'Failed to delete plan.')
    });
  }

  filteredPlans = computed(() => {
    const me = this.meId();
    const today = new Date().toISOString().split('T')[0];
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedFilter();
    const memberId = this.memberIdFilter();

    let list: any[] = this.allPlans() as any[];

    // RBAC-safe UI: Nutritionists only operate on their own plans.
    if (me) list = list.filter(p => isOwnedByNutritionist(p, me));

    if (memberId) {
      list = list.filter(p => (p.members ?? []).some((m: any) => m.id_user === memberId));
    }

    if (q) {
      list = list.filter(p =>
        (p.goal ?? '').toLowerCase().includes(q) ||
        (p.members ?? []).some((m: any) => `${m.name ?? ''} ${m.last_name ?? ''}`.toLowerCase().includes(q))
      );
    }

    if (filter === 'Active') list = list.filter(p => p.start_date <= today && p.end_date >= today);
    if (filter === 'Upcoming') list = list.filter(p => p.start_date > today);
    if (filter === 'Expired') list = list.filter(p => p.end_date < today);

    return list as NutritionPlan[];
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPlans().length / this.perPage())));

  pagedPlans = computed(() => {
    const page = this.currentPage();
    const per = this.perPage();
    const start = (page - 1) * per;
    return this.filteredPlans().slice(start, start + per);
  });
}

