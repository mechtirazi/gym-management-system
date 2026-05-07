import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminOwnersService } from '../../../../core/services/admin-owners.service';

@Component({
  selector: 'app-gym-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './gym-dialog.component.html',
  styleUrl: './gym-dialog.component.scss'
})
export class GymDialogComponent {
  private fb = inject(FormBuilder);
  private ownersService = inject(AdminOwnersService);
  private dialogRef = inject(MatDialogRef<GymDialogComponent>);

  // Predefined Prices - Moved to top and made readonly to prevent ExpressionChanged error
  readonly subscriptionTiers = [
    { id: 'monthly', name: 'Monthly Activation', price: 49.99, duration: '30 Days' },
    { id: 'semester', name: 'Semestrial Pack', price: 239.94, duration: '6 Months' },
    { id: 'yearly', name: 'Yearly License', price: 359.88, duration: '12 Months' }
  ];

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  gymForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    adress: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
    capacity: [100, [Validators.required, Validators.min(1)]],
    open_mon_fri_start: ['08:00', [Validators.required]],
    open_mon_fri_end: ['22:00', [Validators.required]],
    open_sat_start: ['08:00', [Validators.required]],
    open_sat_end: ['20:00', [Validators.required]],
    open_sun_start: ['08:00', [Validators.required]],
    open_sun_end: ['16:00', [Validators.required]],
    platform_subscription_type: ['monthly', Validators.required],
    platform_subscription_price: [49.99, [Validators.required, Validators.min(0)]]
  });

  selectTier(tier: any) {
    this.gymForm.patchValue({
      platform_subscription_type: tier.id,
      platform_subscription_price: tier.price
    });
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: { ownerId: number | string; ownerName: string }) { }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.gymForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const formValues = this.gymForm.value;

    const payload = {
      name: formValues.name,
      email: formValues.email,
      description: formValues.description,
      adress: formValues.adress,
      phone: formValues.phone,
      capacity: formValues.capacity,
      open_mon_fri: `${formValues.open_mon_fri_start}-${formValues.open_mon_fri_end}`,
      open_sat: `${formValues.open_sat_start}-${formValues.open_sat_end}`,
      open_sun: `${formValues.open_sun_start}-${formValues.open_sun_end}`,
      platform_subscription_price: formValues.platform_subscription_price,
      id_owner: this.data.ownerId,
      platform_subscription_type: formValues.platform_subscription_type
    };

    this.ownersService.createGymForOwner(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.dialogRef.close(true); // Signal success
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create gym. Please try again.');
      }
    });
  }
}
