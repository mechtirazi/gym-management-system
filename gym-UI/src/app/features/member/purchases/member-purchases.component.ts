import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-member-purchases',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './member-purchases.component.html',
  styleUrl: './member-purchases.component.scss'
})
export class MemberPurchasesComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  purchases: any[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPurchases();
  }

  loadPurchases(): void {
    this.loading = true;
    this.memberService.getMyPayments().subscribe({
      next: (res: any) => {
        this.purchases = res.data || res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Purchase Hub Error', err);
        this.errorMessage = 'Failed to load your transaction history.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTypeLabel(type: string): string {
    switch(type) {
      case 'membership': return 'Facility Access';
      case 'product': return 'Marketplace Item';
      case 'course': return 'Training Session';
      case 'event': return 'Special Event';
      case 'nutrition': return 'Nutrition Plan';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Standard';
    }
  }

  getItemName(purchase: any): string {
    const type = purchase.category?.value || purchase.type;
    
    if (type === 'product') {
      return purchase.product?.name || 'Retail Product';
    }
    if (type === 'course') return purchase.course?.name || 'Expert Coaching';
    if (type === 'event') return purchase.event?.title || 'Arena Access';
    if (type === 'membership') return `Zenith Membership`;
    if (type === 'nutrition') return purchase.nutrition_plan?.name || 'Meal Strategy';
    
    return 'Digital Asset';
  }

  getMethodIcon(method: string): string {
    return method === 'zen_wallet' ? 'currency_exchange' : 'credit_card';
  }
}
