export interface Product {
  id_product: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  imageUrl?: string;
  discount_percentage?: number;
  discounted_price?: number;
  created_at?: string;
}

export interface Order {
  id_order: string;
  order_date: string;
  status: string;
  total_amount: number;
  id_member: string;
  member?: {
    name: string;
    last_name: string;
  };
  products?: Product[];
  created_at?: string;
}
