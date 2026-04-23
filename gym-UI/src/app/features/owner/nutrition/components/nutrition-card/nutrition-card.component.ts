import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NutritionPlan } from '../../../../../shared/models/nutrition.model';

@Component({
  selector: 'app-nutrition-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nutrition-card.component.html',
  styleUrl: './nutrition-card.component.scss'
})
export class NutritionCardComponent {
  plan = input.required<NutritionPlan>();
  readonly = input<boolean>(false);
  deleteClick = output<string>();
  editClick = output<NutritionPlan>();
}
