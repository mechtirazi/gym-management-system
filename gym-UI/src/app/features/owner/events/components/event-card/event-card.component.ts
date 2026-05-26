import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventModel } from '../../../../../shared/models/event.model';
import { environment } from '../../../../../../environments/environment';

interface IExtendedEvent extends EventModel {
  image_url?: string;
}

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss'
})
export class EventCardComponent {
  eventModel = input.required<IExtendedEvent>();
  deleteClick = output<string>();
  editClick = output<void>();
  manageClick = output<void>();

  get eventImage(): string | null {
    const e = this.eventModel();
    return e.image_url || (e as any).image || (e as any).picture || (e as any).logo || (e as any).logo_url || null;
  }

  get eventStatus(): { label: string, class: string } {
    const e = this.eventModel();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(e.end_date || e.start_date);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < today) {
      return { label: 'Finished', class: 'expired' };
    }

    if (e.max_participants > 0 && (e.attendances_count || 0) >= e.max_participants) {
      return { label: 'Full', class: 'full' };
    }

    return { label: 'Upcoming', class: 'active' };
  }

  getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '').replace(/^storage\//, '');
    return `${baseUrl}/storage/${cleanPath}`;
  }
}
