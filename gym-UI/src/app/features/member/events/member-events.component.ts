import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-member-events',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-events.component.html',
  styleUrl: './member-events.component.scss'
})
export class MemberEventsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  events: any[] = [];
  gyms: any[] = [];
  reservedEventIds: string[] = [];
  loading = true;
  errorMessage = '';

  // Filter & Pagination State
  searchText = '';
  selectedGymId = 'all';
  currentPage = 1;
  itemsPerPage = 6;

  // Payment UI State
  showPaymentModal = false;
  selectedEvent: any = null;
  processingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';

  get filteredEvents() {
    return this.events.filter(event => {
      const matchesSearch = !this.searchText ||
        event.title?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        event.description?.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesGym = this.selectedGymId === 'all' ||
        event.id_gym === this.selectedGymId;

      return matchesSearch && matchesGym;
    });
  }

  get paginatedEvents() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredEvents.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredEvents.length / this.itemsPerPage) || 1;
  }

  changePage(page: number) {
    this.currentPage = page;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      allEvents: this.memberService.getEvents().pipe(catchError(() => of({ data: [] }))),
      myAttendances: this.memberService.getMyEventAttendances().pipe(catchError(() => of({ data: [] }))),
      mySubscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const eventsRaw = res.allEvents?.data || res.allEvents || [];
        const attendancesRaw = res.myAttendances?.data || [];
        const subscriptionsRaw = res.mySubscriptions?.data || [];

        // Store events the member has officially reserved
        this.reservedEventIds = attendancesRaw.map((a: any) => a.id_event).filter((id: any) => !!id);

        // Extract unique gyms from subscriptions
        this.gyms = [];
        const gymIds = new Set();
        subscriptionsRaw.forEach((sub: any) => {
          if (sub.gym && !gymIds.has(sub.gym.id_gym)) {
            gymIds.add(sub.gym.id_gym);
            this.gyms.push(sub.gym);
          }
        });

        this.events = eventsRaw.map((event: any) => {
          // Resolve correct image URL
          let imageUrl = event.image;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
            const cleanPath = imageUrl.replace(/^\//, '');
            imageUrl = `${baseUrl}/${cleanPath}`;
          }

          return {
            ...event,
            id_event: event.id_event || event.id,
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=800',
            isReserved: this.reservedEventIds.includes(event.id_event || event.id),
            gymName: event.gym?.name || 'Local Hub',
            participantsCount: event.attendances_count || 0,
            price: event.price || 0,
            isRewarded: !!event.is_rewarded,
            rewardAmount: event.reward_amount || 0,
            maxWinners: event.max_winners || 0
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Event Hub Sync Error', err);
        this.errorMessage = 'Could not sync event matrix.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onReserve(event: any): void {
    if (this.isEventReserved(event)) return;

    if (!event.price || parseFloat(event.price) <= 0) {
      this.selectedEvent = event;
      this.completeFreeEventEnrollment();
      return;
    }

    this.selectedEvent = event;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  private completeFreeEventEnrollment() {
    if (!this.selectedEvent) return;
    this.processingPayment = true;
    this.cdr.detectChanges();
    const eventId = this.selectedEvent.id_event || this.selectedEvent.id;

    this.memberService.enrollInEvent(eventId, 'free').subscribe({
      next: () => {
        this.handleSuccess('Enrollment Successful! Welcome to the event.');
      },
      error: (err: any) => this.handleError(err)
    });
  }

  isEventReserved(event: any): boolean {
    return this.reservedEventIds.includes(event.id_event || event.id);
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedEvent = null;
    this.cdr.detectChanges();
  }

  completePurchase(event: any) {
    if (!this.selectedEvent) return;

    this.processingPayment = true;
    this.paymentError = null;
    this.cdr.detectChanges();

    const eventId = this.selectedEvent.id_event || this.selectedEvent.id;

    if (event.method === 'zen_wallet') {
      this.memberService.enrollInEvent(eventId).subscribe({
        next: () => {
          this.handleSuccess('Enrollment Successful! Welcome to the event.');
        },
        error: (err: any) => this.handleError(err)
      });
    } else {
      const amount = this.selectedEvent.price ? parseFloat(this.selectedEvent.price) : 25.00;
      this.memberService.createPaymentIntent(this.selectedEvent.id_gym, amount).subscribe({
        next: (res: any) => {
          event.stripe.confirmCardPayment(res.client_secret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handleError({ error: { message: result.error.message } });
            } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
              this.memberService.enrollInEvent(eventId, 'credit_card').subscribe({
                next: () => {
                  this.handleSuccess('Payment Confirmed! Your spot is secured.');
                },
                error: (err) => this.handleError(err)
              });
            }
          });
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleSuccess(msg = 'Transaction successful!') {
    this.processingPayment = false;
    this.paymentError = null;
    this.closePaymentModal();
    alert(msg);
    this.loadData();
  }

  private handleError(err: any) {
    console.error('TRANSACTION FAILURE:', err);
    const msg = err.error?.message || 'Biometric synchronization failed.';
    this.paymentError = msg;
    this.processingPayment = false;
    this.cdr.detectChanges();
    if (!this.showPaymentModal) {
      alert('Error: ' + msg);
    }
  }
}
