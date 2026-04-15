import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gym-profile-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gym-profile-header.component.html',
  styleUrl: './gym-profile-header.component.scss'
})
export class GymProfileHeaderComponent {
  name = input<string>('');
  logo = input<string | null>(null);
  address = input<string>('');
  isEditing = input<boolean>(false);
  isSaving = input<boolean>(false);
  canSave = input<boolean>(true);

  onToggleEdit = output<void>();
  onSave = output<void>();

  onCoverFotoSelected = output<File>();

  onCoverChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onCoverFotoSelected.emit(input.files[0]);
    }
  }

  getInitials(name: string): string {
    if (!name) return 'GY';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }
}
