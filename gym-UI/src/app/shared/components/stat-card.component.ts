import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="glass-card shadow-card group">
      
      <!-- Hover gradient bloom -->
      <div class="bloom absolute -top-24 -right-24 w-48 h-48 transition-opacity duration-300 opacity-0 group-hover:opacity-100 blur-[50px] rounded-full"
           [ngClass]="colorBloomClass()"></div>
           
      <div class="relative z-10 flex justify-between items-start mb-4">
        <div class="icon-box w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110"
             [ngClass]="iconContainerClass()">
          <mat-icon [ngClass]="iconColor()" class="!text-2xl">{{icon}}</mat-icon>
        </div>
        <div class="trend-pill flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold truncate max-w-[100px]"
             [ngClass]="trendClass()" *ngIf="trend">
          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">{{trendIcon()}}</mat-icon>
          {{trend}}%
        </div>
      </div>
      
      <div class="relative z-10 flex flex-col gap-1">
        <span class="label text-xs font-bold uppercase tracking-wider">{{title}}</span>
        <div class="flex items-baseline gap-2">
           <span *ngIf="!loading" class="value text-3xl font-black tracking-tight">{{value}}</span>
           <mat-spinner *ngIf="loading" diameter="24"></mat-spinner>
           <span *ngIf="subtitle && !loading" class="subtitle text-sm font-semibold">{{subtitle}}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass-card {
      background: var(--admin-glass, white);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 1.5rem;
      padding: 1.5rem;
      border: 1px solid var(--admin-glass-border, #e2e8f0);
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      
      &.shadow-card {
        box-shadow: var(--admin-glass-shadow, 0 4px 6px rgba(0,0,0,0.05));
      }

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
        border-color: var(--admin-accent-indigo);

        .dark & {
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.2);
        }
      }
    }

    .label { color: var(--admin-text-secondary, #64748b); }
    .value { color: var(--admin-text-primary, #0f172a); }
    .subtitle { color: var(--admin-text-secondary, #94a3b8); opacity: 0.7; }
    
    .bloom { mix-blend-mode: multiply; }
    .dark .bloom { mix-blend-mode: screen; }
  `]
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value: number | string = 0;
  @Input() subtitle = '';
  @Input() icon = 'show_chart';
  @Input() color: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' = 'blue';
  @Input() trend?: number;
  @Input() loading = false;

  colorBloomClass() {
    return {
      'bg-gradient-to-br from-blue-400/30 to-indigo-500/30': this.color === 'blue',
      'bg-gradient-to-br from-emerald-400/30 to-teal-500/30': this.color === 'emerald',
      'bg-gradient-to-br from-rose-400/30 to-pink-500/30': this.color === 'rose',
      'bg-gradient-to-br from-amber-400/30 to-orange-500/30': this.color === 'amber',
      'bg-gradient-to-br from-purple-400/30 to-fuchsia-500/30': this.color === 'purple'
    };
  }

  iconContainerClass() {
    return {
      'bg-blue-50/50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20': this.color === 'blue',
      'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20': this.color === 'emerald',
      'bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20': this.color === 'rose',
      'bg-amber-50/50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20': this.color === 'amber',
      'bg-purple-50/50 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20': this.color === 'purple'
    };
  }

  iconColor() {
    return {
      'text-blue-600 dark:text-blue-400': this.color === 'blue',
      'text-emerald-600 dark:text-emerald-400': this.color === 'emerald',
      'text-rose-600 dark:text-rose-400': this.color === 'rose',
      'text-amber-600 dark:text-amber-400': this.color === 'amber',
      'text-purple-600 dark:text-purple-400': this.color === 'purple'
    };
  }

  trendClass() {
    if (!this.trend) return '';
    return this.trend > 0 
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
      : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
  }

  trendIcon() {
    if (!this.trend) return '';
    return this.trend > 0 ? 'trending_up' : 'trending_down';
  }
}
