import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-member-gyms',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-gyms.component.html',
  styleUrl: './member-gyms.component.scss'
})
export class MemberGymsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  gyms: any[] = [];
  loading = true;
  errorMessage = '';
  searchTerm = '';
  activeFilter = 'All Facilities';
  filterCategories = ['All Facilities', 'Performance', 'Movement', 'Bio-Hacking', 'Boxing', 'Wellness'];

  // Payment State
  showPaymentModal = false;
  selectedGym: any = null;
  processingPayment = false;

  get filteredGyms() {
    return this.gyms.filter(gym => {
      const matchSearch = !this.searchTerm ||
        gym.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        gym.adress?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Since gyms might not have categories mapped properly in DB yet,
      // we mock the filter for the UI demonstration
      const matchFilter = this.activeFilter === 'All Facilities' ||
        (gym.name?.length % this.filterCategories.length === this.filterCategories.indexOf(this.activeFilter));

      return matchSearch && (this.activeFilter === 'All Facilities' ? true : matchFilter);
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  ngOnInit(): void {
    this.loadGyms();
  }

  loadGyms(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.memberService.getAllGyms().subscribe({
      next: (res) => {
        const results = res.data?.data ? res.data.data : res.data;
        this.gyms = Array.isArray(results) ? results : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load gyms', err);
        this.errorMessage = 'An error occurred while loading the gyms. Please try again later.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onLike(gymId: string): void {
    alert(`Node ${gymId} marked as favorite. Synchronizing with your Bio-Profile.`);
  }

  onSubscribe(gym: any): void {
    this.selectedGym = gym;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedGym = null;
    this.cdr.detectChanges();
  }

  completePurchase() {
    if (!this.selectedGym) return;

    this.processingPayment = true;
    this.memberService.purchaseMembership(this.selectedGym.id_gym).subscribe({
      next: (res: any) => {
        console.log('PURCHASE SUCCESS:', res);
        this.processingPayment = false;
        this.closePaymentModal();
        this.loadGyms();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('PURCHASE FAILURE:', err);
        this.processingPayment = false;
        const msg = err.error?.message || 'Access synchronization failed. Check your Zen Wallet.';
        alert(msg);
        this.cdr.detectChanges();
      }
    });
  }
}
