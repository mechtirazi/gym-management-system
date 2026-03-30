import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../services/community.service';
import { Review } from '../../../shared/models/review.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrl: './community.component.scss'
})
export class CommunityComponent implements OnInit {
  private communityService = inject(CommunityService);
  private cdr = inject(ChangeDetectorRef);
  protected Math = Math;

  reviews: Review[] = [];
  filteredReviews: Review[] = [];
  isLoading = true;

  searchTerm = '';
  selectedFilter = 'all'; // all, positive, negative, neutral

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
    // We can fetch a large enough initial set but still limit it for performance
    this.communityService.getReviews({ per_page: 50 }).subscribe({
      next: (data) => {
        this.reviews = data;
        this.calculateStats();
        this.isLoading = false;
        this.applyFilter();
        this.cdr.detectChanges(); // Ensure the UI updates immediately
      },
      error: (error) => {
        console.error('Error in CommunityComponent:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats(): void {
    if (this.reviews.length === 0) return;

    this.stats.totalReviews = this.reviews.length;
    let sum = 0;
    let positiveCount = 0;

    this.reviews.forEach(r => {
      sum += r.rating;
      const score = r.ai_sentiment_score || 0;
      if (score >= 0.7 || r.rating >= 4) {
        positiveCount++;
      }
      // Pre-calculate stars for the template to avoid repetitive function calls
      (r as any).starArray = Array(5).fill(0).map((_, i) => i < r.rating ? 1 : 0);
    });

    this.stats.averageRating = Number((sum / this.reviews.length).toFixed(1));
    this.stats.positiveRate = Math.round((positiveCount / this.reviews.length) * 100);
  }

  applyFilter(): void {
    let result = [...this.reviews];

    if (this.selectedFilter !== 'all') {
      result = result.filter(r => {
        const score = r.ai_sentiment_score || 0;
        if (this.selectedFilter === 'positive') return score >= 0.7 || r.rating >= 4;
        if (this.selectedFilter === 'negative') return score < 0.4 || r.rating <= 2;
        if (this.selectedFilter === 'neutral') return score >= 0.4 && score < 0.7;
        return true;
      });
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r =>
        r.comment.toLowerCase().includes(term) ||
        (r.user?.name + ' ' + r.user?.last_name).toLowerCase().includes(term)
      );
    }

    this.filteredReviews = result;
  }

  getSentimentLabel(review: Review): string {
    const score = review.ai_sentiment_score || 0;
    if (score >= 0.7) return 'Positive';
    if (score < 0.4) return 'Negative';
    return 'Neutral';
  }

  getSentimentClass(review: Review): string {
    const score = review.ai_sentiment_score || 0;
    if (score >= 0.7) return 'sentiment-positive';
    if (score < 0.4) return 'sentiment-negative';
    return 'sentiment-neutral';
  }

  getStars(review: any): number[] {
    return review.starArray || [];
  }
}
