import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../../owner/services/community.service';
import { Review } from '../../../shared/models/review.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-trainer-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-community.component.html',
  styleUrl: './trainer-community.component.scss'
})
export class TrainerCommunityComponent implements OnInit {
  private communityService = inject(CommunityService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  protected Math = Math;

  activeGymId = this.authService.connectedGymId;

  reviews: Review[] = [];
  filteredReviews: Review[] = [];
  isLoading = true;

  searchTerm = '';
  selectedFilter = 'all';

  stats = {
    averageRating: 0,
    totalReviews: 0,
    positiveRate: 0
  };

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.communityService.getReviews({ per_page: 50 }).subscribe({
      next: (data) => {
        this.reviews = data;
        this.calculateStats();
        this.isLoading = false;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error in TrainerCommunity:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats(): void {
    if (this.reviews.length === 0) {
      this.stats.averageRating = 0;
      this.stats.totalReviews = 0;
      this.stats.positiveRate = 0;
      return;
    }

    this.stats.totalReviews = this.reviews.length;
    let sum = 0;
    let positiveCount = 0;

    this.reviews.forEach(r => {
      const rating = Number(r.rating);
      sum += rating;
      if (rating >= 4) {
        positiveCount++;
      }
      (r as any).starArray = Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
    });

    this.stats.averageRating = Number((sum / this.reviews.length).toFixed(1));
    this.stats.positiveRate = Math.round((positiveCount / this.reviews.length) * 100);
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    const filter = this.selectedFilter;

    this.filteredReviews = this.reviews.filter(review => {
      // Check sentiment match
      let matchesSentiment = true;
      if (filter === 'positive') matchesSentiment = review.rating >= 4;
      else if (filter === 'negative') matchesSentiment = review.rating <= 2;
      else if (filter === 'neutral') matchesSentiment = review.rating === 3;

      // Check search query match
      let matchesSearch = true;
      if (term) {
        const userName = `${review.user?.name || ''} ${review.user?.last_name || ''}`.toLowerCase();
        const comment = (review.comment || '').toLowerCase();
        matchesSearch = userName.includes(term) || comment.includes(term);
      }

      return matchesSentiment && matchesSearch;
    });
  }

  getSentimentLabel(review: any): string {
    const score = review.ai_sentiment_score !== undefined ? review.ai_sentiment_score : (review.rating / 5);
    if (score >= 0.7) return 'Positive';
    if (score <= 0.3) return 'Negative';
    return 'Neutral';
  }

  getSentimentClass(review: any): string {
    const score = review.ai_sentiment_score !== undefined ? review.ai_sentiment_score : (review.rating / 5);
    if (score >= 0.7) return 'sentiment-positive';
    if (score <= 0.3) return 'sentiment-negative';
    return 'sentiment-neutral';
  }

  getStars(review: any): number[] {
    return review.starArray || [];
  }

  getAvatarUrl(path: string | null | undefined): string {
    return this.authService.getAvatarUrl(path || undefined);
  }
}
