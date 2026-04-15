export interface Gym {
  id?: string | number;
  id_gym?: string | number;
  name: string;
  id_owner?: string | number;
  email?: string;
  phone?: string;
  adress?: string;
  description?: string;
  picture?: string;
  [key: string]: any;
}
