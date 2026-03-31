import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../shared/models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  product = input.required<Product>();
  /** When false, hide add-to-catalog actions (delete/edit); sales actions stay visible. */
  allowInventoryEdit = input<boolean>(true);
  deleteClick = output<string>();
  editClick = output<Product>();
  ordersClick = output<Product>();
  addOrderClick = output<Product>();
}
