import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventModel } from '../../../../../shared/models/event.model';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss'
})
export class EventCardComponent {
  eventModel = input.required<EventModel>();
  deleteClick = output<string>();
  editClick = output<EventModel>();
  manageClick = output<void>();
}
