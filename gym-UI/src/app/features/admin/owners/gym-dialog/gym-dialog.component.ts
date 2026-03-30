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

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  gymForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    adress: [''],
    phone: [''],
    capacity: [100, [Validators.required, Validators.min(1)]],
    open_hour: ['08:00-22:00', [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { ownerId: number | string; ownerName: string }) {}

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.gymForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.gymForm.value,
      id_owner: this.data.ownerId
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
