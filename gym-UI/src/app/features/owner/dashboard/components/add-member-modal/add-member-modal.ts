import { Component, inject, output, signal, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OwnerDashboardService } from '../../../services/owner-dashboard.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-add-member-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-member-modal.html',
  styleUrl: './add-member-modal.scss'
})
export class AddMemberModalComponent implements OnInit {
  private dashboardService = inject(OwnerDashboardService);
  private authService = inject(AuthService);
  private planService = inject(MembershipPlanService);
  private fb = inject(FormBuilder);

  close = output<void>();
  memberAdded = output<void>();

  isSubmitting = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  plans = signal<MembershipPlan[]>([]);
  isLoadingPlans = signal<boolean>(true);

  memberForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    id_plan: ['', Validators.required],
    startDate: [new Date().toISOString().split('T')[0], Validators.required]
  });

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    const gymId = this.authService.currentUser()?.gym_id;
    if (!gymId) return;

    this.isLoadingPlans.set(true);
    this.planService.getPlans(gymId.toString())
      .pipe(finalize(() => this.isLoadingPlans.set(false)))
      .subscribe({
        next: (res) => {
          this.plans.set(res.data || res || []);
        },
        error: (err) => console.error('Failed to load plans', err)
      });
  }

  closeModal() {
    this.close.emit();
  }

  submitAddMember() {
    if (this.memberForm.invalid) return;

    this.isSubmitting.set(true);
    const formValue = this.memberForm.getRawValue();
    
    this.dashboardService.addMember(formValue)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.isSuccess.set(true);
          setTimeout(() => {
            this.memberAdded.emit();
            this.closeModal();
          }, 2000);
        },
        error: (err) => {
          console.error('Failed to add member', err);
          this.isSubmitting.set(false);
        }
      });
  }
}
