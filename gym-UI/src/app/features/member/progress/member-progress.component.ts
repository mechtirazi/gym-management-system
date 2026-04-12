import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MemberService } from '../services/member.service';
import { Observable, forkJoin, Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-member-progress',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './member-progress.component.html',
  styleUrl: './member-progress.component.scss'
})
export class MemberProgressComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  stats: any = null;
  attendances: any[] = [];
  workoutHistory: any[] = [];
  loading = true;

  // Analysis Filter State
  analysisCategory = 'all'; // 'all', 'chest', 'back', 'legs', 'shoulders'
  
  private readonly exerciseMuscles: { [key: string]: string } = {
    'bench press': 'chest',
    'incline dumbbell press': 'chest',
    'chest flys': 'chest',
    'pull ups': 'back',
    'bent over rows': 'back',
    'lat pulldowns': 'back',
    'squats': 'legs',
    'leg press': 'legs',
    'lunges': 'legs',
    'deadlift': 'legs',
    'overhead press': 'shoulders',
    'lateral raises': 'shoulders'
  };

  achievements = [
    { id: 'consistency', title: 'Consistency King', icon: '🏆', target: 30, current: 0, label: '30 Day Streak', locked: true },
    { id: 'sessions', title: 'Elite Athlete', icon: '🏅', target: 100, current: 0, label: '100 Workouts', locked: true },
    { id: 'starter', title: 'Quick Start', icon: '✨', target: 5, current: 0, label: '5th Workout', locked: true },
    { id: 'hydrated', title: 'H2O Master', icon: '💧', target: 3, current: 0, label: '3L Daily Water', locked: true }
  ];

  getRank(): { title: string, level: number, color: string } {
    const points = this.stats?.evolutionPoints || 0;
    if (points >= 5000) return { title: 'Vanguard Elite', level: 50, color: '#ef4444' };
    if (points >= 2500) return { title: 'Node Architect', level: 25, color: '#f59e0b' };
    if (points >= 1000) return { title: 'Protocol Master', level: 10, color: '#8b5cf6' };
    if (points >= 500) return { title: 'Advanced Init', level: 5, color: '#3b82f6' };
    return { title: 'New Recruit', level: 1, color: '#10b981' };
  }

  getBioScore(): number {
    if (!this.stats) return 0;
    const waterMet = (this.stats.water >= 3) ? 25 : (this.stats.water / 3) * 25;
    const weightLogged = (this.stats.weight > 0) ? 25 : 0;
    const macrosAdherence = (this.getMacroPercentage('protein') + this.getMacroPercentage('carbs') + this.getMacroPercentage('fats')) / 3;
    const caloriesMet = (Math.abs(this.stats.caloriesBurned - this.getTargetCalories()) < 200) ? 25 : 0;
    
    return Math.min(Math.round(waterMet + weightLogged + (macrosAdherence * 0.25) + caloriesMet), 100);
  }

  fitnessGoal: 'cut' | 'maintain' | 'bulk' = 'maintain';
  isUpdatingBio = false;
  private biometricsUpdate$ = new Subject<any>();
  showAllHistory = false;

  get displayedAttendances() {
    return this.showAllHistory ? this.attendances : this.attendances.slice(0, 5);
  }

  toggleHistory(): void {
    this.showAllHistory = !this.showAllHistory;
    this.cdr.detectChanges();
  }

  Number(val: any): number { return Number(val) || 0; }

  ngOnInit(): void { this.loadProgress(); }

  loadProgress(): void {
    this.loading = true;
    forkJoin({
      stats: this.memberService.getDashboardStats(),
      attendances: this.memberService.getMyAttendances(),
      workouts: this.memberService.getWorkoutHistory()
    }).subscribe({
      next: (res: any) => {
        this.attendances = res.attendances?.data || [];
        this.workoutHistory = res.workouts?.data || [];
        this.stats = res.stats?.stats;
        this.calculateAchievements();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Progress sync failed', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.biometricsUpdate$.pipe(
      debounceTime(1000),
      switchMap(payload => {
        this.isUpdatingBio = true;
        return this.memberService.updateBiometrics(payload);
      })
    ).subscribe({
      next: (response: any) => {
        this.isUpdatingBio = false;
        if (response.stats) {
          const backendStats = response.stats?.stats;
          this.stats = {
            ...this.stats,
            caloriesBurned: backendStats?.calories || 0,
            protein: backendStats?.protein || 0,
            carbs: backendStats?.carbs || 0,
            fats: backendStats?.fats || 0,
            water: backendStats?.water || 0,
            weight: backendStats?.weight || 0
          };
          this.cdr.detectChanges();
        }
      },
      error: () => this.isUpdatingBio = false
    });
  }

  private calculateAchievements(): void {
    const totalAttendance = this.stats?.totalAttendance || this.attendances.length;
    
    let streak = 0;
    if (this.attendances && this.attendances.length > 0) {
      const sortedDates = this.attendances
        .map(a => new Date(a.created_at).setHours(0,0,0,0))
        .sort((a,b) => b - a);
      const uniqueDates = [...new Set(sortedDates)];
      let today = new Date().setHours(0,0,0,0);
      let i = 0;
      if (uniqueDates[0] === today) i = 0;
      else if (uniqueDates[0] === today - 86400000) { i = 0; today = today - 86400000; }
      
      for (; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === today - (i * 86400000)) streak++;
        else break;
      }
    }

    this.achievements.forEach(ach => {
      if (ach.id === 'sessions' || ach.id === 'starter') {
        ach.current = totalAttendance;
        ach.locked = totalAttendance < ach.target;
      } else if (ach.id === 'consistency') {
        ach.current = streak;
        ach.locked = streak < ach.target;
      } else if (ach.id === 'hydrated') {
        ach.current = this.stats?.water || 0;
        ach.locked = (this.stats?.water || 0) < ach.target;
      }
    });
  }

  getBMI(): string {
    const weight = Number(this.stats?.weight) || 70;
    const height = 1.75; // Standard height multiplier
    const bmi = weight / (height * height);
    return bmi.toFixed(1);
  }

  getBMICategory(): string {
    const bmi = parseFloat(this.getBMI());
    if (bmi < 18.5) return 'Recuperation Phase';
    if (bmi < 25) return 'Optimal Efficiency';
    if (bmi < 30) return 'Mass Accretion';
    return 'Hypertrophic State';
  }

  updateBiometrics(metric: string, value: string | number): void {
    const val = Number(value);
    if (isNaN(val)) return;
    if (!this.stats) this.stats = {};
    const metricMap: any = { 'calories': 'caloriesBurned', 'protein': 'protein', 'carbs': 'carbs', 'fats': 'fats', 'water': 'water', 'weight': 'weight' };
    const localKey = metricMap[metric];
    if (localKey) this.stats[localKey] = val;
    if (['protein', 'carbs', 'fats'].includes(metric)) {
      this.stats.caloriesBurned = (this.stats.protein * 4) + (this.stats.carbs * 4) + (this.stats.fats * 9);
    }
    const payload = { calories: this.stats.caloriesBurned, protein: this.stats.protein, carbs: this.stats.carbs, fats: this.stats.fats, water: this.stats.water, weight: this.stats.weight };
    this.biometricsUpdate$.next(payload as any);
  }

  getTargetCalories(): number {
    const weight = this.stats?.weight || 70;
    let tdee = Math.round(weight * 24 * 1.375);
    if (this.fitnessGoal === 'cut') tdee -= 500;
    else if (this.fitnessGoal === 'bulk') tdee += 500;
    return tdee;
  }

  getMacroPercentage(macro: string): number {
    const targetCals = this.getTargetCalories();
    if (!targetCals) return 0;
    let targetMacroCals = 0;
    let currentMacroCals = 0;
    if (macro === 'protein') { targetMacroCals = targetCals * 0.30; currentMacroCals = (this.stats?.protein || 0) * 4; }
    else if (macro === 'carbs') { targetMacroCals = targetCals * 0.40; currentMacroCals = (this.stats?.carbs || 0) * 4; }
    else if (macro === 'fats') { targetMacroCals = targetCals * 0.30; currentMacroCals = (this.stats?.fats || 0) * 9; }
    return Math.min(targetMacroCals > 0 ? (currentMacroCals / targetMacroCals) * 100 : 0, 100);
  }

  getMacroTargetMsg(macro: string): string {
    const percentage = this.getMacroPercentage(macro);
    if (percentage >= 100) return 'OPTIMAL';
    if (percentage >= 50) return 'ON TRACK';
    return 'REPLENISHING';
  }

  onFitnessGoalChange(event: any): void {
      this.fitnessGoal = event.target.value;
      this.cdr.detectChanges();
  }

  setAnalysisCategory(cat: string): void {
    this.analysisCategory = cat;
    this.cdr.detectChanges();
  }

  // --- Professional Dynamic Volume Chart Logic ---
  get filteredVolumeStats() {
    if (!this.workoutHistory || this.workoutHistory.length === 0) return null;

    const bodyweight = Number(this.stats?.weight) || 70;

    // Filter sessions that contain exercises for the selected muscle
    const data = [...this.workoutHistory]
      .sort((a,b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
      .map(w => {
        let vol = 0;
        w.exercises?.forEach((ex: any) => {
          const muscle = ex.exercise_name ? this.exerciseMuscles[ex.exercise_name.toLowerCase()] : null;
          if (this.analysisCategory === 'all' || muscle === this.analysisCategory) {
            ex.sets?.forEach((s: any) => {
               let repWeight = Number(s.weight) || 0;
               if (repWeight === 0) repWeight = bodyweight; // Account for bodyweight exercises
               vol += repWeight * (Number(s.reps) || 0);
            });
          }
        });

        return { 
          date: new Date(w.workout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
          volume: vol 
        };
      })
      .filter(d => d.volume > 0); // Only sessions with work done for that muscle

    if (data.length === 0) return null;

    const last = data[data.length - 1]?.volume || 0;
    const prev = data[data.length - 2]?.volume || 0;
    const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    const maxVal = Math.max(...data.map(d => d.volume));
    const total = data.reduce((acc, curr) => acc + curr.volume, 0);

    return { 
      data, 
      totalLifetime: total.toLocaleString(), 
      recentChange: parseFloat(change.toFixed(1)), 
      maxVolume: maxVal.toLocaleString(), 
      maxRaw: maxVal 
    };
  }

  get historyStats() {
    const records = this.attendances || [];
    const monthlySessions = records.filter(a => {
        const d = new Date(a.created_at);
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length;
    const courseFreq: any = {};
    let topCourse = 'None';
    let max = 0;
    records.forEach(a => {
        const title = a.session?.course?.name || 'Metropolitan Routine';
        courseFreq[title] = (courseFreq[title] || 0) + 1;
        if (courseFreq[title] > max) { max = courseFreq[title]; topCourse = title; }
    });

    let weeksSinceStart = 1;
    if (records.length > 0) {
        const sorted = [...records].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const firstRecord = new Date(sorted[0].created_at);
        const now = new Date();
        const diffMs = now.getTime() - firstRecord.getTime();
        weeksSinceStart = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    }
    const weeklyAverage = parseFloat((records.length / weeksSinceStart).toFixed(1));

    return { totalLifetime: this.stats?.totalAttendance || records.length, monthly: monthlySessions, favorite: topCourse, weeklyAverage: weeklyAverage };
  }

  get evolutionPrediction() {
     const weight = Number(this.stats?.weight) || 70;
     let weeklyChange = 0;
     let desc = "Metabolic equilibrium maintained.";
     let trendIcon = "monitor_heart";
     let color = "#3b82f6";

     const compliance = (this.stats?.evolutionPoints || 0) > 50 ? 1 : 0.5;

     if (this.fitnessGoal === 'cut') { 
        weeklyChange = -0.45 * compliance; 
        desc = compliance === 1 ? "Simulated lipolysis vector active." : "Inconsistent deficit detected."; 
        trendIcon = compliance === 1 ? "trending_down" : "warning"; 
        color = compliance === 1 ? "#10b981" : "#f59e0b"; 
     }
     else if (this.fitnessGoal === 'bulk') { 
        weeklyChange = +0.25 * compliance; 
        desc = compliance === 1 ? "Muscular hypertrophy synthesis projected." : "Suboptimal growth stimulus."; 
        trendIcon = compliance === 1 ? "trending_up" : "warning"; 
        color = compliance === 1 ? "#f59e0b" : "#ef4444"; 
     }
     return { current: weight, month1: parseFloat((weight + (weeklyChange * 4)).toFixed(1)), month3: parseFloat((weight + (weeklyChange * 12)).toFixed(1)), desc, trendIcon, color };
  }
}
