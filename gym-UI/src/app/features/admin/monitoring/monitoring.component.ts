import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, of, forkJoin, retry } from 'rxjs';
import { TokenService } from '../../../core/services/token.service';
import { CapabilityService } from '../../../core/services/capability.service';

interface EndpointProbe {
  name: string;
  path: string;
  status: 'checking' | 'accessible' | 'forbidden' | 'not_exposed' | 'unstable';
  detail?: string;
}

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styleUrl: './monitoring.component.scss',
  template: `
    <div class="admin-page-container">
      <div class="monitoring-header">
        <header class="admin-header">
          <div class="admin-badge-mini">
            <mat-icon style="font-size: 14px; width: 14px; height: 14px;">sensors</mat-icon>
            Systems & Monitoring
          </div>
          <h1>Security Telemetry</h1>
          <p>Real-time endpoint probes & health indicators</p>
        </header>

        <button (click)="runProbes()" class="admin-btn btn-primary">
          <mat-icon [class.is-spinning]="anyChecking()">refresh</mat-icon>
          Re-run Probes
        </button>
      </div>
      
      <div class="monitoring-card">
         <div class="card-header-main">
            <div class="header-title">
               <div class="icon-box">
                  <mat-icon>memory</mat-icon>
               </div>
               <h2>API Command Board</h2>
            </div>
            <div class="status-pill" [ngClass]="getOverallStatusClass()">
               {{ overallStatus() }}
            </div>
         </div>
         
         <div class="probe-grid">
            <div *ngFor="let ep of endpoints()" class="probe-item">
               <div class="probe-info">
                  <div class="probe-icon" [ngClass]="getProbeIconBgClass(ep.status)">
                     <mat-icon [ngClass]="getProbeIconClass(ep.status)">{{ getProbeIcon(ep.status) }}</mat-icon>
                  </div>
                  <div class="probe-text">
                     <span class="name">{{ ep.name }}</span>
                     <span class="path">{{ ep.path }}</span>
                  </div>
               </div>
               <div class="probe-status" [ngClass]="ep.status">
                  {{ ep.status === 'checking' ? 'Checking…' : ep.status === 'accessible' ? 'Accessible' : ep.status === 'forbidden' ? 'Forbidden' : ep.status === 'not_exposed' ? 'Not Exposed' : 'Unstable' }}
               </div>
            </div>
         </div>
      </div>
    </div>
  `
})
export class MonitoringComponent implements OnInit {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private capabilityService = inject(CapabilityService);

  endpoints = signal<EndpointProbe[]>([
    { name: 'System Health', path: '/up', status: 'checking' },
    { name: 'Core Auth Service', path: '/api/me', status: 'checking' },
    { name: 'Owner Management', path: '/api/users', status: 'checking' },
    { name: 'Notifications', path: '/api/notifications', status: 'checking' },
  ]);

  ngOnInit() {
    this.runProbes();
  }

  anyChecking(): boolean {
    return this.endpoints().some(e => e.status === 'checking');
  }

  overallStatus(): string {
    const eps = this.endpoints();
    if (eps.some(e => e.status === 'checking')) return 'Probing…';
    if (eps.every(e => e.status === 'accessible')) return 'All Systems Normal';
    if (eps.some(e => e.status === 'unstable')) return 'Unstable';
    return 'Partial';
  }

  getOverallStatusClass() {
    const status = this.overallStatus();
    if (status === 'All Systems Normal') return 'status-normal';
    if (status === 'Probing…') return 'status-probing';
    return 'status-unstable';
  }

  private mapError(err: any): 'forbidden' | 'not_exposed' | 'unstable' {
    if (err.status === 401 || err.status === 403) return 'forbidden';
    if (err.status === 404 || err.status === 501) return 'not_exposed';
    return 'unstable';
  }

  runProbes() {
    // Reset all to checking
    this.endpoints.set(this.endpoints().map(e => ({ ...e, status: 'checking' as const })));

    const base = environment.apiBaseUrl;

    // Health check (/up) — no auth needed
    this.http.get(`${base}/up`, { observe: 'response', responseType: 'text' }).pipe(
      retry(2),
      map(() => 'accessible' as const),
      catchError(err => of(this.mapError(err)))
    ).subscribe(status => this.updateEndpoint('/up', status as any));

    // Auth check (/api/me)
    this.http.get<any>(`${base}/api/me`).pipe(
      retry(2),
      map(() => 'accessible' as const),
      catchError(err => of(this.mapError(err)))
    ).subscribe(status => this.updateEndpoint('/api/me', status as any));

    // Users
    this.http.get<any>(`${base}/api/users`).pipe(
      retry(2),
      map(() => 'accessible' as const),
      catchError(err => of(this.mapError(err)))
    ).subscribe(status => this.updateEndpoint('/api/users', status as any));


    // Notifications
    this.http.get<any>(`${base}/api/notifications`).pipe(
      retry(2),
      map(() => 'accessible' as const),
      catchError(err => of(this.mapError(err)))
    ).subscribe(status => this.updateEndpoint('/api/notifications', status as any));
  }

  private updateEndpoint(path: string, status: 'accessible' | 'forbidden' | 'not_exposed' | 'unstable') {
    this.endpoints.set(this.endpoints().map(e =>
      e.path === path ? { ...e, status } : e
    ));

    const isAvailable = status === 'accessible' || status === 'forbidden';
    if (path === '/api/users') {
      this.capabilityService.setEndpointStatus('users.ownerCrud', isAvailable);
    } else if (path === '/api/notifications') {
      this.capabilityService.setEndpointStatus('notifications.self', isAvailable);
    }
  }

  getProbeIcon(status: string): string {
    switch (status) {
      case 'accessible': return 'check_circle';
      case 'forbidden': return 'block';
      case 'not_exposed': return 'construction';
      case 'unstable': return 'warning_amber';
      default: return 'hourglass_empty';
    }
  }

  getProbeIconClass(status: string) {
    switch (status) {
      case 'accessible': return 'text-emerald-500';
      case 'forbidden': return 'text-amber-500';
      case 'not_exposed': return 'text-slate-400';
      case 'unstable': return 'text-red-500';
      default: return 'text-slate-300 animate-pulse';
    }
  }

  getProbeIconBgClass(status: string) {
    switch (status) {
      case 'accessible': return 'bg-emerald-500/10 border border-emerald-500/20';
      case 'forbidden': return 'bg-amber-500/10 border border-amber-500/20';
      case 'not_exposed': return 'bg-slate-500/10 border border-white/5';
      case 'unstable': return 'bg-red-500/10 border border-red-500/20';
      default: return 'bg-slate-800/40 border border-white/5';
    }
  }

  getStatusBadgeClass(status: string) {
    switch (status) {
      case 'accessible': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-800';
      case 'forbidden': return 'text-amber-600 bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-800';
      case 'not_exposed': return 'text-slate-500 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
      case 'unstable': return 'text-red-600 bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-800';
      default: return 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  }
}
