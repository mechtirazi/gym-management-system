import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule],
  template: `
    <div class="admin-centered-wrapper">
      <div class="hero-command-card">
         <div class="hero-visual">
            <mat-icon>lock_open</mat-icon>
         </div>
         
         <h1>Security Protocol Active</h1>
         <p class="hero-description">
            Operational modules are reserved for <span class="accent">Tenant Level Governance</span>.
         </p>
         
         <div class="hero-info-box shadow-xl">
            <div class="info-header">
               <div class="icon-box">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;">shield</mat-icon>
               </div>
               <h4>Enforcement Matrix</h4>
            </div>
            <p>
               Super Admin protocols operate at the Macro Strategy Level. Daily operations like scheduling and attendances 
               require an active Gym context. If your permissions require modification, please consult the global policy engine.
            </p>
         </div>

         <div class="hero-actions">
            <button routerLink="/access-matrix" class="admin-btn btn-primary">
               <mat-icon>policy</mat-icon>
               <span>Policy Matrix</span>
            </button>
            <button routerLink="/dashboard" class="admin-btn">
               <mat-icon>dashboard</mat-icon>
               <span>Dashboard</span>
            </button>
         </div>
      </div>
    </div>
  `
})
export class OperationsComponent { }
