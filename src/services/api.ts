import { Order, MenuItem, OrderStatus, PaymentConfig, Table } from '../types';
import { MENU_ITEMS } from '../data';

/**
 * HYBRID API SERVICE
 * Connects to Node.js /api when live, or falls back to localStorage during development.
 */

const API_BASE = '/api';

// Helper to determine if we are in local development without a backend
const isLive = async () => {
  try {
    const res = await fetch(`${API_BASE}/init`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
};

// Simulated DB logic for local fallback
const getLocal = (key: string, fallback: any) => {
  const data = localStorage.getItem(`beehive_db_${key}`);
  return data ? JSON.parse(data) : fallback;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(`beehive_db_${key}`, JSON.stringify(data));
};

export const BeeHiveAPI = {
  async getInitData(): Promise<{ 
    orders: Order[], 
    menu: MenuItem[], 
    categories: string[], 
    tables: Table[], 
    paymentConfig: PaymentConfig 
  }> {
    try {
      const res = await fetch(`${API_BASE}/init`);
      if (!res.ok) throw new Error();
      return res.json();
    } catch {
      // Fallback to local storage for preview/development
      return {
        orders: getLocal('orders', []),
        menu: getLocal('menu', MENU_ITEMS),
        categories: getLocal('categories', ['Burgers', 'Chicken', 'Rice', 'Drinks', 'Desserts', 'Snacks']),
        tables: getLocal('tables', Array.from({ length: 20 }, (_, i) => ({ id: (i + 1).toString(), isOccupied: false }))),
        paymentConfig: getLocal('settings', { eWalletNumber: '09123456789', qrCodeUrl: '...', staffPin: 'staff123', adminPin: 'admin123' })
      };
    }
  },

  async createOrder(orderData: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!res.ok) throw new Error();
      return res.json();
    } catch {
      const orders = getLocal('orders', []);
      const newOrder = { 
        ...orderData, 
        id: Math.random().toString(36).substr(2, 9).toUpperCase(), 
        timestamp: Date.now(), 
        status: 'Pending' 
      };
      const updated = [newOrder, ...orders];
      setLocal('orders', updated);
      
      if (orderData.orderType === 'Dine-in' && orderData.tableNumber) {
        const tables = getLocal('tables', []);
        setLocal('tables', tables.map((t: any) => t.id === orderData.tableNumber ? { ...t, isOccupied: true } : t));
      }
      return newOrder;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
    } catch {
      const orders = getLocal('orders', []);
      const order = orders.find((o: any) => o.id === orderId);
      const updated = orders.map((o: any) => o.id === orderId ? { ...o, status } : o);
      setLocal('orders', updated);

      if ((status === 'Completed' || status === 'Cancelled') && order?.tableNumber) {
        const tables = getLocal('tables', []);
        setLocal('tables', tables.map((t: any) => t.id === order.tableNumber ? { ...t, isOccupied: false } : t));
      }
    }
  },

  async saveMenuItem(item: MenuItem): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error();
    } catch {
      const menu = getLocal('menu', MENU_ITEMS);
      const exists = menu.find((i: any) => i.id === item.id);
      const updated = exists ? menu.map((i: any) => i.id === item.id ? item : i) : [...menu, item];
      setLocal('menu', updated);
    }
  },

  async deleteMenuItem(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE' });
    } catch {
      const menu = getLocal('menu', MENU_ITEMS);
      setLocal('menu', menu.filter((i: any) => i.id !== id));
    }
  },

  async addCategory(category: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
    } catch {
      const cats = getLocal('categories', ['Burgers', 'Chicken', 'Rice', 'Drinks', 'Desserts', 'Snacks']);
      if (!cats.includes(category)) setLocal('categories', [...cats, category]);
    }
  },

  async updatePaymentConfig(config: PaymentConfig): Promise<void> {
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch {
      setLocal('settings', config);
    }
  },

  async updateTableStatus(tableId: string, isOccupied: boolean): Promise<void> {
    try {
      await fetch(`${API_BASE}/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOccupied })
      });
    } catch {
      const tables = getLocal('tables', []);
      setLocal('tables', tables.map((t: any) => t.id === tableId ? { ...t, isOccupied } : t));
    }
  }
};
