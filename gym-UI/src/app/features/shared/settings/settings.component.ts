import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { UserService } from '../../../core/services/user.service';

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
    if (this.userRole() === 'owner') {
      this.fetchGyms();
    }
  }

  fetchGyms(): void {
    this.gymService.getMyGyms().subscribe(gyms => {
      this.myGyms.set(gyms);
    });
  }

  private initForms(user: User | null): void {
    // Profile Form
    this.profileForm = this.fb.group({
      name: [user?.name || '', [Validators.required]],
      last_name: [user?.last_name || '', [Validators.required]],
      email: [{ value: user?.email || '', disabled: true }, [Validators.required, Validators.email]],
      phone: [user?.phone || ''],
    });

    // Password Form
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Notifications Form
    this.notificationsForm = this.fb.group({
      emailNotifications: [true],
      smsNotifications: [false],
      marketingEmails: [true],
      appUpdates: [true]
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
    this.isLoading.set(true);
    this.clearMessages();

    setTimeout(() => {
      this.isLoading.set(false);
      this.successMessage.set('Notification preferences saved!');
    }, 1000);
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
