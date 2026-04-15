import { Component, input, output, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GymMember } from '../../../../../shared/models/gym-member.model';
import { MemberService } from '../../services/member.service';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-member-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './member-profile-modal.component.html',
  styleUrl: './member-profile-modal.component.scss'
})
export class MemberProfileModalComponent implements OnInit {
  member = input.required<GymMember>();
  initialEditMode = input<boolean>(false);
  close = output<void>();
  updated = output<void>();

  private fb = inject(FormBuilder);
  private memberService = inject(MemberService);
  private planService = inject(MembershipPlanService);
  private authService = inject(AuthService);
  
  plans = signal<MembershipPlan[]>([]);

  isEditing = signal(false);
  isSubmitting = signal(false);
  editError = signal<string | null>(null);

  editForm!: FormGroup;

  constructor() {
    effect(() => {
      this.isEditing.set(this.initialEditMode());
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    const names = (this.member().name || '').trim().split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    this.editForm = this.fb.group({
      firstName: [firstName, Validators.required],
      lastName: [lastName, Validators.required],
      email: [this.member().email || '', [Validators.required, Validators.email]],
      phone: [this.member().phone || ''],
      status: [this.member().status || 'active', Validators.required],
      id_plan: [this.member()['id_plan'] || '']
    });

    const gymId = this.authService.connectedGymId();
    if (gymId) {
      this.planService.getPlans(gymId.toString()).subscribe({
        next: (res) => this.plans.set(res.data || res || []),
        error: (err) => console.error('Failed to load plans', err)
      });
    }
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
    if (!this.isEditing()) {
      const names = (this.member().name || '').trim().split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      this.editForm.patchValue({
        firstName,
        lastName,
        email: this.member().email || '',
        phone: this.member().phone || '',
        status: (this.member().status || 'active').toLowerCase(),
        id_plan: this.member()['id_plan'] || ''
      });
      this.editError.set(null);
    }
  }

  onClose() {
    this.close.emit();
  }

  submitUpdate() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formVal = this.editForm.value;
    const payload = {
      name: formVal.firstName,
      last_name: formVal.lastName,
      email: formVal.email,
      phone: formVal.phone
    };

    const targetId = this.member()['userId'];

    if (!targetId) {
      this.editError.set('Cannot update: User ID is missing.');
      return;
    }

    this.isSubmitting.set(true);
    this.editError.set(null);

    this.memberService.updateMember(targetId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          // Also update enrollment status/plan if it changed
          const enrollmentId = this.member().id;
          if (enrollmentId && (formVal.status !== this.member().status || formVal.id_plan !== this.member()['id_plan'])) {
            this.memberService.updateEnrollment(enrollmentId, { 
              status: formVal.status,
              id_plan: formVal.id_plan 
            }).subscribe();
          }
          this.isEditing.set(false);
          this.updated.emit();
        },
        error: (err) => {
          console.error('Update member error:', err);
          this.editError.set(err.error?.message || err.message || 'Failed to update member.');
        }
      });
  }

  reactivate() {
    const enrollmentId = this.member().id;
    if (!enrollmentId) return;

    this.isSubmitting.set(true);
    this.memberService.updateEnrollment(enrollmentId, { 
      status: 'active',
      enrollment_date: new Date().toISOString().split('T')[0]
    }).pipe(finalize(() => this.isSubmitting.set(false)))
    .subscribe({
      next: () => this.updated.emit(),
      error: (err) => this.editError.set('Failed to reactivate membership')
    });
  }

  extendMembership() {
    const enrollmentId = this.member().id;
    if (!enrollmentId) return;

    this.isSubmitting.set(true);
    // Simple extension: reset enrollment date to today
    this.memberService.updateEnrollment(enrollmentId, { 
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'active'
    }).pipe(finalize(() => this.isSubmitting.set(false)))
    .subscribe({
      next: () => this.updated.emit(),
      error: (err) => this.editError.set('Failed to extend membership')
    });
  }
}
