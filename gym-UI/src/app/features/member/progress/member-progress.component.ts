import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('chatBody') chatBody!: ElementRef;

  stats: any = null;
  attendances: any[] = [];
  workoutHistory: any[] = [];
  currentStreak = 0;
  // UI State
  activeTab: 'overview' | 'tracking' | 'physical' | 'analytics' = 'overview';
  analysisCategory = 'all'; // 'all', 'chest', 'back', 'legs', 'shoulders'
  loading = true;

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

  achievements: any[] = [
    { id: 'consistency', title: 'Consistency King', icon: 'emoji_events', target: 30, current: 0, label: '30 Day Streak', locked: true, desc: 'Maintain a 30-day workout streak', earned: false },
    { id: 'sessions', title: 'Elite Athlete', icon: 'workspace_premium', target: 100, current: 0, label: '100 Workouts', locked: true, desc: 'Complete 100 training sessions', earned: false },
    { id: 'starter', title: 'Quick Start', icon: 'auto_awesome', target: 5, current: 0, label: '5th Workout', locked: true, desc: 'Sync your 5th workout node', earned: false },
    { id: 'hydrated', title: 'H2O Master', icon: 'water_drop', target: 3, current: 0, label: '3L Daily Water', locked: true, desc: 'Maintain 3L hydration protocol', earned: false }
  ];

  evolutionPrediction: any = { current: 0, month1: 0, month3: 0, month6: 0, desc: 'Syncing...', trendIcon: 'sync', color: '#3b82f6' };

  // AI Assistant State
  aiMessages: { role: 'ai' | 'user', content: string, timestamp: Date }[] = [];
  aiInsights: string[] = [];
  isAiThinking = false;
  showAiChat = false;

  // New Data Sections (Now Dynamic)
  personalRecords: any[] = [];
  bodyMeasurements: any = {
    chest: 65,
    waist: 60,
    biceps: 55,
    thighs: 58,
    lastUpdate: new Date()
  };

  // Visual Timeline State
  isAnalyzing: boolean = false;
  physiqueScore: number | null = null;
  analyzedPhotos: any[] = [
    { id: 1, url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80', date: '2026-04-15', score: 72 },
    { id: 2, url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80', date: '2026-04-28', score: 75 }
  ];

  // Activity Heatmap
  activityMap: { day: string, active: boolean, level: number }[] = [];

  get macroTargets() {
    const weight = Number(this.stats?.weight) || 70;
    const height = Number(this.stats?.height) || 175;
    // Base protein at 2.0g/kg for active gym members
    const protein = Math.round(weight * 2.0);
    // Base fat at 0.8g/kg
    const fats = Math.round(weight * 0.8);
    // Carbs are adjusted based on goal
    let carbMult = 3.0;
    if (this.fitnessGoal === 'bulk') carbMult = 4.5;
    if (this.fitnessGoal === 'cut') carbMult = 1.5;
    
    const carbs = Math.round(weight * carbMult);
    const calories = (protein * 4) + (carbs * 4) + (fats * 9);
    const water = Number((weight * 0.035).toFixed(1)); // 35ml per kg

    return { protein, carbs, fats, calories, water };
  }



  generateActivityMap(): void {
    const map = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hasAttendance = this.attendances.some(a => a.created_at && a.created_at.startsWith(dateStr));
      const hasWorkout = this.workoutHistory.some(w => w.workout_date && w.workout_date.startsWith(dateStr));
      
      const active = hasAttendance || hasWorkout;
      
      map.push({
        day: dateStr,
        active: active,
        level: active ? Math.floor(Math.random() * 3) + 1 : 0
      });
    }
    this.activityMap = map;
  }

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
    
    // 1. Hydration Sync (25%)
    const waterMet = Math.min((this.stats.water / 3) * 25, 25);
    
    // 2. Weight Logging Consistency (15%)
    const weightLogged = (this.stats.weight > 0) ? 15 : 0;
    
    // 3. Macro Adherence (35%)
    const proteinTarget = this.getTargetCalories() * 0.30 / 4;
    const proteinAdherence = Math.min((this.stats.protein / proteinTarget) * 15, 15);
    
    const carbsTarget = this.getTargetCalories() * 0.40 / 4;
    const carbsAdherence = Math.min((this.stats.carbs / carbsTarget) * 10, 10);
    
    const fatsTarget = this.getTargetCalories() * 0.30 / 9;
    const fatsAdherence = Math.min((this.stats.fats / fatsTarget) * 10, 10);
    
    // 4. Activity/Volume Sync (25%)
    const activityMet = this.attendances.length > 0 ? 25 : 0;

    const total = Math.round(waterMet + weightLogged + proteinAdherence + carbsAdherence + fatsAdherence + activityMet);
    return Math.min(total, 100);
  }

  getSyncQualityLabel(): string {
    const score = this.getBioScore();
    if (score >= 90) return 'OPTIMAL NODE';
    if (score >= 70) return 'STABLE SYNC';
    if (score >= 40) return 'REPLENISHING';
    return 'MINIMAL SIGNAL';
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
        
        // Sync Dynamic Data from Backend
        this.personalRecords = res.stats?.personalRecords || [];
        this.bodyMeasurements = res.stats?.bodyMeasurements || this.bodyMeasurements;
        this.aiInsights = res.stats?.aiAdvice || [];
        if (res.stats?.projection) {
          this.evolutionPrediction = {
            ...res.stats.projection,
            current: this.stats?.weight || 0,
            trendIcon: 'biotech',
            color: '#8b5cf6',
            backendSynced: true
          };
        } else {
          this.updateEvolutionPrediction();
        }
        
        this.syncAchievements();
        this.generateActivityMap();
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
            caloriesBurned: backendStats?.caloriesBurned || 0,
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

  private syncAchievements(): void {
    const totalAttendance = this.stats?.totalAttendance || this.attendances.length;

    const allDates = [
      ...this.attendances.map(a => new Date(a.created_at).setHours(0, 0, 0, 0)),
      ...this.workoutHistory.map(w => new Date(w.workout_date).setHours(0, 0, 0, 0))
    ].filter(d => !isNaN(d));

    let streak = 0;
    if (allDates.length > 0) {
      const uniqueDates = [...new Set(allDates)].sort((a, b) => b - a);
      let today = new Date().setHours(0, 0, 0, 0);
      let i = 0;
      if (uniqueDates[0] === today) i = 0;
      else if (uniqueDates[0] === today - 86400000) { i = 0; today = today - 86400000; }

      for (; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === today - (i * 86400000)) streak++;
        else break;
      }
    }
    this.currentStreak = streak;

    this.achievements.forEach(ach => {
      if (ach.id === 'sessions' || ach.id === 'starter') {
        ach.current = totalAttendance;
        ach.locked = totalAttendance < ach.target;
        ach.earned = !ach.locked;
      } else if (ach.id === 'consistency') {
        ach.current = streak;
        ach.locked = streak < ach.target;
        ach.earned = !ach.locked;
      } else if (ach.id === 'hydrated') {
        ach.current = this.stats?.water || 0;
        ach.locked = (this.stats?.water || 0) < ach.target;
        ach.earned = !ach.locked;
      }
    });

    // Add dynamic backend achievements if they don't exist
    const points = this.stats?.evolutionPoints || 0;
    const backendAchievements = [
      { id: 'iron-pioneer', title: 'Iron Pioneer', icon: 'military_tech', target: 500, current: points, label: '500 Pts', locked: points < 500, desc: 'Sync 500 evolution points', earned: points >= 500 },
      { id: 'hydration-elite', title: 'Hydration Elite', icon: 'water_drop', target: 3, current: (this.stats?.water || 0), label: '3L+', locked: (this.stats?.water || 0) < 3, desc: 'Daily water sync > 3L', earned: (this.stats?.water || 0) >= 3 },
      { id: 'volume-master', title: 'Volume Master', icon: 'fitness_center', target: 20, current: this.workoutHistory.length, label: '20+ Sessions', locked: this.workoutHistory.length < 20, desc: 'Total workout count > 20', earned: this.workoutHistory.length > 20 }
    ];

    backendAchievements.forEach(ba => {
      if (!this.achievements.find(a => a.id === ba.id)) {
        this.achievements.push(ba);
      }
    });
  }

   getBMI(): string {
     const weight = Number(this.stats?.weight) || 70;
     const heightCm = Number(this.stats?.height) || 175;
     const heightM = heightCm / 100;
     const bmi = weight / (heightM * heightM);
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
    const metricMap: any = { 'calories': 'caloriesBurned', 'protein': 'protein', 'carbs': 'carbs', 'fats': 'fats', 'water': 'water', 'weight': 'weight', 'height': 'height' };
    const localKey = metricMap[metric];
    if (localKey) {
      this.stats[localKey] = val;
      // Recalculate calories burned locally for immediate feedback
      if (['protein', 'carbs', 'fats'].includes(metric)) {
        const p = Number(this.stats.protein) || 0;
        const c = Number(this.stats.carbs) || 0;
        const f = Number(this.stats.fats) || 0;
        this.stats.caloriesBurned = (p * 4) + (c * 4) + (f * 9);
      }
      this.cdr.detectChanges();
    }
    const payload = { 
      calories: this.stats.caloriesBurned, 
      protein: this.stats.protein, 
      carbs: this.stats.carbs, 
      fats: this.stats.fats, 
      water: this.stats.water, 
      weight: this.stats.weight,
      height: this.stats.height
    };
    this.biometricsUpdate$.next(payload as any);
  }

  getTargetCalories(): number {
    return this.macroTargets.calories;
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
    this.updateEvolutionPrediction();
    this.cdr.detectChanges();
  }

  setAnalysisCategory(cat: string): void {
    this.analysisCategory = cat;
    this.cdr.detectChanges();
  }

  setTab(tab: 'overview' | 'tracking' | 'physical' | 'analytics'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // --- Professional Dynamic Volume Chart Logic ---
  get filteredVolumeStats() {
    if (!this.workoutHistory || this.workoutHistory.length === 0) return null;

    const bodyweight = Number(this.stats?.weight) || 70;

    // Filter sessions that contain exercises for the selected muscle
    const data = [...this.workoutHistory]
      .sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
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

    const lastSession = data[data.length - 1]?.volume || 0;
    
    // Calculate average of previous sessions to show true evolution baseline
    const previousSessions = data.slice(0, data.length - 1);
    const avgPrevious = previousSessions.length > 0 
      ? previousSessions.reduce((sum, d) => sum + d.volume, 0) / previousSessions.length 
      : lastSession;

    const change = avgPrevious > 0 ? ((lastSession - avgPrevious) / avgPrevious) * 100 : 0;
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
      const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const firstRecord = new Date(sorted[0].created_at);
      const now = new Date();
      const diffMs = now.getTime() - firstRecord.getTime();
      weeksSinceStart = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    }
    const weeklyAverage = parseFloat((records.length / weeksSinceStart).toFixed(1));

    return { totalLifetime: this.stats?.totalAttendance || records.length, monthly: monthlySessions, favorite: topCourse, weeklyAverage: weeklyAverage };
  }

  get consistencyRate(): number {
    if (!this.attendances || this.attendances.length === 0) return 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentSessions = this.attendances.filter(a => new Date(a.created_at) >= thirtyDaysAgo).length;
    // Assuming a "healthy" target is 3 sessions per week = 12 sessions per 30 days
    return Math.min(Math.round((recentSessions / 12) * 100), 100);
  }

  get nextAchievement() {
    return this.achievements.find(a => a.locked);
  }

  updateEvolutionPrediction(): void {
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
    
    // Only update if not already set by backend (to preserve backend intelligence)
    if (!this.evolutionPrediction.backendSynced) {
       this.evolutionPrediction = { current: weight, month1: parseFloat((weight + (weeklyChange * 4)).toFixed(1)), month3: parseFloat((weight + (weeklyChange * 12)).toFixed(1)), month6: parseFloat((weight + (weeklyChange * 24)).toFixed(1)), desc, trendIcon, color };
    }
  }

  // --- AI Logic ---

  generateAiInsights(): void {
    const insights = [];
    const volume = this.filteredVolumeStats;
    const macros = {
      p: this.getMacroPercentage('protein'),
      c: this.getMacroPercentage('carbs'),
      f: this.getMacroPercentage('fats')
    };

    if (volume && volume.recentChange > 5) {
      insights.push(`Your ${this.analysisCategory} volume is up by ${volume.recentChange}%. Your progressive overload is excellent.`);
    } else if (volume && volume.recentChange < -5) {
      insights.push(`Noticeable dip in ${this.analysisCategory} intensity. Ensure you're prioritizing recovery or check your sleep cycles.`);
    }

    if (macros.p < 70) {
      insights.push("Protein synthesis potential is low. Aim for at least 1.6g/kg of bodyweight to optimize recovery.");
    }

    if (this.historyStats.weeklyAverage > 4) {
      insights.push("High frequency detected. Your central nervous system might need a deload week soon.");
    }

    if (this.stats?.water < 2) {
      insights.push("Hydration levels are sub-optimal. Aim for 3L to maintain metabolic efficiency.");
    }

    this.aiInsights = insights.length > 0 ? insights : ["Data synchronization complete. Continue your current protocol for 7 more days for deeper analysis."];
    
    if (this.aiMessages.length === 0) {
      const greetings = [
        `Greetings, ${this.stats?.name || 'Member'}. Your biometric nodes are synchronized. You are currently in the ${this.getBMICategory()} phase.`,
        `Aura AI online. Analyzed ${this.attendances.length} recent sessions. Based on your ${this.fitnessGoal} goal, I recommend ${this.fitnessGoal === 'bulk' ? 'hypertrophy focus' : 'caloric precision'}.`,
        `Neural sync active. Your evolution rank is ${this.getRank().title}. Ready for protocol inquiries?`,
        `Intelligence Hub connected. Current protocol score: ${this.getBioScore()}%. Systems operational.`
      ];
      this.aiMessages.push({
        role: 'ai',
        content: greetings[Math.floor(Math.random() * greetings.length)],
        timestamp: new Date()
      });
    }
  }

  toggleAiChat(): void {
    this.showAiChat = !this.showAiChat;
    this.cdr.detectChanges();
  }

  async sendAiMessage(input: HTMLInputElement): Promise<void> {
    const text = input.value.trim();
    if (!text) return;

    this.aiMessages.push({ role: 'user', content: text, timestamp: new Date() });
    input.value = '';
    this.isAiThinking = true;
    this.scrollToBottom();
    this.cdr.detectChanges();

    this.memberService.askAi(text).subscribe({
      next: (res) => {
        this.aiMessages.push({ role: 'ai', content: res.response, timestamp: new Date() });
        this.isAiThinking = false;
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiMessages.push({ role: 'ai', content: "Neural sync interrupted. Please check your connection to the Biometric Hub.", timestamp: new Date() });
        this.isAiThinking = false;
        this.scrollToBottom();
        this.cdr.detectChanges();
      }
    });
  }

  triggerPhotoUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.processPhysiqueAnalysis(file);
      }
    };
    input.click();
  }

  processPhysiqueAnalysis(file: File): void {
    this.isAnalyzing = true;
    this.activeTab = 'physical';
    this.cdr.detectChanges();

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imgUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        // True Image Analysis via Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Scale down for faster processing
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let isBlack = true;
        let diffSum = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;
          
          if (brightness > 5) isBlack = false; // Threshold for not entirely black
          
          // Calculate edge variance (basic contrast)
          if (i > 4) {
             const prevR = data[i-4], prevG = data[i-3], prevB = data[i-2];
             diffSum += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
          }
        }
        
        const pixels = data.length / 4;
        const avgBrightness = totalBrightness / pixels;
        const variance = diffSum / pixels; // Edge density/detail level

        // Prepare payload for backend AI Vision
        const base64Image = imgUrl;
        
        // Artificial Neural Processing Delay to simulate backend if offline
        this.memberService.analyzePhysiqueImage(base64Image).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const data = response.data;
              
              // If the AI explicitly returned an Error connection string, trigger fallback
              if (data.insights && data.insights[0] && data.insights[0].includes('Error:')) {
                this.fallbackLocalAnalysis(isBlack, avgBrightness, variance, imgUrl);
                return;
              }

              this.physiqueScore = data.score;
              this.bodyMeasurements = {
                chest: data.measurements?.chest || 0,
                waist: data.measurements?.waist || 0,
                biceps: data.measurements?.biceps || 0,
                thighs: data.measurements?.thighs || 0,
                lastUpdate: new Date()
              };
              this.aiInsights = data.insights || ["AI Vision processed successfully."];
              
              this.analyzedPhotos.unshift({
                id: Date.now(),
                url: imgUrl,
                date: new Date().toISOString().split('T')[0],
                score: data.score
              });
              
              this.isAnalyzing = false;
              this.cdr.detectChanges();
            } else {
              this.fallbackLocalAnalysis(isBlack, avgBrightness, variance, imgUrl);
            }
          },
          error: () => {
            this.fallbackLocalAnalysis(isBlack, avgBrightness, variance, imgUrl);
          }
        });
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  }

  private fallbackLocalAnalysis(isBlack: boolean, avgBrightness: number, variance: number, imgUrl: string): void {
    let newScore = 0;
    let newInsights = [];

    if (isBlack || avgBrightness < 10) {
       newScore = 0;
       newInsights = [
         "Error: Insufficient light data.",
         "Image appears to be blank or completely unlit.",
         "Please upload a clear physique protocol image."
       ];
       this.bodyMeasurements = { chest: 0, waist: 0, biceps: 0, thighs: 0, lastUpdate: new Date() };
    } else {
       const detailScore = Math.min(Math.max((variance / 50) * 100, 30), 98);
       newScore = Math.floor(detailScore);
       const delta = (newScore - 70) / 10;
       this.bodyMeasurements = {
         chest: Math.max(Math.min(Math.floor(75 + delta * 5), 100), 20),
         waist: Math.max(Math.min(Math.floor(70 + delta * 4), 100), 20),
         biceps: Math.max(Math.min(Math.floor(65 + delta * 6), 100), 20),
         thighs: Math.max(Math.min(Math.floor(68 + delta * 5), 100), 20),
         lastUpdate: new Date()
       };
       newInsights = [
         `Neural scan complete. Protocol adherence: ${newScore}%.`,
         `Local Hub: API Key missing or offline.`,
         `Estimated using fallback geometric pixel analysis.`
       ];
    }

    this.physiqueScore = newScore;
    this.analyzedPhotos.unshift({
      id: Date.now(),
      url: imgUrl,
      date: new Date().toISOString().split('T')[0],
      score: newScore
    });

    this.aiInsights = newInsights;
    this.isAnalyzing = false;
    this.cdr.detectChanges();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
