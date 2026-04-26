import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from './services/membership.service';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { MembershipCardComponent } from './components/membership-card/membership-card.component';
import { AddMembershipModalComponent } from './components/add-membership-modal/add-membership-modal.component';
import { ViewMembershipModalComponent } from './components/view-membership-modal/view-membership-modal.component';
import { EditMembershipModalComponent } from './components/edit-membership-modal/edit-membership-modal.component';
import { finalize } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-membership-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    MembershipCardComponent,
    AddMembershipModalComponent,
    ViewMembershipModalComponent,
    EditMembershipModalComponent
  ],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.scss'
})
export class MembershipManagementComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private confirmService = inject(ConfirmDialogService);

  private allSubscriptions = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Modal states
  isAddModalOpen = signal<boolean>(false);
  viewedMembership = signal<any | null>(null);
  editingMembership = signal<any | null>(null);

  // Pagination states
  currentPage = signal<number>(1);
  pageSize = signal<number>(9);
  totalItems = signal<number>(0);
  lastPage = signal<number>(1);

  memberships = computed(() => {
    return this.allSubscriptions();
  });

  ngOnInit() {
    this.refreshSubscriptions();
  }

  refreshSubscriptions() {
    this.isLoading.set(true);
    this.error.set(null);

    const filters = {
      status: this.selectedStatus(),
      search: this.searchQuery()
    };

    this.membershipService.getSubscriptions(this.currentPage(), this.pageSize(), filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          let items: any[] = [];
          if (response?.data && Array.isArray(response.data)) {
            items = response.data;
          } else if (Array.isArray(response)) {
            items = response;
          }

          if (response?.current_page !== undefined) {
            this.currentPage.set(response.current_page);
            this.totalItems.set(response.total || items.length);
            this.lastPage.set(response.last_page || 1);
          } else {
            this.totalItems.set(items.length);
            this.lastPage.set(1);
          }

          this.allSubscriptions.set(items);
        },
        error: (err) => {
          console.error('Failed to load memberships', err);
          this.error.set('Could not fetch membership data.');
        }
      });
  }

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.refreshSubscriptions();
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.refreshSubscriptions();
  }

  // ─── Modal Actions ────────────────────────────────────────────────────────
  openAddModal() {
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  onMembershipAdded() {
    console.log('Membership added successfully, refreshing list...');
    this.refreshSubscriptions();
  }

  // ─── Pagination Controls ──────────────────────────────────────────────────
  nextPage() {
    if (this.currentPage() < this.lastPage()) {
      this.currentPage.update(p => p + 1);
      this.refreshSubscriptions();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.refreshSubscriptions();
    }
  }

  onCancelMembership(id: string) {
    this.confirmService.open({
      title: 'Cancel Membership',
      message: 'Are you sure you want to cancel this membership?',
      confirmText: 'Cancel Membership',
      icon: 'warning',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.membershipService.deleteSubscription(id).subscribe({
          next: () => {
            console.log('Membership cancelled successfully');
            this.refreshSubscriptions();
          },
          error: (err) => this.error.set('Operation failed.')
        });
      }
    });
  }

  onViewDetails(membership: any) {
    console.log('Viewing details for:', membership);
    this.viewedMembership.set(membership);
  }

  closeViewModal() {
    this.viewedMembership.set(null);
  }

  onEditMember(membership: any) {
    console.log('Editing member:', membership);
    this.editingMembership.set(membership);
  }

  closeEditModal() {
    this.editingMembership.set(null);
  }

  onMembershipUpdated() {
    console.log('Membership updated, refreshing list...');
    this.refreshSubscriptions();
  }
}
