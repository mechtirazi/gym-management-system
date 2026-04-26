import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';

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
  myGyms = input<any[]>([]);
  connectedGymId = input<string | number>(0);
  gymStatus = input<string>('');

  onToggleEdit = output<void>();
  onSave = output<void>();
  onSwitchGym = output<any>();
  onCoverFotoSelected = output<File>();

  showSwitcher = false;
  imageError = false;

  onHandleImageError() {
    console.error('Logo image failed to load, falling back to initials.');
    this.imageError = true;
  }

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
    return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
  }

  getImageUrl(path?: string): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }

  toggleSwitcher() {
    this.showSwitcher = !this.showSwitcher;
  }

  selectGym(gym: any) {
    this.onSwitchGym.emit(gym);
    this.showSwitcher = false;
  }
}
