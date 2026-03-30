import { Component, input, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-membership-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership-card.component.html',
  styleUrl: './membership-card.component.scss'
})
export class MembershipCardComponent {
  membership = input.required<any>();
  cancelClick = output<string>();
  viewClick = output<any>();
  editClick = output<any>();

  isDropdownOpen = signal(false);

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen.set(false);
  }
}
