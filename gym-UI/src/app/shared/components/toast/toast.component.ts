import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="powerful-toast-container" [class]="data.type" (mouseenter)="isPaused = true" (mouseleave)="isPaused = false">
      <div class="glow-layer"></div>
      <div class="glass-surface">
        <div class="toast-main">
          <div class="icon-section">
            <div class="icon-orb">
              <mat-icon>{{ getIcon() }}</mat-icon>
            </div>
            <div class="pulse-ring"></div>
          </div>
          
          <div class="content-section">
            <div class="meta-row">
              <span class="system-tag">SYSTEM VECTOR</span>
              <span class="timestamp">{{ currentTime }}</span>
            </div>
            <h3 class="toast-title">{{ getTitle() }}</h3>
            <p class="toast-message">{{ data.message }}</p>
          </div>

          <button class="action-btn" (click)="snackBarRef.dismiss()">
             <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <div class="progress-track">
          <div class="progress-fill" [style.animation-play-state]="isPaused ? 'paused' : 'running'"></div>
          <div class="progress-glow" [style.animation-play-state]="isPaused ? 'paused' : 'running'"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .powerful-toast-container {
      position: relative;
      min-width: 380px;
      padding: 10px; /* Space for the glow to breathe */
      border-radius: 24px;
      margin-bottom: 1rem;
      margin-right: 1rem;
      z-index: 9999;
      
      /* Theme Variables */
      &.success { --primary: #10b981; --primary-rgb: 16, 185, 129; --title: 'ACTION_RESOLVED'; }
      &.error   { --primary: #f43f5e; --primary-rgb: 244, 63, 94; --title: 'PROTOCOL_ERROR'; }
      &.warning { --primary: #fbbf24; --primary-rgb: 251, 191, 36; --title: 'SECURITY_ALERT'; }
      &.info    { --primary: #3b82f6; --primary-rgb: 59, 130, 246; --title: 'DATA_STREAM'; }

      background: transparent;
    }

    .glow-layer {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(var(--primary-rgb), 0.3) 0%, transparent 70%);
      filter: blur(25px);
      z-index: 0;
      animation: ambient-glow 4s ease-in-out infinite;
      pointer-events: none;
    }

    .glass-surface {
      position: relative;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(var(--primary-rgb), 0.4);
      border-radius: 22px;
      z-index: 1;
      overflow: hidden;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
    }

    .toast-main {
      display: flex;
      padding: 1.25rem 1.5rem;
      gap: 1.25rem;
      align-items: flex-start;
    }

    .icon-section {
      position: relative;
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-orb {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb), 0.4));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.4);
      z-index: 2;
      
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
    }

    .pulse-ring {
      position: absolute;
      inset: -4px;
      border: 2px solid var(--primary);
      border-radius: 20px;
      opacity: 0;
      animation: orb-pulse 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    }

    .content-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.15rem;

      .system-tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 900;
        color: var(--primary);
        letter-spacing: 0.15em;
        opacity: 0.8;
      }

      .timestamp {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        color: rgba(255,255,255,0.3);
      }
    }

    .toast-title {
      font-size: 1.15rem;
      font-weight: 900;
      color: white;
      margin: 0;
      letter-spacing: -0.02em;
      
      &::after {
        content: ' :: ' var(--title);
        font-size: 0.65rem;
        font-weight: 500;
        opacity: 0.4;
        font-family: 'JetBrains Mono', monospace;
      }
    }

    .toast-message {
      font-size: 0.95rem;
      color: rgba(255,255,255,0.7);
      line-height: 1.5;
      margin: 0;
      font-weight: 400;
    }

    .action-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 2px;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &:hover {
        background: rgba(244, 63, 94, 0.2);
        color: #f43f5e;
        border-color: rgba(244, 63, 94, 0.4);
        transform: rotate(90deg);
      }
    }

    .progress-track {
      height: 4px;
      background: rgba(255,255,255,0.05);
      position: relative;
    }

    .progress-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, transparent, var(--primary));
      transform-origin: left;
      animation: powerful-progress 4s linear forwards;
    }

    .progress-glow {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: 100%;
      background: var(--primary);
      filter: blur(8px);
      transform-origin: left;
      animation: powerful-progress 4s linear forwards;
      opacity: 0.6;
    }

    @keyframes ambient-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
    }

    @keyframes orb-pulse {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    @keyframes powerful-progress {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }

    :host {
      display: block;
      animation: toast-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes toast-entrance {
      from { transform: translateX(100px) scale(0.8) rotate(2deg); opacity: 0; }
      to { transform: translateX(0) scale(1) rotate(0deg); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  snackBarRef = inject(MatSnackBarRef);
  isPaused = false;
  currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { message: string, type: string }) {
    console.log('Toast initialized:', data);
  }

  getIcon() {
    switch (this.data.type) {
      case 'success': return 'verified';
      case 'error': return 'terminal';
      case 'warning': return 'security';
      default: return 'sensors';
    }
  }

  getTitle() {
    switch (this.data.type) {
      case 'success': return 'SUCCESS';
      case 'error': return 'FAILURE';
      case 'warning': return 'WARNING';
      default: return 'NOTICE';
    }
  }
}
