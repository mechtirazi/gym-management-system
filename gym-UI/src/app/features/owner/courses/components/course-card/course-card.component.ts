import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';

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

  get courseImage(): string | null {
    const c = this.course();
    return c.image_url || c.image || c.picture || c.logo || c.logo_url || null;
  }

  getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }
}
