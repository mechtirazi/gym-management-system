import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

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

  getAvailableCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses`);
  }

  getAllGyms(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gyms`);
  }

  getMyReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews`);
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notifications`);
  }

  enrollInCourse(courseId: string, paymentMethod: string = 'zen_wallet'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/courses/${courseId}/enroll`, { payment_method: paymentMethod });
  }

  purchaseMembership(gymId: string, paymentMethod: string = 'zen_wallet'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/gyms/${gymId}/purchase`, { payment_method: paymentMethod });
  }

  checkIn(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/check-in`, {});
  }

  updateBiometrics(stats: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/member/biometrics`, stats);
  }

  saveWorkoutLog(workoutData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/member/workouts`, workoutData);
  }

  getWorkoutHistory(page: number = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/member/workouts/history?page=${page}`);
  }

  submitReview(gymId: string, reviewData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gyms/${gymId}/reviews`, reviewData);
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${reviewId}`);
  }
}
