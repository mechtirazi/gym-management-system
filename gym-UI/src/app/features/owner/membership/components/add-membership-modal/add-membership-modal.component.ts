import { Component, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';

@Component({
  selector: 'app-add-membership-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './add-membership-modal.component.html',
  styleUrl: './add-membership-modal.component.scss'
})
export class AddMembershipModalComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private planService = inject(MembershipPlanService);

  close = output<void>();
  membershipAdded = output<void>();

  isSubmitting = signal<boolean>(false);
  isLoadingData = signal<boolean>(true);
  error = signal<string | null>(null);

  members = signal<any[]>([]);
  plans = signal<MembershipPlan[]>([]);

  membershipForm = this.fb.group({
    id_user: ['', Validators.required],
    status: ['active', Validators.required],
    id_plan: ['', Validators.required],
    subscribe_date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoadingData.set(true);
    
    this.membershipService.getUsers().pipe(
      finalize(() => this.isLoadingData.set(false))
    ).subscribe({
      next: (res) => {
        console.log('Member list fetched:', res);
        const users = res.data || (Array.isArray(res) ? res : []);
        // Strictly filter to users who have the role 'member'
        const mems = users.filter((u: any) => u.role === 'member');
        console.log('Filtered members (role=member):', mems);
        this.members.set(mems);
      },
      error: (err) => {
        console.error('Failed to load members', err);
        this.error.set('Failed to fetch user list. Please try again.');
      }
    });

    const gymId = this.authService.connectedGymId();
    if (gymId) {
      this.planService.getPlans(gymId.toString()).subscribe({
        next: (res) => {
          this.plans.set(res.data || res || []);
        },
        error: (err) => console.error('Failed to load plans', err)
      });
    }
  }

  onSubmit() {
    console.log('--- Submission Process Started ---');
    const gymId = this.authService.connectedGymId();
    console.log('Active Gym ID:', gymId);
    console.log('Form State:', this.membershipForm.value);
    console.log('Form Valid?', this.membershipForm.valid);

    if (!gymId) {
      const errMsg = 'No active gym context found. Please select a gym first.';
      console.warn(errMsg);
      this.error.set(errMsg);
      return;
    }

    if (this.membershipForm.invalid) {
      const errMsg = 'Please select a member and a date correctly.';
      console.warn(errMsg, this.membershipForm.errors);
      this.error.set(errMsg);
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const formValue = this.membershipForm.getRawValue();
    
    const payload = {
      id_member: formValue.id_user,
      id_gym: gymId,
      status: formValue.status,
      id_plan: formValue.id_plan,
      enrollment_date: formValue.subscribe_date
    };

    console.log('Adding membership with payload:', payload);

    this.membershipService.addMembership(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.membershipAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Failed to add membership', err);
          this.error.set(err.error?.message || 'Failed to create membership. Please try again.');
        }
      });
  }
}
