import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Stats {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

@Component({
  selector: 'app-member-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-stats.component.html',
  styleUrl: './member-stats.component.scss'
})
export class MemberStatsComponent {
  data = input.required<Stats>();
}
