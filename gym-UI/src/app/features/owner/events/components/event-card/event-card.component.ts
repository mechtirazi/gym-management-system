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
  manageClick = output<void>();

  get eventImage(): string | null {
    const e = this.eventModel();
    return e.image_url || (e as any).image || (e as any).picture || (e as any).logo || (e as any).logo_url || null;
  }

  getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }
}
