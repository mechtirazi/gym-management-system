import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-controls">
      <div class="search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchChange.emit($event)"
          [placeholder]="searchPlaceholder()" aria-label="Search">
      </div>

      <div class="filter-group">
        @for (option of filterOptions(); track option) {
          <button class="filter-chip"
            [class.active]="selectedFilter() === (option === allText() ? 'All' : option)"
            (click)="filterChange.emit(option === allText() ? 'All' : option)"
            [attr.aria-label]="'Filter by ' + option">
            {{ option }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .filter-controls {
      display: flex;
      gap: 2rem;
      align-items: center;
      .search-wrap {
        flex: 1;
        position: relative;
        max-width: 480px;
        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        input {
          width: 100%;
          background: var(--bg-input);
          border: 1.5px solid var(--border-color);
          border-radius: 16px;
          padding: 0.9rem 1.2rem 0.9rem 3.5rem;
          font-size: 1rem;
          color: var(--text-main);
          font-weight: 500;
          transition: all 0.2s ease;
          &::placeholder { color: var(--text-muted); opacity: 0.6; }
          &:focus {
            background: var(--bg-card);
            border-color: #0ea5e9;
            box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1); outline: none;
          }
        }
      }
    }
    .filter-chip {
      padding: 0.6rem 1.4rem;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1.5px solid var(--border-color);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 0.5rem;
      &:hover { background: var(--bg-hover); color: #0ea5e9; border-color: #bae6fd; }
      &.active {
        background: #0ea5e9;
        color: white;
        border-color: #0ea5e9;
        box-shadow: 0 4px 10px rgba(14, 165, 233, 0.25);
      }
    }
    @media (max-width: 768px) {
      .filter-controls { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class FilterControlsComponent {
  searchQuery = input<string>('');
  searchChange = output<string>();
  searchPlaceholder = input<string>('Search...');

  selectedFilter = input<string>('All');
  filterChange = output<string>();
  filterOptions = input<string[]>([]);
  allText = input<string>('All');
}
