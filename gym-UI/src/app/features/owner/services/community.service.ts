import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Review, ReviewsResponse } from '../../../shared/models/review.model';

@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches all reviews. Support for horizontal pagination.
   */
  getReviews(params: { per_page?: number; page?: number } = {}): Observable<Review[]> {
    return this.http.get<ReviewsResponse>(`${this.apiUrl}/reviews`, { params }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error fetching reviews:', error);
        return of([]);
      })
    );
  }

  /**
   * Deletes a review from the system.
   */
  deleteReview(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`);
  }
}
