import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { GymNotification } from '../../../shared/models/notification.model';
import { SupportResponseDialogComponent } from './support-response-dialog.component';

@Component({
  selector: 'app-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  template: `
    <div class="admin-page-container reclamation-page">
      <!-- Premium Background Elements -->
      <div class="floating-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>

      <header class="admin-header">
        <div class="flex justify-between items-start">
          <div class="header-main">
            <div class="admin-badge-mini">
              <mat-icon>support_agent</mat-icon>
              Resolution Command
            </div>
            <h1>Support Vector</h1>
            <p>Operational monitoring of facility owner claims and escalations</p>
          </div>
          <div class="header-actions pt-4">
            <button 
              *ngIf="pendingTickets().length > 0" 
              (click)="markAllAsRead()" 
              class="admin-btn btn-primary"
            >
              <mat-icon>done_all</mat-icon>
              <span>Resolve All Pending</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Metrics Summary -->
      <div class="metrics-grid mt-10 mb-8">
        <div 
          class="metric-card style-blue animate-in slide-in-from-left duration-500 clickable"
          (click)="selectedRole.set('all')"
          [class.active]="selectedRole() === 'all'"
        >
          <div class="metric-icon-box">
            <mat-icon>analytics</mat-icon>
          </div>
          <div class="metric-info">
            <span class="label">Total Inbound</span>
            <span class="value">{{ allTickets().length }}</span>
            <div class="sub-meta">
              <span class="caption">Lifetime claims registered</span>
            </div>
          </div>
        </div>

        <div 
          class="metric-card style-rose animate-in slide-in-from-left duration-700 clickable"
          (click)="searchQuery.set('unread')"
          [class.active]="searchQuery() === 'unread'"
        >
          <div class="metric-icon-box">
            <mat-icon>priority_high</mat-icon>
          </div>
          <div class="metric-info">
            <span class="label">Pending Action</span>
            <span class="value">{{ pendingTickets().length }}</span>
            <div class="sub-meta">
              <div class="trend-tag" *ngIf="pendingTickets().length > 0">
                 High Priority Queue
              </div>
              <span class="caption" *ngIf="pendingTickets().length === 0">System Stabilized</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Control Section -->
      <div class="control-section animate-in fade-in duration-1000">
        <!-- Role Filter Bar -->
        <div class="role-filter-bar mb-6">
          <button 
            *ngFor="let r of roles" 
            (click)="setRole(r.id)"
            class="filter-chip"
            [class.active]="selectedRole() === r.id"
          >
            <mat-icon>{{ r.icon }}</mat-icon>
            <span>{{ r.label }}</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="admin-search-bar">
          <div class="search-input-wrap">
            <mat-icon>search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Filter by name, description, or entry ID..." 
            />
          </div>
          <div class="count-tag glass-tag">
            <div class="status-pulse" [class.active]="filteredTickets().length > 0"></div>
            {{ filteredTickets().length }} Nodes Detected
          </div>
        </div>
      </div>

      <!-- Tickets Feed -->
      <div class="reclamations-feed-container">
        <div *ngIf="loading()" class="flex flex-col items-center justify-center py-32 gap-6">
          <div class="admin-spinner"></div>
          <span class="text-xs font-black uppercase tracking-widest text-[#64748b] animate-pulse">Synchronizing Data Streams...</span>
        </div>

        <div *ngIf="!loading() && filteredTickets().length === 0" class="hero-command-card mx-auto mt-12 animate-in zoom-in duration-700">
           <div class="hero-visual">
              <mat-icon>verified_user</mat-icon>
           </div>
           <h1>Protocol Stabilized</h1>
           <p class="hero-description"><span class="accent">All sectors</span> are currently operational.</p>
           <div class="hero-info-box">
              <div class="info-header">
                 <div class="icon-box"><mat-icon>shield</mat-icon></div>
                 <h4>Core Status</h4>
              </div>
              <p>The support vector is currently clear. No anomalies or facility claims have been detected in the selected segment.</p>
           </div>
        </div>

        <div *ngIf="!loading() && filteredTickets().length > 0" class="tickets-grid animate-in slide-in-from-bottom-8 duration-700">
          <div *ngFor="let ticket of filteredTickets(); let i = index" 
               class="ticket-card-premium" 
               [class.is-unread]="ticket.unread"
               [style.animation-delay]="(i * 50) + 'ms'">
            
            <!-- Card Header: User Identity -->
            <div class="card-header">
              <div class="user-profile">
                <div class="avatar-container">
                  <mat-icon *ngIf="!ticket.sender?.profile_picture">account_circle</mat-icon>
                  <img *ngIf="ticket.sender?.profile_picture" [src]="ticket.sender?.profile_picture" alt="User" />
                  <div class="role-indicator" [attr.data-role]="ticket.sender?.role?.toLowerCase()"></div>
                </div>
                <div class="user-meta">
                  <h3>{{ ticket.sender?.name || 'Anonymous' }} {{ ticket.sender?.last_name || '' }}</h3>
                  <span class="user-email" *ngIf="ticket.sender?.email">{{ ticket.sender?.email }}</span>
                  <span class="role-tag">{{ ticket.sender?.role || 'Guest' }}</span>
                </div>
              </div>
              <div class="status-badge" [class.urgent]="ticket.unread">
                <mat-icon>{{ ticket.unread ? 'bolt' : 'verified' }}</mat-icon>
              </div>
            </div>

            <!-- Card Body: The Message -->
            <div class="card-body">
              <div class="message-bubble">
                <p>{{ ticket.description || 'No description provided.' }}</p>
              </div>
              <div class="time-meta">
                <mat-icon>schedule</mat-icon>
                <span>{{ ticket.time || 'recently' | uppercase }}</span>
              </div>
            </div>

            <!-- Card Footer: Actions & ID -->
            <div class="card-footer">
              <div class="entry-info">
                <span class="label">ID:</span>
                <span class="value">{{ (ticket.id || '').substring(0, 8) | uppercase }}</span>
              </div>
              <div class="action-buttons">
                <button *ngIf="ticket.unread" (click)="markAsRead(ticket.id)" class="icon-btn resolve" title="Resolve">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button (click)="openResponse(ticket)" class="icon-btn response" title="Respond">
                  <mat-icon>forum</mat-icon>
                </button>
                <button (click)="deleteReclamation(ticket.id)" class="icon-btn delete" [disabled]="deletingId() === ticket.id" title="Delete Permanent">
                  <mat-icon *ngIf="deletingId() !== ticket.id">delete_forever</mat-icon>
                  <span class="admin-spinner mini" *ngIf="deletingId() === ticket.id"></span>
                </button>
              </div>
            </div>

            <!-- Background Decoration -->
            <div class="card-glow"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './reclamations.component.scss'
})
export class ReclamationsComponent {
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  
  loading = signal(false);
  deletingId = signal<string | null>(null);
  searchQuery = signal('');
  selectedRole = signal<string>('all');
  
  roles = [
    { id: 'all', label: 'All Segments', icon: 'grid_view' },
    { id: 'owner', label: 'Gym Owners', icon: 'business' },
    { id: 'trainer', label: 'Trainers', icon: 'fitness_center' },
    { id: 'receptionist', label: 'Staff', icon: 'badge' },
    { id: 'member', label: 'Members', icon: 'person' }
  ];
  
  allTickets = computed(() => 
    this.notificationService.notifications().filter(n => n.type === 'support_ticket')
  );

  pendingTickets = computed(() => 
    this.allTickets().filter(t => t.unread)
  );

  filteredTickets = computed(() => {
    let query = this.searchQuery().toLowerCase();
    const role = this.selectedRole();
    
    let tickets = this.allTickets();

    if (query === 'unread') {
      tickets = tickets.filter(t => t.unread);
      query = '';
    }
    
    return tickets.filter(t => {
      const matchesSearch = !query || 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.sender?.name?.toLowerCase().includes(query) ||
        t.sender?.last_name?.toLowerCase().includes(query) ||
        t.sender?.email?.toLowerCase().includes(query) ||
        t.id?.toLowerCase().includes(query);
        
      const matchesRole = role === 'all' || t.sender?.role?.toLowerCase() === role;
      
      return matchesSearch && matchesRole;
    });
  });

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.notificationService.fetchNotifications().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
    this.toastService.success('Ticket marked as resolved');
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
    this.toastService.success('All pending tickets resolved');
  }

  setRole(roleId: string) {
    this.selectedRole.set(roleId);
    if (this.searchQuery() === 'unread') this.searchQuery.set('');
  }

  openResponse(ticket: GymNotification) {
    this.dialog.open(SupportResponseDialogComponent, {
      width: '600px',
      data: {
        ticketId: ticket.id,
        userId: ticket.sender?.id_user,
        senderName: `${ticket.sender?.name} ${ticket.sender?.last_name}`,
        description: ticket.description
      }
    });
  }

  deleteReclamation(id: string) {
    if (confirm('Are you sure you want to permanently delete this reclamation? This action cannot be undone.')) {
      this.deletingId.set(id);
      this.notificationService.deleteNotification(id).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.toastService.success('Reclamation deleted successfully');
        },
        error: (err) => {
          this.deletingId.set(null);
          console.error('Delete failed', err);
          this.toastService.error(err.error?.message || 'Failed to delete reclamation');
        }
      });
    }
  }
}
