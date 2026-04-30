import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="trainer-experience-hub animate-fade-in" *ngIf="trainer()">
      <!-- Unified Header Control -->
      <nav class="hub-breadcrumb">
        <button class="btn-back" [routerLink]="['/member/gyms']">
          <span class="material-symbols-rounded">arrow_back</span>
          Back to Hub
        </button>
      </nav>

      <div class="profile-header-premium glass-module">
        <div class="identity-group">
          <div class="avatar-orbit">
            <div class="avatar-core" [style.background]="!trainer().profile_picture ? 'transparent' : getUserGradient(trainer().id_user)">
              <img [src]="getTrainerAvatar()" [alt]="trainer().name" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            </div>
          </div>
          
          <div class="text-group">
            <div class="name-row">
              <h1>{{ trainer().name }} {{ trainer().last_name }}</h1>
              <span class="verified-badge" *ngIf="reviews().length > 5">
                <span class="material-symbols-rounded">verified</span>
              </span>
            </div>
            <p class="professional-title">
              {{ trainer().role === 'trainer' ? 'Professional Trainer' : (trainer().role | titlecase) }}
            </p>
          </div>
        </div>

        <div class="header-actions">
           <div class="rating-orb">
             <span class="val">{{ averageRating() }}</span>
             <span class="lab">Rating</span>
           </div>
        </div>
      </div>

      <!-- Bento Q3 Layout -->
      <div class="bento-grid-q3">
        <!-- Main Column: Bio & Reviews -->
        <div class="bento-col main-pulse">
          <section class="bio-node glass-module">
            <div class="node-header">
              <span class="material-symbols-rounded">history_edu</span>
              <h3>Professional Biography</h3>
            </div>
            <p>{{ trainer().bio || 'This trainer has not yet provided a professional biography.' }}</p>
          </section>

          <section class="reviews-node glass-module">
            <div class="node-header">
              <div class="h-text">
                <span class="material-symbols-rounded">reviews</span>
                <h3>Member Feedback</h3>
              </div>
              <button class="btn-nova-sm" (click)="showRateModal.set(true)">
                <span class="material-symbols-rounded">add</span> Rate
              </button>
            </div>

            <div class="reviews-stack">
              <div class="review-tile" *ngFor="let review of reviews()">
                <div class="tile-top">
                  <div class="stars">
                    <span class="material-symbols-rounded" *ngFor="let s of [1,2,3,4,5]" 
                          [class.active]="review.rating >= s">star</span>
                  </div>
                  <span class="date">{{ review.created_at | date:'mediumDate' }}</span>
                </div>
                <p>"{{ review.comment }}"</p>
                <div class="reviewer">- {{ review.user?.name || 'Anonymous' }}</div>
              </div>

              <div class="empty-resonance" *ngIf="reviews().length === 0">
                <span class="material-symbols-rounded">sensors_off</span>
                <p>No feedback available yet.</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Sidebar Column: Stats & Specialties -->
        <div class="bento-col sidebar-metrics">
          <section class="specialties-node glass-module">
            <h3>Specialties</h3>
            <div class="spec-cloud">
              <span class="spec-tag" *ngFor="let spec of specialties()">{{ spec }}</span>
              <span class="spec-tag empty" *ngIf="specialties().length === 0">General Performance</span>
            </div>
          </section>

          <section class="metrics-summary-node glass-module">
             <h3>Trainer Stats</h3>
             <div class="stat-item">
               <span class="label">Total Reviews</span>
               <span class="value">{{ reviews().length }}</span>
             </div>
             <div class="stat-item">
               <span class="label">Member Since</span>
               <span class="value">{{ trainer().created_at | date:'mediumDate' }}</span>
             </div>
          </section>
        </div>
      </div>
    </div>
    <!-- Enhanced Rating Modal (Moved outside transform container) -->
    <div class="modal-overlay-backdrop" *ngIf="showRateModal()" (click)="showRateModal.set(false)">
      <div class="rating-portal-card glass-module animate-portal-in" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="portal-header">
          <div class="icon-orb">
            <span class="material-symbols-rounded">grade</span>
          </div>
          <div class="header-text">
            <h3>Professional Feedback</h3>
            <p>Synchronize your coaching experience with the hub.</p>
          </div>
          <button class="portal-close" (click)="showRateModal.set(false)">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="portal-body">
          <div class="rating-experience">
            <div class="experience-label">How was your session?</div>
            <div class="star-hologram">
              <button *ngFor="let s of [1,2,3,4,5]" 
                      (click)="userRating.set(s)" 
                      [class.active]="userRating() >= s"
                      class="star-btn">
                <span class="material-symbols-rounded">{{ userRating() >= s ? 'star' : 'star_outline' }}</span>
              </button>
            </div>
            <div class="rating-tagline" [style.color]="getRatingColor(userRating())">
              {{ getRatingLabel(userRating()) }}
            </div>
          </div>

          <div class="comment-field">
            <textarea [(ngModel)]="userComment" 
                      placeholder="Describe the training protocol and results..."
                      class="zen-textarea"></textarea>
            <div class="char-count" [class.max]="userComment().length > 450">
              {{ userComment().length }}/500
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="portal-footer">
          <button class="btn-cancel-nova" (click)="showRateModal.set(false)">Dismiss</button>
          <button class="btn-submit-nova" 
                  [disabled]="!userComment() || isSubmitting()" 
                  (click)="submitRating()">
            <span class="material-symbols-rounded" *ngIf="!isSubmitting()">send</span>
            <span class="spinner-sm" *ngIf="isSubmitting()"></span>
            {{ isSubmitting() ? 'Syncing...' : 'Submit Feedback' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Page Loader -->
    <div class="hub-loader" *ngIf="loading()">
      <div class="orb-spinner"></div>
      <h3>Loading Profile...</h3>
    </div>
  `,
  styles: [`
    .trainer-experience-hub {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .hub-breadcrumb {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 0.5rem;

      .btn-back {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: color 0.2s;
        &:hover { color: #818cf8; }
        
        :host-context(body:not(.dark)) & { color: #475569; }
      }
    }

    .profile-header-premium {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.5rem;
      border-radius: 2.5rem;

      @media (max-width: 768px) {
        flex-direction: column;
        gap: 2rem;
        text-align: center;
      }
    }

    .identity-group {
      display: flex;
      align-items: center;
      gap: 2rem;

      @media (max-width: 768px) { flex-direction: column; }
    }

    .avatar-orbit {
      position: relative;
      padding: 5px;
      border: 2px solid rgba(129, 140, 248, 0.3);
      border-radius: 50%;

      .avatar-core {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        font-weight: 900;
        color: white;
        overflow: hidden;
        img { width: 100%; height: 100%; object-fit: cover; }
      }
    }

    .text-group {
      .name-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        
        @media (max-width: 768px) { justify-content: center; }

        h1 {
          font-size: 2.2rem;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(135deg, #fff 0%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          
          :host-context(body:not(.dark)) & {
            background: linear-gradient(135deg, #1e293b 0%, #4f46e5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        }

        .verified-badge {
          color: #3b82f6;
          display: flex;
          span { font-size: 1.5rem; }
        }
      }

      .professional-title {
        color: #818cf8;
        font-weight: 700;
        margin-top: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 0.9rem;
      }
    }

    .rating-orb {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.1);

      .val { font-size: 2rem; font-weight: 900; color: #f59e0b; line-height: 1; }
      .lab { font-size: 0.7rem; font-weight: 800; color: rgba(245, 158, 11, 0.6); text-transform: uppercase; margin-top: 4px; }
    }

    .bento-grid-q3 {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 1.5rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .bento-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .glass-module {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 2rem;
      padding: 2rem;
      
      :host-context(body:not(.dark)) & {
        background: #ffffff;
        border-color: #f1f5f9;
        box-shadow: 0 10px 40px rgba(0,0,0,0.03);
      }
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      .h-text { display: flex; align-items: center; gap: 0.75rem; }
      
      h3 { margin: 0; font-size: 1.2rem; font-weight: 800; }
      span { color: #818cf8; }
    }

    .bio-node p {
      line-height: 1.8;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.05rem;
      
      :host-context(body:not(.dark)) & { color: #475569; }
    }

    .btn-nova-sm {
      background: #818cf8;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(129, 140, 248, 0.4); }
    }

    .reviews-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .review-tile {
      background: rgba(255, 255, 255, 0.02);
      padding: 1.5rem;
      border-radius: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.04);

      .tile-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        
        .stars .material-symbols-rounded {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.1);
          &.active { color: #f59e0b; }
        }
        .date { font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); }
      }

      p { color: white; font-style: italic; margin-bottom: 0.5rem; font-size: 0.95rem; }
      .reviewer { color: #818cf8; font-weight: 700; font-size: 0.8rem; }
      
      :host-context(body:not(.dark)) & {
        background: #f8fafc;
        border-color: #f1f5f9;
        p { color: #334155; }
        .date { color: #94a3b8; }
      }
    }

    .spec-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;

      .spec-tag {
        padding: 0.4rem 0.8rem;
        background: rgba(129, 140, 248, 0.1);
        color: #a5b4fc;
        border-radius: 0.75rem;
        font-size: 0.8rem;
        font-weight: 700;
        
        &.empty { opacity: 0.5; font-style: italic; }
        
        :host-context(body:not(.dark)) & { background: #f1f5f9; color: #4f46e5; }
      }
    }

    .metrics-summary-node {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      h3 { margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 800; }
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .label { font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); }
      .value { font-size: 1rem; font-weight: 700; color: white; }
      
      :host-context(body:not(.dark)) & {
        .label { color: #64748b; }
        .value { color: #1e293b; }
      }
    }

    /* FIXING MULTI-PROBLEMS IN RATING ALERT */
    .modal-overlay-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;

      :host-context(body:not(.dark)) & {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
    }

    .rating-portal-card {
      width: 100%;
      max-width: 480px; /* Refined width */
      max-height: 90vh;
      overflow-y: auto;
      background: #111;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 50px 100px rgba(0, 0, 0, 0.5);
      border-radius: 2rem;

      :host-context(body:not(.dark)) & {
        background: #ffffff;
        box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        border-color: rgba(0,0,0,0.05);
      }
    }

    .portal-header {
      padding: 2rem;
      background: linear-gradient(to bottom, rgba(129, 140, 248, 0.15), transparent);
      display: flex;
      align-items: center;
      gap: 1.25rem;
      position: relative;

      .icon-orb {
        width: 52px;
        height: 52px;
        background: #818cf8;
        border-radius: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 10px 20px rgba(129, 140, 248, 0.3);
        span { font-size: 1.8rem; }
      }

      .header-text {
        h3 { margin: 0; font-size: 1.35rem; font-weight: 900; color: white; }
        p { margin: 0.15rem 0 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); }
      }

      .portal-close {
        position: absolute;
        top: 1.2rem;
        right: 1.2rem;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.2s;
        &:hover { color: white; transform: rotate(90deg); }
      }

      :host-context(body:not(.dark)) & {
        background: linear-gradient(to bottom, rgba(129, 140, 248, 0.08), transparent);
        .header-text h3 { color: #1e293b; }
        .header-text p { color: #64748b; }
        .portal-close { color: #94a3b8; }
      }
    }

    .portal-body {
      padding: 0 2rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .rating-experience {
      text-align: center;
      .experience-label {
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 1.2rem;
        letter-spacing: 2.5px;
      }

      .star-hologram {
        display: flex;
        justify-content: center;
        gap: 0.5rem;

        .star-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.4rem;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

          span {
            font-size: 3rem;
            color: rgba(255, 255, 255, 0.05);
            transition: all 0.2s;
          }

          &:hover { transform: scale(1.15); }
          
          &.active span {
            color: #f59e0b;
            text-shadow: 0 0 25px rgba(245, 158, 11, 0.5);
          }
        }
      }

      .rating-tagline {
        margin-top: 1.2rem;
        font-size: 1rem;
        font-weight: 800;
        min-height: 1.2rem;
      }

      :host-context(body:not(.dark)) & {
        .experience-label { color: #64748b; }
        .star-btn span { color: #e2e8f0; } /* Better visibility in light mode */
      }
    }

    .comment-field {
      position: relative;
      
      .zen-textarea {
        width: 100%;
        height: 130px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.2rem;
        padding: 1.2rem;
        color: white;
        font-size: 0.95rem;
        line-height: 1.5;
        resize: none;
        outline: none;
        transition: all 0.3s;

        &:focus {
          border-color: #818cf8;
          background: rgba(255, 255, 255, 0.05);
        }

        :host-context(body:not(.dark)) & {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #1e293b;
          &:focus { background: #ffffff; border-color: #818cf8; }
        }
      }

      .char-count {
        position: absolute;
        bottom: 1rem;
        right: 1.2rem;
        font-size: 0.7rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.2);
        
        :host-context(body:not(.dark)) & { color: #94a3b8; }
      }
    }

    .portal-footer {
      padding: 1.5rem 2rem;
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      gap: 1.2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.03);

      button {
        flex: 1;
        padding: 1rem;
        border-radius: 1rem;
        font-weight: 800;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.25s;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
      }

      .btn-cancel-nova {
        background: rgba(255, 255, 255, 0.05);
        color: white;
        &:hover { background: rgba(255, 255, 255, 0.1); }
      }

      .btn-submit-nova {
        background: #818cf8;
        color: white;
        box-shadow: 0 8px 25px rgba(129, 140, 248, 0.2);

        &:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 35px rgba(129, 140, 248, 0.4);
        }

        &:disabled {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
          box-shadow: none;
        }
      }

      :host-context(body:not(.dark)) & {
        background: #f8fafc;
        border-top-color: #f1f5f9;
        
        .btn-cancel-nova { background: #f1f5f9; color: #475569; &:hover { background: #e2e8f0; } }
        
        .btn-submit-nova:disabled {
          background: #e2e8f0;
          color: #94a3b8;
        }
      }
    }

    .spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      
      :host-context(body:not(.dark)) & {
        border-color: rgba(0,0,0,0.1);
        border-top-color: #818cf8;
      }
    }

    .hub-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8rem;
      gap: 1.5rem;
      h3 { margin: 0; font-weight: 800; color: #818cf8; letter-spacing: 1px; }
    }

    .orb-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(129, 140, 248, 0.1);
      border-radius: 50%;
      border-top-color: #818cf8;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fade-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    
    @keyframes portal-in {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-portal-in { animation: portal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class TrainerProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private memberService = inject(MemberService);

  trainer = signal<any>(null);
  reviews = signal<any[]>([]);
  specialties = signal<string[]>([]);
  loading = signal(true);
  isSubmitting = signal(false);
  
  showRateModal = signal(false);
  userRating = signal(5);
  userComment = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadTrainerData(id);
      }
    });
  }

  loadTrainerData(id: string) {
    this.loading.set(true);
    this.memberService.getTrainerProfile(id).subscribe({
      next: (res: any) => {
        this.trainer.set(res.trainer);
        this.reviews.set(res.reviews || []);
        
        if (res.trainer?.career_specialties) {
          const specs = typeof res.trainer.career_specialties === 'string' 
            ? res.trainer.career_specialties.split(',').map((s: string) => s.trim())
            : res.trainer.career_specialties;
          this.specialties.set(specs);
        } else {
          this.specialties.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  averageRating(): string {
    if (this.reviews().length === 0) return '5.0';
    const sum = this.reviews().reduce((acc, r) => acc + r.rating, 0);
    return (sum / this.reviews().length).toFixed(1);
  }

  getRatingLabel(rating: number): string {
    const labels: Record<number, string> = {
      1: 'Unsatisfactory',
      2: 'Suboptimal',
      3: 'Standard',
      4: 'High-Fidelity',
      5: 'Elite Mastery'
    };
    return labels[rating] || '';
  }

  getRatingColor(rating: number): string {
    const colors: Record<number, string> = {
      1: '#ef4444',
      2: '#f97316',
      3: '#f59e0b',
      4: '#818cf8',
      5: '#2dd4bf'
    };
    return colors[rating] || '#ffffff';
  }

  submitRating() {
    if (!this.userComment() || !this.trainer()) return;

    this.isSubmitting.set(true);
    this.memberService.rateTrainer(this.trainer().id_user, {
      rating: this.userRating(),
      comment: this.userComment()
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showRateModal.set(false);
        this.loadTrainerData(this.trainer().id_user);
        this.userComment.set('');
        this.userRating.set(5);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  getUserGradient(userId?: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #a855f7)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #3b82f6, #2dd4bf)',
      'linear-gradient(135deg, #f59e0b, #ef4444)'
    ];
    if (!userId) return gradients[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/storage/${path.startsWith('/') ? path.substring(1) : path}`;
  }

  getTrainerAvatar(): string {
    const t = this.trainer();
    if (!t) return 'https://ui-avatars.com/api/?name=Master+Coach&background=00d2ff&color=fff&bold=true';
    if (t.profile_picture) return this.getImageUrl(t.profile_picture);
    const tName = t.name + ' ' + (t.last_name || '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(tName)}&background=00d2ff&color=fff&bold=true`;
  }
}
