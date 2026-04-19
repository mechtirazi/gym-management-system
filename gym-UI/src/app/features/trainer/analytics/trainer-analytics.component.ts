import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerService } from '../services/trainer.service';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-trainer-analytics',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('cardStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', animate('0.6s cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="analytics-page">
      <header class="page-header">
        <div class="header-content">
          <div class="title-group">
            <h1>Performance Analytics</h1>
            <p class="subtitle">Track your session popularity and member commitment trends.</p>
          </div>
          <div class="time-badge">
            <span class="pulse-icon"></span>
            Live Updates
          </div>
        </div>
      </header>

      <div class="analytics-grid" [@cardStagger]="isLoading() ? 0 : 5">
        <!-- Growth Card -->
        <div class="stats-card glass-card span-2">
          <div class="card-header">
            <h3>Attendance Growth</h3>
            <span [class]="'growth-badge ' + (analytics()?.monthly?.growth >= 0 ? 'positive' : 'negative')">
              {{ analytics()?.monthly?.growth > 0 ? '+' : '' }}{{ analytics()?.monthly?.growth }}% vs last month
            </span>
          </div>
          <div class="big-stats">
            <div class="stat-main">
              <span class="value">{{ analytics()?.monthly?.current || 0 }}</span>
              <span class="label">Total Check-ins</span>
            </div>
            <div class="trend-lines">
              <div *ngFor="let item of analytics()?.trend" class="bar-wrap">
                <div class="bar" [style.height.%]="getBarHeight(item.count)">
                  <div class="tooltip">{{ item.count }}</div>
                </div>
                <span class="bar-label">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Popularity Card -->
        <div class="stats-card glass-card">
          <h3>Top Courses</h3>
          <div class="vertical-chart">
            <div *ngFor="let item of analytics()?.popularity; let i = index" class="chart-column">
              <div class="bar-container">
                <div class="bar-fill" [style.height.%]="(item.total_attendance / maxPopularity()) * 100">
                  <span class="value">{{ item.total_attendance }}</span>
                </div>
              </div>
              <span class="course-name">{{ item.name }}</span>
            </div>
          </div>
        </div>

        <!-- Member Engagement Card -->
        <div class="stats-card glass-card">
          <h3>Most Active Members</h3>
          <div class="engagement-list">
            <div *ngFor="let member of analytics()?.engagement" class="member-row">
              <div class="member-avatar">
                {{ (member.name || '')[0] }}{{ (member.last_name || '')[0] }}
              </div>
              <div class="member-info">
                <span class="m-name">{{ member.name }} {{ member.last_name }}</span>
                <span class="m-stat">{{ member.checkins }} Sessions this month</span>
              </div>
              <div class="loyalty-dot" [class.gold]="member.checkins > 10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page {
      padding: clamp(1.5rem, 5vw, 3rem);
      max-width: 1600px;
      margin: 0 auto;
      min-height: 100vh;
    }

    .page-header {
      margin-bottom: 3rem;
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
      }
      h1 {
        font-size: clamp(2rem, 5vw, 3.5rem);
        font-weight: 900;
        background: linear-gradient(135deg, var(--admin-accent-indigo) 0%, var(--admin-accent-emerald) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        letter-spacing: -0.05em;
      }
      .title-with-context {
        display: flex;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
      }
      .subtitle {
        color: var(--admin-text-secondary);
        font-weight: 500;
        margin-top: 0.5rem;
        opacity: 0.8;
      }
    }

    .time-badge {
      padding: 0.6rem 1.2rem;
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--admin-text-primary);
      .pulse-icon {
        width: 8px;
        height: 8px;
        background: var(--admin-accent-emerald);
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
        animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }

    .span-2 { grid-column: span 2; }

    .glass-card {
      background: var(--admin-glass);
      backdrop-filter: blur(20px);
      border-radius: 32px;
      border: 1px solid var(--admin-glass-border);
      padding: 2.5rem;
      box-shadow: var(--admin-glass-shadow);
      transition: transform 0.3s;
      &:hover { transform: translateY(-5px); }
      h3 { margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 800; opacity: 0.9; }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .growth-badge {
      padding: 0.5rem 1rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 800;
      &.positive { background: rgba(16, 185, 129, 0.1); color: #10b981; }
      &.negative { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
    }

    .big-stats {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 3rem;
      align-items: center;
    }

    .stat-main {
      .value { font-size: 4.5rem; font-weight: 900; line-height: 1; letter-spacing: -2px; }
      .label { display: block; font-size: 0.9rem; font-weight: 700; opacity: 0.6; margin-top: 0.5rem; }
    }

    .trend-lines {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      height: 140px;
      padding-bottom: 2rem;
    }

    .bar-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      height: 100%;
      justify-content: flex-end;
    }

    .bar {
      width: 100%;
      background: linear-gradient(to top, var(--admin-accent-indigo), var(--admin-accent-emerald));
      border-radius: 8px;
      min-height: 4px;
      position: relative;
      transition: height 1s ease-out;
      cursor: pointer;
      &:hover .tooltip { opacity: 1; transform: translate(-50%, -10px); }
    }

    .tooltip {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translate(-50%, 0);
      background: var(--admin-text-primary);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.7rem;
      pointer-events: none;
      opacity: 0;
      transition: all 0.2s;
    }

    .bar-label { font-size: 0.7rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; }

    .vertical-chart {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 200px;
      gap: 1rem;
      padding-top: 2rem;
    }

    .chart-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      gap: 1rem;
    }

    .bar-container {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: var(--admin-item-bg);
      border-radius: 12px;
      overflow: hidden;
    }

    .chart-column .bar-fill {
      width: 100%;
      background: linear-gradient(135deg, var(--admin-accent-indigo) 0%, var(--admin-accent-emerald) 100%);
      border-radius: 12px;
      transition: height 1s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 0.5rem;
      position: relative;

      .value {
        font-size: 0.75rem;
        font-weight: 800;
        color: white;
      }
    }

    .course-name {
      font-size: 0.7rem;
      font-weight: 700;
      opacity: 0.6;
      text-align: center;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 60px;
    }

    .engagement-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .member-row {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 0.75rem;
      border-radius: 16px;
      transition: background 0.2s;
      &:hover { background: var(--admin-item-bg); }
    }

    .member-avatar {
      width: 44px;
      height: 44px;
      background: var(--admin-accent-indigo);
      color: white;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.9rem;
    }

    .member-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      .m-name { font-weight: 800; }
      .m-stat { font-size: 0.75rem; opacity: 0.6; font-weight: 600; }
    }

    .loyalty-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--admin-glass-border);
      &.gold { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.4); }
    }

    @media (max-width: 1100px) {
      .analytics-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: auto; }
      .big-stats { grid-template-columns: 1fr; }
    }
  `]
})
export class TrainerAnalyticsComponent implements OnInit {
  private trainerService = inject(TrainerService);
  private authService = inject(AuthService);

  activeGymId = this.authService.connectedGymId;
  analytics = signal<any>(null);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadAnalytics();
  }


  loadAnalytics() {
    this.isLoading.set(true);
    this.trainerService.getAnalytics().subscribe({
      next: (res) => {
        if (res.success) {
          this.analytics.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  maxPopularity() {
    const popularity = this.analytics()?.popularity || [];
    return popularity.length > 0 ? Math.max(...popularity.map((p: any) => p.total_attendance)) : 100;
  }

  getBarHeight(count: number): number {
    const trend = this.analytics()?.trend || [];
    const max = Math.max(...trend.map((t: any) => t.count), 1);
    return (count / max) * 100;
  }
}
