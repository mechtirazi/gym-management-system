import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-access-matrix',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styleUrl: './access-matrix.component.scss',
  template: `
    <div class="admin-page-container">
      <header class="admin-header">
        <div class="admin-badge-mini">
          <mat-icon class="text-xs">security</mat-icon>
          Security Architecture
        </div>
        <h1>Governance Matrix</h1>
        <p>Hardcoded platform capability constraints and domain isolation policies</p>
      </header>

      <!-- Protocol Abstract -->
      <div class="protocol-hero">
        <div class="hero-icon-box">
          <mat-icon>policy</mat-icon>
        </div>
        <div class="hero-content">
          <h3>Systematic Role Governance</h3>
          <p>
            Platform roles follow a strict hierarchical structure. 
            <span style="color: #fff; font-weight: 800; font-style: italic;">Super Admin</span> nodes operate as global observers with provisioning authority, while 
            <span style="color: var(--admin-accent-indigo); font-weight: 800;">Owners</span> act as isolated Tenant Controllers. Cross-boundary access is strictly prohibited at the kernel level.
          </p>
        </div>
      </div>

      <!-- Matrix Grid -->
      <div class="admin-grid">
        
        <!-- Super Admin Protocol -->
        <div class="protocol-card style-blue">
          <div class="card-header">
            <div class="card-icon-box">
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <div class="card-title-group">
              <h3>Super Admin</h3>
              <div class="card-tag">Global Operational Logic</div>
            </div>
          </div>

          <div class="card-body">
            <h4>Authorized Kernels</h4>
            <ul class="protocol-list">
              <li class="protocol-item">
                <mat-icon class="item-icon">verified_user</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Owner Profile Lifecycle</span>
                  <span class="item-text-sub">Manage global tenant identities</span>
                </div>
              </li>
              <li class="protocol-item">
                <mat-icon class="item-icon">verified_user</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Infrastructure Monitoring</span>
                  <span class="item-text-sub">Real-time health telemetry</span>
                </div>
              </li>
              <li class="protocol-item item-locked">
                <mat-icon class="item-icon lock-icon">lock_outline</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Gym Operations</span>
                  <span class="item-text-sub">Tenant data isolation</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Owner Protocol -->
        <div class="protocol-card style-fuchsia">
          <div class="card-header">
            <div class="card-icon-box">
              <mat-icon>storefront</mat-icon>
            </div>
            <div class="card-title-group">
              <h3>Gym Owner</h3>
              <div class="card-tag">Isolated Tenant Authority</div>
            </div>
          </div>

          <div class="card-body">
            <h4>Authorized Kernels</h4>
            <ul class="protocol-list">
              <li class="protocol-item">
                <mat-icon class="item-icon">verified_user</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Facility Operations</span>
                  <span class="item-text-sub">Manage gyms, courses, schedules</span>
                </div>
              </li>
              <li class="protocol-item">
                <mat-icon class="item-icon">verified_user</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Revenue Management</span>
                  <span class="item-text-sub">Subscriptions and billing logic</span>
                </div>
              </li>
              <li class="protocol-item item-locked">
                <mat-icon class="item-icon lock-icon">lock_outline</mat-icon>
                <div class="item-content">
                  <span class="item-text-main">Cross-Tenant Provisioning</span>
                  <span class="item-text-sub">Boundary constraint active</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AccessMatrixComponent { }
