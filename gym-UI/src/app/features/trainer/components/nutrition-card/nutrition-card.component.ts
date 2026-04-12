import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NutritionPlan } from '../../../../shared/models/nutrition.model';

@Component({
  selector: 'app-nutrition-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nutrition-card glass-card">
      <div class="card-header">
        <span class="date-range">{{ plan().start_date | date:'shortDate' }} - {{ plan().end_date | date:'shortDate' }}</span>
      </div>
      <div class="card-body">
        <h3 class="member-name">{{ plan().members?.[0]?.name || 'Unknown Member' }}</h3>
        <p class="goal-text">Goal: {{ plan().goal }}</p>
      </div>
      <div class="card-footer">
        <span class="nutritionist">By: {{ plan().nutritionist?.name || 'Assigned Nutritionist' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .nutrition-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      &:hover { transform: translateY(-4px); border-color: var(--primary-light); }
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .type-badge { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; }
    .date-range { color: var(--text-muted); font-size: 0.75rem; }
    .member-name { font-size: 1.1rem; margin: 0; color: var(--text-main); }
    .goal-text { font-size: 0.9rem; color: var(--text-muted); margin: 0.5rem 0 0; }
    .card-footer { padding-top: 1rem; border-top: 1px solid var(--border-color); }
    .nutritionist { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
  `]
})
export class NutritionCardComponent {
  plan = input.required<NutritionPlan>();
}
