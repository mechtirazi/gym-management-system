export interface Membership {
  id_subscribe: string;
  status: string;
  subscribe_date: string;
  user?: {
    name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  gym?: {
    name: string;
  };
  [key: string]: any;
}
