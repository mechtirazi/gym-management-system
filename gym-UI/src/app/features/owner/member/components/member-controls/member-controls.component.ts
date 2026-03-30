import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-controls.component.html',
  styleUrl: './member-controls.component.scss'
})
export class MemberControlsComponent {
  searchQuery = input<string>('');
  searchChange = output<string>();
  searchPlaceholder = input<string>('Search...');

  selectedStatus = input<string>('All');
  statusChange = output<string>();
  statusOptions = input<string[]>(['All Members', 'Active', 'Pending', 'Inactive']);

  onSearchChange(value: string) {
    this.searchChange.emit(value);
  }

  onStatusChange(status: string) {
    this.statusChange.emit(status);
  }
}
