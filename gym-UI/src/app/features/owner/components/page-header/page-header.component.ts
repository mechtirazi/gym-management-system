import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header glass-card">
      <div class="header-main">
        <div class="title-section">
          <div class="icon-bubble">
            <ng-content select="[header-icon]"></ng-content>
          </div>
          <div class="text-content">
            <h1>{{ title() }}</h1>
            <p class="subtitle">{{ subtitle() }}</p>
          </div>
        </div>
        @if (buttonText()) {
          <button class="add-btn gradient-btn" (click)="addClick.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ buttonText() }}
          </button>
        }
      </div>
      <ng-content></ng-content>
    </header>
  `,
  styles: [`
    .glass-card {
      background: var(--bg-glass);
      backdrop-filter: blur(24px) saturate(160%);
      border: 1.5px solid var(--border-glass);
      border-radius: 28px;
      box-shadow: var(--shadow-md);
    }
    .page-header {
      padding: 2.5rem 3rem;
      .header-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2.5rem;
      }
      .title-section {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        .icon-bubble {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
          color: white;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
        }
        h1 {
          font-size: 2rem;
          font-weight: 900;
          color: var(--text-main);
          letter-spacing: -0.04em;
          margin: 0 0 0.25rem 0;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }
      }
    }
    .add-btn {
      padding: 0.9rem 2rem;
      border-radius: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      cursor: pointer;
      border: none;
      background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
      color: white;
      box-shadow: 0 8px 15px rgba(14, 165, 233, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      &:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 12px 25px rgba(14, 165, 233, 0.3);
      }
    }
    @media (max-width: 768px) {
      .page-header {
        padding: 1.5rem;
        .header-main { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      }
    }
  `]
})
export class PageHeaderComponent {
  title = input<string>('Manage');
  subtitle = input<string>('');
  buttonText = input<string>('');
  addClick = output<void>();
}
