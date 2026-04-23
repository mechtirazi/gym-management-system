import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../owner/components/page-header/page-header.component';
import { FilterControlsComponent } from '../../owner/components/filter-controls/filter-controls.component';
import {
  extractApiList,
  isMemberUser,
  isOwnedByNutritionist
} from '../utils/nutritionist-dashboard.utils';

@Component({
  selector: 'app-nutritionist-clients',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, FilterControlsComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class NutritionistClientsComponent implements OnInit, OnDestroy {
  private api = inject(NutritionistNutritionService);
  private auth = inject(AuthService);
  private searchInput$ = new Subject<string>();
  private searchSub = this.searchInput$
    .pipe(debounceTime(250), distinctUntilChanged())
    .subscribe(value => this.searchQuery.set(value));

  isLoading = signal(true);
  error = signal<string | null>(null);

  clients = signal<any[]>([]);
  rawSearchQuery = signal('');
  searchQuery = signal('');
  selectedFilter = signal<string>('All Clients');

  filterOptions = ['All Clients', 'Single Program', 'Multiple Programs'];

  plansByMemberId = signal<Record<string, number>>({});
  currentPage = signal(1);
  perPage = signal(10);

  // Statistics
  totalClientsCount = computed(() => this.clients().length);
  activePlansCount = computed(() => {
    const idx = this.plansByMemberId();
    return this.clients().filter(c => (idx[c.id_user] ?? 0) > 0).length;
  });
  planCoveragePercentage = computed(() => {
    const total = this.totalClientsCount();
    if (total === 0) return 0;
    return Math.round((this.activePlansCount() / total) * 100);
  });

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.rawSearchQuery.set(value);
    this.searchInput$.next(value);
    this.currentPage.set(1);
  }

  onFilterChange(value: string): void {
    this.selectedFilter.set(value);
    this.currentPage.set(1);
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPage.set(1);

    // 1. Get all plans for this nutritionist to find who the clients are
    this.api.getNutritionPlans(1, 300).subscribe({
      next: res => {
        const plans = extractApiList<any>(res);
        const me = this.auth.currentUser()?.id_user;
        const myPlans = plans.filter(plan => isOwnedByNutritionist(plan, me));

        // 2. Extract unique members from these plans
        const clientMap = new Map<string, any>();
        const planCounter: Record<string, number> = {};

        for (const plan of myPlans) {
          const members = plan?.members ?? [];
          const gymName = plan?.gym?.name || 'Unknown Gym';
          const protocolName = plan?.goal || 'Nutrition Protocol';
          
          for (const m of members) {
            const id = m?.id_user;
            if (!id) continue;
            
            if (!clientMap.has(id)) {
              clientMap.set(id, { 
                ...m, 
                gymName, // Primary/First gym detected
                protocols: [] 
              });
            }
            
            const client = clientMap.get(id);
            client.protocols.push({
              id: plan.id_plan,
              name: protocolName,
              gymLogo: plan?.gym?.logo,
              gymName: gymName,
              price: plan.price,
              date: plan.start_date
            });
            
            // Count plans for badges
            planCounter[id] = (planCounter[id] ?? 0) + 1;
          }
        }

        this.clients.set(Array.from(clientMap.values()));
        this.plansByMemberId.set(planCounter);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Could not load your client caseload.');
        this.isLoading.set(false);
      }
    });
  }

  filteredClients = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedFilter();
    const idx = this.plansByMemberId();

    let list = this.clients();
    if (q) {
      list = list.filter(c => 
        `${c.name ?? ''} ${c.last_name ?? ''}`.toLowerCase().includes(q) || 
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.protocols || []).some((p: any) => 
          (p.name ?? '').toLowerCase().includes(q) || 
          (p.gymName ?? '').toLowerCase().includes(q)
        )
      );
    }
    if (filter === 'Single Program') {
      list = list.filter(c => (idx[c.id_user] ?? 0) === 1);
    }
    if (filter === 'Multiple Programs') {
      list = list.filter(c => (idx[c.id_user] ?? 0) > 1);
    }
    return list;
  });

  pagedClients = computed(() => {
    const page = this.currentPage();
    const per = this.perPage();
    const start = (page - 1) * per;
    return this.filteredClients().slice(start, start + per);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredClients().length / this.perPage())));

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }
}

