import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { UserService } from '../../../core/services/user.service';
import { MemberService } from '../../member/services/member.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private gymService = inject(GymService);
  private userService = inject(UserService);
  private memberService = inject(MemberService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;
  currentGymId = this.authService.connectedGymId;

  activeTab = signal<'profile' | 'security' | 'notifications' | 'gym'>('profile');
  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Password visibility
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  // Gym switching for owners
  myGyms = signal<GymInfo[]>([]);
  selectedFile: File | null = null;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  notificationsForm!: FormGroup;

  ngOnInit(): void {
    const user = this.currentUser();
    this.initForms(user);
    if (this.userRole() === 'owner' || this.userRole() === 'member') {
      this.fetchGyms();
    }
  }

  fetchGyms(): void {
    if (this.userRole() === 'member') {
      // For members, we want to see their enrolled gyms with subscription dates
      forkJoin({
        gyms: this.gymService.getMyGyms(),
        enrollments: this.memberService.getMyEnrollments().pipe(catchError(() => of({ data: [] })))
      }).subscribe(({ gyms, enrollments }) => {
        const enrollmentList = enrollments.data || enrollments;
        
        const enrichedGyms = gyms.map(gym => {
          const enroll = enrollmentList.find((e: any) => e.id_gym === gym.id_gym);
          if (enroll) {
            const endDate = enroll.end_date;
            if (endDate) {
              const diff = new Date(endDate).getTime() - new Date().getTime();
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              return { 
                ...gym, 
                subscription_end: endDate,
                days_remaining: Math.max(0, days)
              };
            }
          }
          return gym;
        });

        // For members, only show gyms they are enrolled in or follow?
        // Let's show all their gyms but with the subscription info
        this.myGyms.set(enrichedGyms);
      });
    } else {
      // Owners see their own gyms
      this.gymService.getMyGyms().subscribe(gyms => {
        this.myGyms.set(gyms);
      });
    }
  }

  private initForms(user: User | null): void {
    // Profile Form
    this.profileForm = this.fb.group({
      name: [user?.name || '', [Validators.required]],
      last_name: [user?.last_name || '', [Validators.required]],
      email: [{ value: user?.email || '', disabled: true }, [Validators.required, Validators.email]],
      phone: [user?.phone || ''],
      bio: [user?.bio || ''],
      career_specialties: [user?.career_specialties || ''],
    });

    // Password Form
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Notifications Form
    this.notificationsForm = this.fb.group({
      emailNotifications: [(user as any)?.notification_email ?? true],
      smsNotifications: [(user as any)?.notification_sms ?? false],
      marketingEmails: [(user as any)?.notification_marketing ?? true],
      appUpdates: [(user as any)?.notification_app_updates ?? true]
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  setTab(tab: 'profile' | 'security' | 'notifications' | 'gym'): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;
    this.isLoading.set(true);
    this.clearMessages();

    const user = this.currentUser();
    if (!user) return;

    const profileData = { ...this.profileForm.getRawValue() };
    if (this.selectedFile) {
      profileData.profile_picture = this.selectedFile;
    }

    this.userService.updateProfile(user.id_user, profileData).subscribe({
      next: (response) => {
        if (response.success) {
          this.authService.updateCurrentUser(response.data);
          this.successMessage.set('Profile updated successfully!');
          this.selectedFile = null;
        } else {
          this.errorMessage.set(response.message || 'Failed to update profile.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'An error occurred while updating profile.');
        this.isLoading.set(false);
      }
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) return;
    this.isLoading.set(true);
    this.clearMessages();

    const user = this.currentUser();
    if (!user) return;

    this.userService.changePassword(user.id_user, this.passwordForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Password changed successfully!');
          this.passwordForm.reset();
        } else {
          this.errorMessage.set(response.message || 'Failed to change password.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'An error occurred while changing password.');
        this.isLoading.set(false);
      }
    });
  }

  updateNotifications(): void {
    if (this.notificationsForm.invalid) return;
    this.isLoading.set(true);
    this.clearMessages();

    const user = this.currentUser();
    if (!user) return;

    const notifData = {
      notification_email: this.notificationsForm.value.emailNotifications,
      notification_sms: this.notificationsForm.value.smsNotifications,
      notification_marketing: this.notificationsForm.value.marketingEmails,
      notification_app_updates: this.notificationsForm.value.appUpdates
    };

    this.userService.updateProfile(user.id_user, notifData).subscribe({
      next: (response) => {
        if (response.success) {
          this.authService.updateCurrentUser(response.data);
          this.successMessage.set('Notification preferences saved!');
        } else {
          this.errorMessage.set(response.message || 'Failed to save preferences.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'An error occurred.');
        this.isLoading.set(false);
      }
    });
  }

  switchGym(gym: GymInfo): void {
    this.isLoading.set(true);
    this.authService.switchGym(gym.id_gym, gym.status, gym.suspension_reason);
    setTimeout(() => {
      this.isLoading.set(false);
      this.successMessage.set('Switched gym context successfully!');
    }, 800);
  }

  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  getAvatarUrl(path?: string): string {
    return this.authService.getAvatarUrl(path);
  }

  toggleShow(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') this.showCurrent.update(v => !v);
    if (field === 'new') this.showNew.update(v => !v);
    if (field === 'confirm') this.showConfirm.update(v => !v);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        this.errorMessage.set('File size exceeds 1MB limit.');
        return;
      }
      this.selectedFile = file;
      this.successMessage.set('Avatar selected: ' + file.name);
    }
  }
}
