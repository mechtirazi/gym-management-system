import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../services/subscription.service';
import { Subscription, SubscriptionStatus } from '../../../shared/models/subscription.model';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionManagementComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  subscriptions = signal<Subscription[]>([]);
  isLoading = signal<boolean>(true);

  searchTerm = signal<string>('');
  activeTab = signal<'all' | SubscriptionStatus>('all');

  showConfirmModal = signal<boolean>(false);
  subscriptionToCancel = signal<string | null>(null);

  showViewModal = signal<boolean>(false);
  subscriptionToView = signal<Subscription | null>(null);

  stats = computed(() => {
    const list = this.subscriptions();
    const active = list.filter(s => s.status === 'active').length;
    const expired = list.filter(s => s.status === 'expired').length;
    return {
      total: list.length,
      active,
      expired,
      revenue: active * 49.99
    };
  });

  filteredSubscriptions = computed(() => {
    let result = this.subscriptions();
    const tab = this.activeTab();
    const term = this.searchTerm().toLowerCase();

    if (tab !== 'all') {
      result = result.filter(s => s.status === tab);
    }

    if (term) {
      result = result.filter(s => {
        const namePart = `${s.user?.name || ''} ${s.user?.last_name || ''}`.toLowerCase();
        const emailPart = (s.user?.email || '').toLowerCase();
        return namePart.includes(term) || emailPart.includes(term);
      });
    }

    return result;
  });

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.isLoading.set(true);
    this.subscriptionService.getSubscriptions().subscribe({
      next: (data) => {
        // Laravel's BaseApiController wrapper usually returns wrapped {data: ...}
        // Our service map intercepts it, so it should be an array.
        if (Array.isArray(data)) {
          this.subscriptions.set(data);
        } else if (data && (data as any).data) { // Fallback if wrapping was double applied
          this.subscriptions.set((data as any).data);
        } else {
          this.subscriptions.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load subscriptions', err);
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'all' | SubscriptionStatus): void {
    this.activeTab.set(tab);
  }

  getStatusClass(status: SubscriptionStatus): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'expired': return 'status-expired';
      case 'cancelled': return 'status-cancelled';
      case 'paused': return 'status-paused';
      default: return 'status-inactive';
    }
  }

  cancelSubscription(sub: any): void {
    if (!sub) return;
    const id = sub.id_subscribe || sub.id;
    if (!id) return;

    this.subscriptionToCancel.set(id);
    this.showConfirmModal.set(true);
  }

  closeCancelConfirm(): void {
    this.showConfirmModal.set(false);
    this.subscriptionToCancel.set(null);
  }

  confirmCancel(): void {
    const id = this.subscriptionToCancel();
    if (!id) return;

    this.subscriptionService.updateStatus(id, 'cancelled').subscribe({
      next: () => {
        this.loadSubscriptions();
        this.closeCancelConfirm();
      },
      error: (err) => {
        console.error('Failed to cancel', err);
        this.closeCancelConfirm();
      }
    });
  }

  viewDetail(sub: Subscription): void {
    this.subscriptionToView.set(sub);
    this.showViewModal.set(true);
  }

  closeViewModal(): void {
    this.showViewModal.set(false);
    this.subscriptionToView.set(null);
  }

  getInitials(user: any): string {
    if (!user) return 'M';
    return (user.name?.charAt(0) || '') + (user.last_name?.charAt(0) || '');
  }
}
