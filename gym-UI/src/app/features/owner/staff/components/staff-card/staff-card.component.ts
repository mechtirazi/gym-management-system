import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffMember } from '../../../../../shared/models/staff-member.model';

@Component({
  selector: 'app-staff-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-card.component.html',
  styleUrl: './staff-card.component.scss'
})
export class StaffCardComponent {
  member = input.required<StaffMember>();
  
  viewProfile = output<StaffMember>();
  editStaff = output<StaffMember>();
  deleteStaff = output<string>();

  onViewProfile() {
    this.viewProfile.emit(this.member());
  }

  onEdit() {
    this.editStaff.emit(this.member());
  }

  onDelete() {
    if (this.member().id) {
      this.deleteStaff.emit(this.member().id!);
    }
  }
}
