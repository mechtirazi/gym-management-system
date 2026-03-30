import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-member-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-header.component.html',
  styleUrl: './member-header.component.scss'
})
export class MemberHeaderComponent {
  title = input<string>('Manage Members');
  subtitle = input<string>('Manage your gym members and enrollment status');
  buttonText = input<string>('Add Member');
  addClick = output<void>();
}
