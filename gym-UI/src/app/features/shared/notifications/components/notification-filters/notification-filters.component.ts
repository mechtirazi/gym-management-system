import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationLogFilter } from '../../notifications.model';

@Component({
  selector: 'app-notification-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filters-container">
      <div class="log-filters">
        <button 
          class="filter-tab" 
          [class.active]="currentFilter === 'all'" 
          (click)="onFilterChange.emit('all')"
        >
          All <span>({{ totalCount }})</span>
        </button>
        <button 
          class="filter-tab" 
          [class.active]="currentFilter === 'unread'" 
          (click)="onFilterChange.emit('unread')"
        >
          Unread <span>({{ unreadCount }})</span>
        </button>
      </div>

      <div class="search-input-wrapper">
        <input 
          type="text" 
          placeholder="Filter targets by name..." 
          (input)="onSearch.emit($any($event.target).value)"
          class="target-search"
        >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21L16.65 16.65"></path>
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .filters-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .log-filters {
      display: flex;
      gap: 1rem;
    }

    .filter-tab {
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      padding: 0.6rem 1.2rem;
      border-radius: 12px;
      color: var(--admin-text-secondary);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      span { opacity: 0.5; font-size: 0.75rem; }

      &.active {
        background: var(--admin-accent-indigo);
        color: white;
        border-color: var(--admin-accent-indigo);
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
        span { opacity: 0.8; }
      }

      &:hover:not(.active) {
        background: var(--admin-item-bg);
        transform: translateY(-2px);
      }
    }

    .search-input-wrapper {
      position: relative;
      input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border-radius: 12px;
        border: 1px solid var(--admin-item-border);
        background: var(--admin-item-bg);
        color: var(--admin-text-primary);
        font-size: 0.85rem;
        outline: none;
        transition: all 0.3s;
        &:focus { border-color: var(--admin-accent-indigo); }
      }
      svg {
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: var(--admin-text-secondary);
        opacity: 0.5;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationFiltersComponent {
  @Input() currentFilter: NotificationLogFilter = 'all';
  @Input() totalCount = 0;
  @Input() unreadCount = 0;

  @Output() onFilterChange = new EventEmitter<NotificationLogFilter>();
  @Output() onSearch = new EventEmitter<string>();
}
