import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerService } from '../services/trainer.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: any[];
}

@Component({
  selector: 'app-trainer-calendar',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('40ms', animate('0.4s cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="calendar-page">
      <header class="page-header">
        <div class="header-content">
          <div class="title-group">
            <h1>Session Calendar</h1>
            <p class="subtitle">Visual schedule for your training sessions across the month.</p>
          </div>
          
          <div class="calendar-nav">
            <button class="nav-btn" (click)="previousMonth()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 class="current-month">{{ monthDisplay() }}</h2>
            <button class="nav-btn" (click)="nextMonth()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button class="today-btn" (click)="goToToday()">Today</button>
          </div>
        </div>
      </header>

      <div class="calendar-container">
        <div class="weekdays">
          <span *ngFor="let day of weekDays">{{ day }}</span>
        </div>

        <div class="calendar-grid" [@listAnimation]="days().length">
          <div *ngFor="let day of days()" 
               class="day-cell" 
               [class.other-month]="!day.isCurrentMonth"
               [class.is-today]="day.isToday">
            
            <div class="day-header">
              <span class="day-num">{{ day.date.getDate() }}</span>
            </div>

            <div class="sessions-list">
              <div *ngFor="let session of day.sessions" 
                   class="session-pill"
                   [style.border-left-color]="getSessionColor(session)">
                <span class="time">{{ formatTime(session.start_time) }}</span>
                <span class="course-name">{{ session.course?.name || 'Session' }}</span>
                <span class="gym-label" *ngIf="session.course?.gym">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M9 21V11h6v10M2 7l10-5 10 5"/></svg>
                  {{ session.course.gym.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-page {
      padding: clamp(1.5rem, 5vw, 3rem);
      max-width: 1600px;
      margin: 0 auto;
      min-height: 100vh;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      margin-bottom: 3rem;
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
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

      .subtitle {
        color: var(--admin-text-secondary);
        font-weight: 500;
        margin-top: 0.5rem;
        opacity: 0.8;
      }
    }

    .calendar-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--admin-glass);
      padding: 0.6rem;
      border-radius: 20px;
      border: 1px solid var(--admin-glass-border);
      box-shadow: var(--admin-glass-shadow);

      .current-month {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--admin-text-primary);
        min-width: 180px;
        text-align: center;
        margin: 0;
        text-transform: capitalize;
      }

      .nav-btn {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        border: 1px solid var(--admin-item-border);
        background: var(--admin-item-bg);
        color: var(--admin-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        svg { width: 20px; }
        &:hover { 
          background: var(--admin-accent-indigo); 
          color: white; 
          border-color: var(--admin-accent-indigo);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
        }
      }

      .today-btn {
        padding: 0.6rem 1.5rem;
        border-radius: 14px;
        border: 1px solid var(--admin-item-border);
        background: var(--admin-item-bg);
        color: var(--admin-text-primary);
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s;
        &:hover { 
          background: var(--admin-accent-indigo); 
          color: white; 
          transform: translateY(-2px);
        }
      }
    }

    .calendar-container {
      background: var(--admin-glass);
      backdrop-filter: blur(20px);
      border-radius: 36px;
      border: 1px solid var(--admin-glass-border);
      box-shadow: var(--admin-glass-shadow);
      padding: 2.5rem;
      position: relative;
    }

    .weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 2rem;
      padding: 0 1rem;
      span {
        text-align: center;
        font-size: 0.7rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--admin-text-secondary);
        opacity: 0.5;
      }
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-auto-rows: minmax(160px, auto);
      gap: 12px;
    }

    .day-cell {
      background: var(--admin-item-bg);
      border: 1px solid var(--admin-item-border);
      border-radius: 24px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;

      &:hover {
        transform: translateY(-4px);
        background: var(--admin-glass);
        border-color: var(--admin-accent-indigo);
        box-shadow: 0 12px 24px rgba(0,0,0,0.06);
        z-index: 2;
      }

      &.other-month {
        opacity: 0.25;
        filter: grayscale(1);
        pointer-events: none;
      }

      &.is-today {
        background: linear-gradient(135deg, var(--admin-item-bg), rgba(99, 102, 241, 0.05));
        border-color: rgba(99, 102, 241, 0.3);
        .day-num {
          background: var(--admin-accent-indigo);
          color: white;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
      }
    }

    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .day-num {
        font-size: 1rem;
        font-weight: 900;
        color: var(--admin-text-primary);
      }
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .session-pill {
      background: var(--admin-glass);
      backdrop-filter: blur(4px);
      border: 1px solid var(--admin-glass-border);
      border-left: 4px solid #ccc;
      padding: 0.6rem 0.8rem;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: scale(1.04) translateX(4px);
        border-color: currentColor;
        box-shadow: 0 8px 16px rgba(0,0,0,0.08);
      }

      .time {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--admin-text-secondary);
        opacity: 0.6;
      }

      .course-name {
        font-size: 0.85rem;
        font-weight: 900;
        color: var(--admin-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }

      .gym-label {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--admin-text-secondary);
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0.7;
        margin-top: 2px;
        
        svg {
          width: 10px;
          height: 10px;
        }
      }
    }

    @media (max-width: 1200px) {
      .calendar-grid { grid-template-columns: repeat(1, 1fr); gap: 1rem; }
      .weekdays { display: none; }
      .day-cell { min-height: auto; }
      .day-header { justify-content: flex-start; }
    }
  `]
})
export class TrainerCalendarComponent implements OnInit {
  private trainerService = inject(TrainerService);
  
  viewDate = signal(new Date());
  sessions = signal<any[]>([]);
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  monthDisplay = computed(() => {
    return this.viewDate().toLocaleDateString('default', { month: 'long', year: 'numeric' });
  });

  days = computed(() => {
    const date = this.viewDate();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Adjust to Monday start
    let startDay = start.getDay();
    if (startDay === 0) startDay = 7;
    startDay--;

    const calendarDays: CalendarDay[] = [];
    const today = new Date();

    // Padding prev month
    const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - 1, prevMonthEnd.getDate() - i);
      calendarDays.push(this.createCalendarDay(d, false, today));
    }

    // Current month
    for (let i = 1; i <= end.getDate(); i++) {
      const d = new Date(date.getFullYear(), date.getMonth(), i);
      calendarDays.push(this.createCalendarDay(d, true, today));
    }

    // Padding next month
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + 1, i);
      calendarDays.push(this.createCalendarDay(d, false, today));
    }

    return calendarDays;
  });

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    const date = this.viewDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).toISOString().split('T')[0];

    this.trainerService.getSessions(firstDay, lastDay).subscribe(res => {
      if (res.success) {
        this.sessions.set(res.data);
      }
    });
  }

  private createCalendarDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const dateStr = date.toISOString().split('T')[0];
    const daySessions = this.sessions().filter(s => s.date_session === dateStr);
    
    return {
      date,
      isCurrentMonth,
      isToday: dateStr === today.toISOString().split('T')[0],
      sessions: daySessions
    };
  }

  previousMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.loadSessions();
  }

  nextMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.loadSessions();
  }

  goToToday() {
    this.viewDate.set(new Date());
    this.loadSessions();
  }

  formatTime(time: string) {
    return time.substring(0, 5);
  }

  getSessionColor(session: any): string {
    const colors = [
      '#0ea5e9', // Blue
      '#10b981', // Emerald
      '#f43f5e', // Rose
      '#8b5cf6', // Violet
      '#f59e0b'  // Amber
    ];
    if (!session.id_course) return colors[0];
    const charCode = session.id_course.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }
}
