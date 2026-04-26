import { Component, inject, signal, OnInit, computed } from '@angular/core';
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
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-out', style({ opacity: 1 }))
      ])
    ])
  ],
  template: `
    <div class="analytics-container" *ngIf="!isLoading(); else loading">
      <header class="dashboard-header" [@fadeIn]>
        <div class="title-section">
          <span class="badge">Trainer Insights</span>
          <h1>Performance Analytics</h1>
          <p class="description">Actionable data to optimize your coaching impact and member retention.</p>
        </div>
        <div class="header-actions">
          <div class="live-indicator">
            <span class="dot"></span>
            Real-time Feed
          </div>
        </div>
      </header>

      <div class="analytics-grid" [@cardStagger]="5">
        <!-- Main Growth & Trend -->
        <div class="card glass-card main-trend span-3">
          <div class="card-header">
            <div class="header-info">
              <h3>Attendance Volume</h3>
              <p>Total check-ins across all your courses</p>
            </div>
            <div class="growth-metric" *ngIf="analytics()?.monthly?.growth !== undefined" [class.negative]="analytics()?.monthly?.growth < 0">
              <span class="icon">{{ analytics()?.monthly?.growth >= 0 ? '↑' : '↓' }}</span>
              <span class="value">{{ analytics()?.monthly?.growth }}%</span>
              <span class="period">vs last month</span>
            </div>
          </div>
          
          <div class="chart-container" *ngIf="analytics()?.trend?.length; else noTrend">
            <div class="main-stat">
              <span class="value">{{ analytics()?.monthly?.current || 0 }}</span>
              <span class="label">Check-ins</span>
            </div>
            <div class="svg-chart-wrap">
              <svg viewBox="0 0 700 150" class="trend-svg">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="var(--admin-accent-indigo)" />
                    <stop offset="100%" stop-color="var(--admin-accent-emerald)" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="var(--admin-accent-indigo)" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="var(--admin-accent-indigo)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <!-- Area path -->
                <path [attr.d]="areaPath()" class="area-path" fill="url(#areaGradient)"></path>
                <!-- Line path -->
                <path [attr.d]="linePath()" class="line-path" fill="none" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round"></path>
                <!-- Points -->
                <g *ngFor="let point of chartPoints(); let i = index">
                  <circle [attr.cx]="point.x" [attr.cy]="point.y" r="6" class="point-bg"></circle>
                  <circle [attr.cx]="point.x" [attr.cy]="point.y" r="3" class="point-fg"></circle>
                </g>
              </svg>
              <div class="x-axis">
                <span *ngFor="let item of analytics()?.trend">{{ item.date }}</span>
              </div>
            </div>
          </div>
          <ng-template #noTrend>
            <div class="empty-state-mini">
              <p>No check-in activity detected in the last 7 days.</p>
            </div>
          </ng-template>
        </div>

        <!-- Retention Score -->
        <div class="card glass-card retention-card">
          <h3>Member Retention</h3>
          <div class="retention-content" *ngIf="analytics()?.retention?.total > 0; else noRetention">
            <div class="radial-wrap">
              <svg viewBox="0 0 100 100" class="radial-svg">
                <circle cx="50" cy="50" r="45" class="bg"></circle>
                <circle cx="50" cy="50" r="45" class="fg" 
                  [style.stroke-dasharray]="retentionDashArray()"
                  stroke-linecap="round"></circle>
              </svg>
              <div class="radial-label">
                <span class="num">{{ analytics()?.retention?.rate }}%</span>
                <span class="txt">Loyalty</span>
              </div>
            </div>
            <div class="retention-stats">
              <div class="stat-item">
                <span class="label">Returning</span>
                <span class="val">{{ analytics()?.retention?.returning }}</span>
              </div>
              <div class="stat-item">
                <span class="label">New / Total</span>
                <span class="val">{{ analytics()?.retention?.total }}</span>
              </div>
            </div>
          </div>
          <ng-template #noRetention>
            <div class="empty-state-mini">
              <p>Insufficient data to calculate retention scores.</p>
            </div>
          </ng-template>
        </div>

        <!-- Utilization Section -->
        <div class="card glass-card utilization-card span-2">
          <div class="card-header">
            <h3>Course Utilization</h3>
            <p>Efficiency of your current session capacities</p>
          </div>
          <div class="utilization-list" *ngIf="analytics()?.utilization?.length; else noUtil">
            <div *ngFor="let item of analytics()?.utilization" class="util-row">
              <div class="row-header">
                <span class="course-name">{{ item.name }}</span>
                <span class="percent">{{ item.utilization }}%</span>
              </div>
              <div class="progress-bar">
                <div class="fill" [style.width.%]="item.utilization" 
                  [style.background]="getUtilizationColor(item.utilization)"></div>
              </div>
              <div class="row-footer">
                <span>{{ item.total_attendance }} check-ins</span>
                <span>Max: {{ item.session_count * item.max_capacity }} capacity</span>
              </div>
            </div>
          </div>
          <ng-template #noUtil>
            <div class="empty-state-list">
              <p>No active courses found for this context.</p>
            </div>
          </ng-template>
        </div>

        <!-- Engagement List -->
        <div class="card glass-card engagement-card span-2">
          <h3>Most Engaged Members</h3>
          <div class="members-list" *ngIf="analytics()?.engagement?.length; else noEngagement">
            <div *ngFor="let member of analytics()?.engagement" class="member-row">
              <div class="avatar">
                {{ member.name[0] }}{{ member.last_name[0] }}
              </div>
              <div class="info">
                <span class="name">{{ member.name }} {{ member.last_name }}</span>
                <span class="subtitle">Active across multiple sessions</span>
              </div>
              <div class="count-badge">
                <span class="num">{{ member.checkins }}</span>
                <span class="lbl">Sessions</span>
              </div>
            </div>
          </div>
          <ng-template #noEngagement>
            <div class="empty-state-list">
              <p>No member activity recorded yet.</p>
            </div>
          </ng-template>
        </div>

        <!-- Insights Tooltip -->
        <div class="card glass-card insights-card">
          <div class="icon-wrap">💡</div>
          <h3>Coach Advice</h3>
          <p>{{ getInsightText() }}</p>
          <div *ngIf="isDataEmpty()" class="context-warning">
            <strong>Note:</strong> You are currently viewing analytics for a specific gym context. If you expect more data, try switching gyms from the sidebar.
          </div>
          <button class="action-btn">View My Schedule</button>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="loader-overlay">
        <div class="scanner"></div>
        <p>Analyzing Performance Data...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      --card-bg: var(--admin-glass);
      --card-border: var(--admin-glass-border);
      --accent: var(--admin-accent-indigo);
      --success: var(--admin-accent-emerald);
      --text: var(--admin-text-primary);
      --text-muted: var(--admin-text-secondary);
    }

    .analytics-container {
      padding: 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 3rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;

      .badge {
        display: inline-block;
        padding: 0.4rem 0.8rem;
        background: rgba(var(--admin-accent-indigo-rgb, 99, 102, 241), 0.1);
        color: var(--accent);
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
      }

      h1 {
        font-size: 3rem;
        font-weight: 950;
        letter-spacing: -0.04em;
        margin: 0;
        background: linear-gradient(135deg, var(--text) 30%, var(--text-muted));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .description {
        color: var(--text-muted);
        font-size: 1.1rem;
        margin-top: 0.5rem;
      }
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.2rem;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 100px;
      font-size: 0.85rem;
      font-weight: 700;
      
      .dot {
        width: 8px;
        height: 8px;
        background: var(--success);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 28px;
      padding: 2rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-5px);
      }

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
    }

    .span-2 { grid-column: span 2; }
    .span-3 { grid-column: span 3; }

    .main-trend {
      display: flex;
      flex-direction: column;
      gap: 2rem;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        p { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem; }
      }

      .growth-metric {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
        border-radius: 12px;
        font-weight: 800;

        &.negative {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .period { font-size: 0.7rem; opacity: 0.6; font-weight: 600; margin-left: 0.25rem; }
      }
    }

    .chart-container {
      display: flex;
      align-items: center;
      gap: 4rem;

      .main-stat {
        .value { font-size: 4.5rem; font-weight: 950; line-height: 1; letter-spacing: -3px; }
        .label { display: block; font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
      }

      .svg-chart-wrap {
        flex: 1;
        position: relative;
        height: 150px;
      }
    }

    .trend-svg {
      width: 100%;
      height: 100%;
      overflow: visible;

      .line-path {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: drawLine 2s forwards ease-in-out;
      }

      .area-path {
        opacity: 0;
        animation: fadeIn 1s 1s forwards;
      }

      .point-bg { fill: var(--text); }
      .point-fg { fill: var(--success); }
    }

    @keyframes drawLine {
      to { stroke-dashoffset: 0; }
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
      span { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
    }

    .retention-card {
      .retention-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        margin-top: 2rem;
      }

      .radial-wrap {
        position: relative;
        width: 140px;
        height: 140px;

        .radial-svg {
          transform: rotate(-90deg);
          .bg { fill: none; stroke: var(--card-border); stroke-width: 8; }
          .fg { 
            fill: none; 
            stroke: var(--accent); 
            stroke-width: 8; 
            transition: stroke-dasharray 1.5s ease-out;
          }
        }

        .radial-label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          .num { font-size: 1.75rem; font-weight: 900; letter-spacing: -1px; }
          .txt { font-size: 0.7rem; font-weight: 700; opacity: 0.6; text-transform: uppercase; }
        }
      }

      .retention-stats {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          .label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
          .val { font-size: 1.1rem; font-weight: 800; }
        }
      }
    }

    .utilization-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .util-row {
      .row-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        .course-name { font-weight: 800; }
        .percent { font-weight: 900; color: var(--accent); }
      }

      .progress-bar {
        height: 8px;
        background: var(--card-border);
        border-radius: 10px;
        overflow: hidden;
        .fill { height: 100%; border-radius: 10px; transition: width 1s ease-out; }
      }

      .row-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 0.4rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
      }
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .member-row {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1rem;
      background: rgba(255,255,255,0.03);
      border-radius: 20px;
      transition: background 0.2s;

      &:hover { background: rgba(255,255,255,0.06); }

      .avatar {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, var(--accent), var(--success));
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
      }

      .info {
        flex: 1;
        .name { display: block; font-weight: 800; font-size: 0.95rem; }
        .subtitle { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
      }

      .count-badge {
        text-align: right;
        .num { display: block; font-size: 1.2rem; font-weight: 900; color: var(--accent); }
        .lbl { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
      }
    }

    .insights-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent);
      
      .icon-wrap { font-size: 2rem; }
      p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; margin: 0; }

      .action-btn {
        margin-top: auto;
        padding: 0.8rem;
        background: var(--text);
        color: var(--card-bg);
        border: none;
        border-radius: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.2s;
        &:hover { transform: scale(1.02); }
      }

      .context-warning {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(245, 158, 11, 0.1);
        border-left: 4px solid #f59e0b;
        border-radius: 8px;
        font-size: 0.8rem;
        color: #f59e0b;
        line-height: 1.4;
        strong { display: block; margin-bottom: 0.25rem; }
      }
    }

    .loader-overlay {
      height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rem;

      .scanner {
        width: 200px;
        height: 2px;
        background: var(--accent);
        box-shadow: 0 0 15px var(--accent);
        animation: scan 2s infinite ease-in-out;
      }

      p { font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.2em; }
    }

    .empty-state-mini, .empty-state-list {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      background: rgba(255,255,255,0.02);
      border-radius: 20px;
      margin-top: 1rem;
      p { color: var(--text-muted); font-size: 0.9rem; font-weight: 600; opacity: 0.7; }
    }

    .empty-state-list { min-height: 200px; }

    @keyframes scan {
      0%, 100% { transform: translateY(-50px); opacity: 0; }
      50% { transform: translateY(50px); opacity: 1; }
    }

    @media (max-width: 1200px) {
      .analytics-grid { grid-template-columns: 1fr 1fr; }
      .span-3, .span-2 { grid-column: span 2; }
    }
    @media (max-width: 768px) {
      .analytics-grid { grid-template-columns: 1fr; }
      .span-3, .span-2 { grid-column: 1; }
      .dashboard-header { flex-direction: column; align-items: flex-start; gap: 2rem; }
    }
  `]
})
export class TrainerAnalyticsComponent implements OnInit {
  private trainerService = inject(TrainerService);
  private authService = inject(AuthService);

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

  // SVG Chart Logic
  chartPoints = computed(() => {
    const trend = this.analytics()?.trend || [];
    if (trend.length === 0) return [];
    
    const max = Math.max(...trend.map((t: any) => t.count), 5);
    const width = 700;
    const height = 150;
    const padding = 20;

    return trend.map((t: any, i: number) => ({
      x: (i * (width / (trend.length - 1))),
      y: height - padding - ((t.count / max) * (height - padding * 2))
    }));
  });

  linePath = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    
    // Create smooth cubic bezier curve
    return points.reduce((path: string, point: { x: number, y: number }, i: number) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = points[i - 1];
      const cp1x = prev.x + (point.x - prev.x) / 2;
      const cp2x = prev.x + (point.x - prev.x) / 2;
      return `${path} C ${cp1x},${prev.y} ${cp2x},${point.y} ${point.x},${point.y}`;
    }, '');
  });

  areaPath = computed(() => {
    const line = this.linePath();
    if (!line) return '';
    const points = this.chartPoints();
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${line} L ${lastPoint.x},150 L ${firstPoint.x},150 Z`;
  });

  retentionDashArray = computed(() => {
    const rate = this.analytics()?.retention?.rate || 0;
    const circumference = 2 * Math.PI * 45;
    const offset = (rate / 100) * circumference;
    return `${offset} ${circumference}`;
  });

  getUtilizationColor(val: number): string {
    if (val > 80) return 'var(--admin-accent-emerald)';
    if (val > 50) return 'var(--admin-accent-indigo)';
    return '#f59e0b'; // Amber for low utilization
  }

  getInsightText(): string {
    const data = this.analytics();
    if (!data) return '';
    
    if (data.monthly.growth > 10) {
      return `Excellent growth! Your attendance is up ${data.monthly.growth}%. Consider offering a premium session for your most active members.`;
    }
    
    const lowUtil = data.utilization?.find((u: any) => u.utilization < 30);
    if (lowUtil) {
      return `The "${lowUtil.name}" course has low utilization (${lowUtil.utilization}%). You might want to adjust its time slot or promote it to your loyal members.`;
    }

    return `Your member retention is at ${data.retention.rate}%. Engaging with your top ${data.engagement.length} members could help drive more referrals.`;
  }

  isDataEmpty(): boolean {
    const data = this.analytics();
    if (!data) return true;
    return (data.monthly.current === 0 && (!data.utilization || data.utilization.length === 0));
  }
}
