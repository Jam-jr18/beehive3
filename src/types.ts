
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  accentColor?: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'E-Wallet';

export type OrderType = 'Dine-in' | 'Take-out';

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentSender?: string;
  timestamp: number;
  customerName: string;
  tableNumber?: string;
}

export interface PaymentConfig {
  eWalletNumber: string;
  qrCodeUrl: string;
  staffPin: string;
  adminPin: string;
}

export interface Table {
  id: string;
  isOccupied: boolean;
}

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  popularItems: { name: string; count: number }[];
}
