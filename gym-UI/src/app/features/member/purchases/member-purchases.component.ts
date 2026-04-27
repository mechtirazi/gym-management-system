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
      case 'membership': return 'Abonnement';
      case 'product': return 'Marketplace Item';
      case 'course': return 'Training Session';
      case 'event': return 'Special Event';
      case 'nutrition': return 'Nutrition Plan';
      default: return 'Other';
    }
  }

  getItemName(purchase: any): string {
    if (purchase.type === 'product' && purchase.order?.products?.length) {
       const p = purchase.order.products[0];
       return purchase.order.products.length > 1 
        ? `${p.name} (+${purchase.order.products.length - 1} more)` 
        : p.name;
    }
    if (purchase.type === 'course') return purchase.course?.name || 'Training Session';
    if (purchase.type === 'event') return purchase.event?.title || 'Event Access';
    if (purchase.type === 'membership') return `Subscription: ${purchase.gym?.name || 'Facility'}`;
    if (purchase.type === 'nutrition') return purchase.nutritionPlan?.name || 'Meal Program';
    
    return 'Digital Asset';
  }

  getMethodIcon(method: string): string {
    return method === 'zen_wallet' ? 'currency_exchange' : 'credit_card';
  }
}
