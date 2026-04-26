import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { NutritionistNutritionService } from '../../services/nutritionist-nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../owner/components/page-header/page-header.component';
import { NutritionCardComponent } from '../../../owner/nutrition/components/nutrition-card/nutrition-card.component';
import { extractApiList, isOwnedByNutritionist } from '../../utils/nutritionist-dashboard.utils';
import { NutritionPlan } from '../../../../shared/models/nutrition.model';
import { finalize } from 'rxjs';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, NutritionCardComponent],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(NutritionistNutritionService);
  private auth = inject(AuthService);

  clientId = signal<string | null>(null);
  client = signal<any | null>(null);
  plans = signal<NutritionPlan[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  today = new Date();

  // Modal Control
  showNotesModal = signal(false);
  showReportModal = signal(false);
  showAdvisoryModal = signal(false);
  isSavingNotes = signal(false);

  clientAdvisory = signal<string | null>(null);
  newAdvisoryText = '';

  // Real Progress Data from API
  progressData = signal<any[]>([]);
  trainingData = signal<any[]>([]);

  trainingVolume = computed(() => {
    const sessions = this.trainingData();
    let totalSets = 0;
    sessions.forEach(s => {
      s.exercises?.forEach((ex: any) => {
        totalSets += (ex.sets?.length || 0);
      });
    });
    return totalSets;
  });

  activityTimeline = computed(() => {
    const biometrics = this.progressData().map(b => ({ ...b, type: 'biometric' }));
    const workouts = this.trainingData().map(w => ({ ...w, type: 'workout' }));
    
    return [...biometrics, ...workouts].sort((a, b) => {
      const dateA = new Date(a.log_date || a.workout_date).getTime();
      const dateB = new Date(b.log_date || b.workout_date).getTime();
      return dateB - dateA;
    });
  });

  weightVelocity = computed(() => {
    const data = this.progressData();
    if (data.length < 2) return 0;
    
    const latest = data[0];
    const earliest = data[data.length - 1];
    
    // Calculate weeks difference
    const d1 = new Date(latest.log_date);
    const d2 = new Date(earliest.log_date);
    const weeks = Math.max(1, (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    const delta = latest.weight - earliest.weight;
    return Math.round((delta / weeks) * 100) / 100;
  });

  bodyCompScore = computed(() => {
    const fat = this.progressData()[0]?.body_fat || 0;
    if (!fat) return 'N/A';
    if (fat < 15) return 'Optimal';
    if (fat < 25) return 'Healthy';
    return 'Action Req';
  });

  weightTrend = computed(() => {
    const data = this.progressData();
    if (data.length < 2) return 0;
    const latest = data[0].weight;
    const earliest = data[data.length - 1].weight;
    return Math.round((latest - earliest) * 10) / 10;
  });

  isEditingTarget = signal(false);
  targetWeightInput = 0;

  goalProgress = computed(() => {
    const c = this.client();
    const data = this.progressData();
    if (!c || !c.target_weight || data.length === 0) return null;
    
    const target = c.target_weight;
    const current = data[0].weight;
    const start = data[data.length - 1].weight;
    
    if (start === target) return 100; // Unlikely but possible
    
    // If goal is weight loss
    if (start > target) {
      if (current <= target) return 100;
      if (current >= start) return 0;
      return Math.round(((start - current) / (start - target)) * 100);
    } 
    // If goal is weight gain
    else {
      if (current >= target) return 100;
      if (current <= start) return 0;
      return Math.round(((current - start) / (target - start)) * 100);
    }
  });

  onEditTarget(): void {
    if (this.client()?.target_weight) {
      this.targetWeightInput = this.client()!.target_weight;
    }
    this.isEditingTarget.set(true);
  }

  saveTargetWeight(): void {
    if (!this.targetWeightInput || !this.clientId()) return;
    this.api.updateTargetWeight(this.clientId()!, this.targetWeightInput).subscribe({
      next: () => {
        this.client.update(c => ({ ...c, target_weight: this.targetWeightInput }));
        this.isEditingTarget.set(false);
      },
      error: () => alert('Failed to set target weight.')
    });
  }

  activePlans = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.plans().filter(p => p.start_date <= today && p.end_date >= today);
  });

  pastPlans = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.plans().filter(p => p.end_date < today);
  });

  upcomingPlans = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.plans().filter(p => p.start_date > today);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clientId.set(id);
      this.loadClientData(id);
      this.loadBiometrics(id);
    } else {
      this.router.navigate(['/nutritionist/clients']);
    }
  }

  loadBiometrics(id: string): void {
    this.api.getBiometrics(id).subscribe({
      next: res => {
        this.progressData.set(extractApiList<any>(res));
      },
      error: () => console.error('Failed to load biometric data.')
    });
  }

  loadWorkoutHistory(id: string): void {
    this.api.getWorkoutHistory(id).subscribe({
      next: res => {
        this.trainingData.set(extractApiList<any>(res));
      },
      error: () => console.error('Failed to load training profile.')
    });
  }

  loadClientData(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Fetch client info from the clients list for now (mocking specialized service)
    this.api.getClients().subscribe({
      next: res => {
        const clients = extractApiList<any>(res);
        const target = clients.find(c => String(c.id_user) === String(id));
        if (target) {
          this.client.set(target);
          this.clientAdvisory.set(target.nutritionist_advisory || null);
          this.loadClientPlans(id);
          this.loadBiometrics(id);
          this.loadWorkoutHistory(id);
        } else {
          this.error.set('Client not found.');
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.error.set('Could not fetch client information.');
        this.isLoading.set(false);
      }
    });
  }

  loadClientPlans(id: string): void {
    this.api.getNutritionPlans(1, 100).subscribe({
      next: res => {
        const allPlans = extractApiList<NutritionPlan>(res);
        const me = this.auth.currentUser()?.id_user;
        
        // Filter plans for this member that were created by me
        const memberPlans = allPlans.filter(p => 
          isOwnedByNutritionist(p, me) && 
          (p.members ?? []).some((m: any) => String(m.id_user) === String(id))
        );
        
        this.plans.set(memberPlans);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onViewReport(): void {
    this.showReportModal.set(true);
  }

  onInternalNotes(): void {
    this.showNotesModal.set(true);
  }

  onActivityLog(): void {
    const el = document.getElementById('protocol-history');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onIssueAdvisory(): void {
    this.showAdvisoryModal.set(true);
  }

  sendAdvisory(remark: string): void {
    const id = this.clientId();
    if (!id || !remark.trim()) return;
    
    this.api.updateMemberAdvisory(id, remark).subscribe({
      next: () => {
        this.clientAdvisory.set(remark);
        this.showAdvisoryModal.set(false);
        // We assume Toast service is available or we just log for now
        console.log('Advisory pinned successfully.');
      },
      error: () => {
        console.error('Failed to pin professional advisory.');
      }
    });
  }
}
