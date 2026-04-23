import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface WorkoutSet {
  weight: number;
  reps: number;
}

export interface WorkoutExercise {
  exercise_name: string;
  sets: WorkoutSet[];
}

export interface Workout {
  name: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutHistoryResponse {
  data: any[]; // Link to a more detailed 'LoggedWorkout' if backend types are known
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private upgradeTrigger$ = new Subject<void>();
  upgradeTriggered$ = this.upgradeTrigger$.asObservable();

  triggerUpgradeModal() {
    this.upgradeTrigger$.next();
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/member/dashboard-stats`);
  }

  getMyEnrollments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/enrollments`);
  }

  getMyAttendances(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/attendances`);
  }

  getMyNutritionPlans(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nutrition-plans`);
  }

  getMySubscriptions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/subscribes`);
  }

  getMyNutritionPlansMarketplace(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nutrition-plans/available`);
  }

  purchaseNutritionPlan(planId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/nutrition-plans/${planId}/purchase`, {});
  }

  getNutritionPlanDetails(planId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nutrition-plans/${planId}`);
  }

  toggleMealCompletion(mealId: string, isCompleted: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/nutrition-plans/meals/${mealId}/toggle`, { is_completed: isCompleted });
  }

  logHydration(amountMl: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/nutrition-plans/water-log`, { amount_ml: amountMl });
  }

  getAvailableCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses`);
  }

  getAllGyms(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gyms`);
  }

  getGymPlans(gymId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gyms/${gymId}/plans`);
  }

  getMyReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews`);
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notifications`);
  }

  getEvents(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/events`);
  }

  getProducts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products`);
  }

  getGymReviews(gymId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gyms/${gymId}/reviews`);
  }

  enrollInCourse(courseId: string, paymentMethod: string = 'zen_wallet'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/courses/${courseId}/enroll`, { payment_method: paymentMethod });
  }

  purchaseMembership(gymId: string, paymentMethod: string = 'zen_wallet', type: string = 'standard', idPlan?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/gyms/${gymId}/purchase`, {
      payment_method: paymentMethod,
      type: type,
      id_plan: idPlan
    });
  }

  /**
   * Create a Stripe Payment Intent for a gym membership
   */
  createPaymentIntent(gymId: string, amount?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/member/gyms/${gymId}/payment-intent`, { amount });
  }

  /**
   * Complete the purchase after Stripe confirmation (optional, if we need a final backend sync)
   */
  confirmPurchase(gymId: string, paymentIntentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/member/gyms/${gymId}/confirm-purchase`, { paymentIntentId });
  }

  followGym(gymId: string): Observable<any> {
    const userId = this.authService.currentUser()?.id_user;
    // Free follow logic - creates a subscription without payment
    return this.http.post<any>(`${this.apiUrl}/subscribes`, {
      id_gym: gymId,
      id_user: userId,
      status: 'active',
      subscribe_date: new Date().toISOString().split('T')[0]
    });
  }

  unfollowGym(subscriptionId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/subscribes/${subscriptionId}`);
  }

  checkIn(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/check-in`, {});
  }

  updateBiometrics(stats: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/member/biometrics`, stats);
  }

  saveWorkoutLog(workoutData: Workout): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/workouts`, workoutData);
  }

  getWorkoutHistory(page: number = 1): Observable<WorkoutHistoryResponse> {
    return this.http.get<WorkoutHistoryResponse>(`${this.apiUrl}/member/workouts/history?page=${page}`);
  }

  submitReview(gymId: string, reviewData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gyms/${gymId}/reviews`, reviewData);
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${reviewId}`);
  }

  toggleLike(id: string, type: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/social/like`, { id, type });
  }

  addComment(id: string, type: string, content: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/social/comment`, { id, type, content });
  }

  getComments(id: string, type: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/member/social/comments?id=${id}&type=${type}`);
  }
}
