import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss'
})
export class CourseCardComponent {
  course = input.required<any>();
  deleteClick = output<string>();
  editClick = output<any>();
  manageClick = output<any>();

  activeSessionsCount = computed(() => {
    const sessions = this.course().sessions || [];
    return sessions.filter((s: any) => s.status !== 'cancelled').length;
  });
}
