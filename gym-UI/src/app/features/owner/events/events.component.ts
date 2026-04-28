import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from './services/event.service';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { FilterControlsComponent } from '../components/filter-controls/filter-controls.component';
import { EventCardComponent } from './components/event-card/event-card.component';
import { EventAttendancesModalComponent } from './components/event-attendances-modal/event-attendances-modal.component';
import { EventModel } from '../../../shared/models/event.model';
import { finalize } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    FilterControlsComponent,
    EventCardComponent,
    EventAttendancesModalComponent
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventManagementComponent implements OnInit {
  private eventService = inject(EventService);
  private confirmService = inject(ConfirmDialogService);

  allEvents = signal<EventModel[]>([]);
  searchQuery = signal<string>('');
  selectedType = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination states
  currentPage = signal<number>(1);
  pageSize = signal<number>(9);
  totalItems = signal<number>(0);
  lastPage = signal<number>(1);

  // Modal state (Unified)
  showActionModal = signal<boolean>(false);
  selectedEvent = signal<EventModel | null>(null);

  filteredEvents = computed(() => {
    let list = this.allEvents();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();

    if (type === 'Rewarded') {
      list = list.filter(e => e.is_rewarded);
    } else if (type === 'Standard') {
      list = list.filter(e => !e.is_rewarded);
    }

    if (query) {
      list = list.filter(e =>
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading.set(true);
    this.error.set(null);
    this.eventService.getEvents(this.currentPage(), this.pageSize())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          let items: any[] = [];
          if (response && response.data) {
            items = Array.isArray(response.data) ? response.data : [response.data];
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
          
          this.allEvents.set(items);
        },
        error: (err) => {
          console.error('Failed to load events', err);
          this.error.set('Could not fetch the events list.');
        }
      });
  }

  onDeleteEvent(id: string) {
    this.confirmService.open({
      title: 'Remove Event',
      message: 'Are you sure you want to permanently cancel this event? This action cannot be reversed.',
      confirmText: 'Cancel Event',
      icon: 'warning',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.eventService.deleteEvent(id).subscribe({
          next: () => this.loadEvents(),
          error: (err) => this.error.set('Action failed to delete event.')
        });
      }
    });
  }

  // ─── Pagination Controls ──────────────────────────────────────────────────
  nextPage() {
    if (this.currentPage() < this.lastPage()) {
      this.currentPage.update(p => p + 1);
      this.loadEvents();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadEvents();
    }
  }

  openAddModal() {
    this.selectedEvent.set(null);
    this.showActionModal.set(true);
  }

  openManagementModal(event: EventModel) {
    this.selectedEvent.set(event);
    this.showActionModal.set(true);
  }

  closeActionModal() {
    this.showActionModal.set(false);
    this.selectedEvent.set(null);
  }
}
