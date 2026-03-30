import { Component, inject, output, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OwnerDashboardService } from '../../../services/owner-dashboard.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-add-member-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-member-modal.html',
  styleUrl: './add-member-modal.scss'
})
export class AddMemberModalComponent {
  private dashboardService = inject(OwnerDashboardService);
  private fb = inject(FormBuilder);

  isOpen = input<boolean>(false);
  onClose = output<void>();
  memberAdded = output<void>();

  isSubmitting = signal<boolean>(false);
  memberForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  closeModal() {
    this.onClose.emit();
  }

  submitAddMember() {
    if (this.memberForm.invalid) return;

    this.isSubmitting.set(true);
    this.dashboardService.addMember(this.memberForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.memberAdded.emit();
          this.closeModal();
        },
        error: (err) => {
          console.error('Failed to add member', err);
          alert('Failed to add member directly to backend');
        }
      });
  }
}
