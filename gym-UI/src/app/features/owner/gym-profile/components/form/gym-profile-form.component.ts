import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-gym-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gym-profile-form.component.html',
  styleUrl: './gym-profile-form.component.scss'
})
export class GymProfileFormComponent {
  formGroup = input.required<FormGroup>();
  isEditing = input<boolean>(false);
}
