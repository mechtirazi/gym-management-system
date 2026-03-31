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
  selectedFilter = signal<string>('All');

  filterOptions = ['All', 'Active Plans', 'No Plans'];

  plansByMemberId = signal<Record<string, number>>({});
  currentPage = signal(1);
  perPage = signal(10);

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

    this.api
      .getClients()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: res => {
          const users = extractApiList<any>(res);
          // Defensive filtering: nutritionist UI only handles member records.
          this.clients.set(users.filter(isMemberUser));
        },
        error: () => this.error.set('Could not load clients.')
      });

    this.api.getNutritionPlans(1, 300).subscribe({
      next: res => {
        const plans = extractApiList<any>(res);
        const me = this.auth.currentUser()?.id_user;
        const idx: Record<string, number> = {};
        for (const p of plans.filter(plan => isOwnedByNutritionist(plan, me))) {
          for (const m of (p?.members ?? [])) {
            const id = m?.id_user;
            if (!id) continue;
            idx[id] = (idx[id] ?? 0) + 1;
          }
        }
        this.plansByMemberId.set(idx);
      },
      error: () => this.plansByMemberId.set({})
    });
  }

  filteredClients = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedFilter();
    const idx = this.plansByMemberId();

    let list = this.clients();
    if (q) {
      list = list.filter(c => `${c.name ?? ''} ${c.last_name ?? ''}`.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q));
    }
    if (filter === 'Active Plans') {
      list = list.filter(c => (idx[c.id_user] ?? 0) > 0);
    }
    if (filter === 'No Plans') {
      list = list.filter(c => (idx[c.id_user] ?? 0) === 0);
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

