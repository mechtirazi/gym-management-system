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

  close = output<void>();
  membershipAdded = output<void>();

  isSubmitting = signal<boolean>(false);
  isLoadingData = signal<boolean>(true);
  error = signal<string | null>(null);

  members = signal<any[]>([]);
  plans = signal<MembershipPlan[]>([]);
  isNewMember = signal<boolean>(false);
  isCreatingUser = signal<boolean>(false);

  membershipForm = this.fb.group({
    id_user: ['', Validators.required],
    status: ['active', Validators.required],
    id_plan: ['', Validators.required],
    subscribe_date: [new Date().toISOString().split('T')[0], Validators.required],
    // New member fields
    first_name: [''],
    last_name: [''],
    email: [''],
    phone: [''],
    password: ['']
  });

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoadingData.set(true);
    
    this.membershipService.getSubscribers().pipe(
      finalize(() => this.isLoadingData.set(false))
    ).subscribe({
      next: (res) => {
        console.log('Subscribers list fetched:', res);
        const subscribers = res.data || (Array.isArray(res) ? res : []);
        // Get the actual user objects from the subscriptions and filter out any invalid entries
        const mems = subscribers
          .map((s: any) => s.user)
          .filter((u: any) => u && u.id_user);
        
        console.log('Filtered subscribers:', mems);
        this.members.set(mems);
      },
      error: (err) => {
        console.error('Failed to load subscribers', err);
        this.error.set('Failed to fetch subscribers. Falling back to all users...');
        // Fallback to all users if subscribers fail
        this.membershipService.getUsers().subscribe(res => {
          const users = res.data || (Array.isArray(res) ? res : []);
          this.members.set(users.filter((u: any) => u.role === 'member'));
        });
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

  toggleCreationMode() {
    this.isNewMember.update(val => !val);
    const idUserCtrl = this.membershipForm.get('id_user');
    const newUserFields = ['first_name', 'last_name', 'email', 'phone'];

    if (this.isNewMember()) {
      idUserCtrl?.clearValidators();
      newUserFields.forEach(f => this.membershipForm.get(f)?.setValidators([Validators.required]));
    } else {
      idUserCtrl?.setValidators([Validators.required]);
      newUserFields.forEach(f => this.membershipForm.get(f)?.clearValidators());
    }
    idUserCtrl?.updateValueAndValidity();
    newUserFields.forEach(f => this.membershipForm.get(f)?.updateValueAndValidity());
    this.membershipForm.get('password')?.setValidators(this.isNewMember() ? [Validators.required, Validators.minLength(6)] : []);
    this.membershipForm.get('password')?.updateValueAndValidity();
    this.error.set(null);
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
    
    // Dynamic Status Calculation logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enrollmentDate = new Date(formValue.subscribe_date);
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

    if (this.isNewMember()) {
      this.isSubmitting.set(true);
      this.isCreatingUser.set(true);
      
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
          this.isCreatingUser.set(false);
          const userId = res.data?.id_user || res.id_user;
          const payload = {
            id_member: userId,
            id_gym: gymId,
            status: calculatedStatus,
            id_plan: formValue.id_plan,
            enrollment_date: formValue.subscribe_date
          };
          return this.membershipService.addMembership(payload);
        }),
        finalize(() => {
          this.isSubmitting.set(false);
          this.isCreatingUser.set(false);
        })
      ).subscribe({
        next: () => {
          this.membershipAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Failed in multi-step creation', err);
          this.error.set(err.error?.message || 'Process failed. Please verify details.');
        }
      });
    } else {
      const payload = {
        id_member: formValue.id_user,
        id_gym: gymId,
        status: calculatedStatus,
        id_plan: formValue.id_plan,
        enrollment_date: formValue.subscribe_date
      };

      this.membershipService.addMembership(payload)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => {
            this.membershipAdded.emit();
            this.close.emit();
          },
          error: (err) => {
            console.error('Failed to add membership', err);
            this.error.set(err.error?.message || 'Failed to create membership.');
          }
        });
    }
  }
}
