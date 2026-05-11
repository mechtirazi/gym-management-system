import { Component, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/services/auth.service';
import { finalize, catchError, of, switchMap } from 'rxjs';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';
import { UserService } from '../../../../../core/services/user.service';
import { ReceptionistPaymentsService } from '../../../../receptionist/views/payments/receptionist-payments.service';

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
  private userService = inject(UserService);
  private paymentsService = inject(ReceptionistPaymentsService);

  close = output<void>();
  membershipAdded = output<void>();

  isSubmitting = signal<boolean>(false);
  isLoadingData = signal<boolean>(true);
  error = signal<string | null>(null);

  plans = signal<MembershipPlan[]>([]);
  isSearching = signal<boolean>(false);
  foundUser = signal<any | null>(null);
  isNewMember = signal<boolean>(false);

  membershipForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    id_plan: ['', Validators.required],
    subscribe_date: [new Date().toISOString().split('T')[0], [Validators.required, this.futureDateValidator]],
    // New member fields
    first_name: [''],
    last_name: [''],
    phone: [''],
    password: ['']
  });

  calculatedExpiryDate = signal<string | null>(null);
  todayDate = new Date().toISOString().split('T')[0];

  ngOnInit() {
    this.loadPlans();

    // Watch for email changes to lookup existing users
    this.membershipForm.get('email')?.valueChanges.subscribe(email => {
      if (this.membershipForm.get('email')?.valid) {
        this.lookupUser(email!);
      } else {
        this.foundUser.set(null);
      }
    });

    // Watch for changes to update preview
    this.membershipForm.valueChanges.subscribe(() => {
      this.updateExpiryPreview();
    });
  }

  loadPlans() {
    const gymId = this.authService.connectedGymId();
    if (gymId) {
      this.isLoadingData.set(true);
      this.planService.getPlans(gymId.toString()).pipe(
        finalize(() => this.isLoadingData.set(false))
      ).subscribe({
        next: (res) => {
          this.plans.set(res.data || res || []);
        },
        error: (err) => console.error('Failed to load plans', err)
      });
    }
  }

  updateExpiryPreview() {
    const formValue = this.membershipForm.value;
    if (!formValue.id_plan || !formValue.subscribe_date) {
      this.calculatedExpiryDate.set(null);
      return;
    }

    const selectedPlan = this.plans().find(p => p.id === formValue.id_plan);
    const durationDays = selectedPlan?.duration_days || 30;
    const enrollmentDate = new Date(formValue.subscribe_date);

    if (isNaN(enrollmentDate.getTime())) {
      this.calculatedExpiryDate.set(null);
      return;
    }

    const expiryDate = new Date(enrollmentDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    this.calculatedExpiryDate.set(expiryDate.toISOString().split('T')[0]);
  }

  lookupUser(email: string) {
    if (!email) return;

    this.isSearching.set(true);
    this.error.set(null);
    this.foundUser.set(null);

    this.userService.findUserByEmail(email).pipe(
      finalize(() => this.isSearching.set(false))
    ).subscribe({
      next: (res) => {
        this.foundUser.set(res.data);
      },
      error: (err) => {
        console.log('User not found by email');
      }
    });
  }

  toggleCreationMode() {
    this.isNewMember.update(val => !val);
    const newUserFields = ['first_name', 'last_name', 'phone', 'password'];
    
    if (this.isNewMember()) {
      newUserFields.forEach(f => {
        if (f === 'phone') {
          this.membershipForm.get(f)?.setValidators([Validators.required, Validators.pattern(/^\d{8}$/)]);
        } else {
          this.membershipForm.get(f)?.setValidators([Validators.required]);
        }
      });
      this.foundUser.set(null);
    } else {
      newUserFields.forEach(f => this.membershipForm.get(f)?.clearValidators());
    }
    
    newUserFields.forEach(f => this.membershipForm.get(f)?.updateValueAndValidity());
    this.error.set(null);
  }

  onSubmit() {
    const gymId = this.authService.connectedGymId();

    if (!gymId) {
      this.error.set('No active gym context found.');
      return;
    }

    if (!this.isNewMember() && !this.foundUser()) {
      this.error.set('Please identify a member by email first.');
      return;
    }

    if (this.membershipForm.invalid) {
      this.error.set('Please fill in all required fields correctly.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const formValue = this.membershipForm.getRawValue();

    // Status calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enrollmentDate = new Date(formValue.subscribe_date || new Date().toISOString());
    enrollmentDate.setHours(0, 0, 0, 0);

    const selectedPlan = this.plans().find(p => p.id === formValue.id_plan);
    const durationDays = selectedPlan?.duration_days || 30;
    const expiryDate = new Date(enrollmentDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    let calculatedStatus = 'active';
    if (enrollmentDate > today) {
      calculatedStatus = 'pending';
    } else if (expiryDate < today) {
      calculatedStatus = 'expired';
    }

    const amount = selectedPlan?.price || 0;

    if (this.isNewMember()) {
      const newUserData = {
        name: formValue.first_name,
        last_name: formValue.last_name,
        email: formValue.email,
        phone: formValue.phone,
        role: 'member',
        password: formValue.password || 'password123',
        creation_date: new Date().toISOString().split('T')[0]
      };

      this.userService.createUser(newUserData).pipe(
        switchMap((res: any) => {
          const userId = res.data?.id_user || res.id_user;
          const payload = {
            id_member: userId,
            id_gym: gymId,
            status: calculatedStatus,
            id_plan: formValue.id_plan,
            enrollment_date: formValue.subscribe_date
          };
          return this.membershipService.addMembership(payload).pipe(
            switchMap(() => this.paymentsService.create({
              member_id: userId,
              id_gym: gymId.toString(),
              amount: amount,
              gateway: 'cash',
              category: 'membership'
            }))
          );
        }),
        finalize(() => this.isSubmitting.set(false))
      ).subscribe({
        next: () => {
          this.membershipAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Creation failed. Verify details.');
        }
      });
    } else {
      const memberId = this.foundUser().id_user;
      const payload = {
        id_member: memberId,
        id_gym: gymId,
        status: calculatedStatus,
        id_plan: formValue.id_plan,
        enrollment_date: formValue.subscribe_date
      };

      this.membershipService.addMembership(payload).pipe(
        switchMap(() => this.paymentsService.create({
          member_id: memberId,
          id_gym: gymId.toString(),
          amount: amount,
          gateway: 'cash',
          category: 'membership'
        })),
        finalize(() => this.isSubmitting.set(false))
      ).subscribe({
        next: () => {
          this.membershipAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to enroll member.');
        }
      });
    }
  }

  private futureDateValidator(control: any) {
    if (!control.value) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(control.value);
    selectedDate.setHours(0, 0, 0, 0);

    return selectedDate >= today ? null : { pastDate: true };
  }

  openPicker(event: any) {
    try {
      event.target.showPicker();
    } catch (e) {
      console.log('showPicker not supported');
    }
  }
}
