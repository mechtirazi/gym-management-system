import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '../../../../../shared/models/course.model';

@Component({
  selector: 'app-trainer-course-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trainer-course-details.html',
  styleUrl: './trainer-course-details.scss',
})
export class TrainerCourseDetailsComponent {
  @Input() course: Course | null = null;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
