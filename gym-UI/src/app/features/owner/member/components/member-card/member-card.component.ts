import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GymMember } from '../../../../../shared/models/gym-member.model';

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-card.component.html',
  styleUrl: './member-card.component.scss'
})
export class MemberCardComponent {
  member = input.required<GymMember>();
  profileClick = output<string>();
  editMember = output<GymMember>();
  removeClick = output<string>();
}
