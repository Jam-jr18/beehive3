import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, MenuItem, OrderItem, OrderStatus, PaymentMethod, PaymentConfig, Table, OrderType } from './types';
import { BeeHiveAPI } from './services/api';

interface AppContextType {
  orders: Order[];
  menu: MenuItem[];
  categories: string[];
  tables: Table[];
  paymentConfig: PaymentConfig;
  isLoading: boolean;
  
  // Frontend actions that call the Backend
  placeOrder: (params: {
    items: OrderItem[], 
    customerName: string, 
    tableNumber?: string, 
    paymentMethod: PaymentMethod, 
    paymentReference?: string, 
    paymentSender?: string,
    orderType: OrderType
  }) => Promise<void>;
  
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  saveMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  updatePaymentConfig: (config: PaymentConfig) => Promise<void>;
  toggleTable: (id: string, occupied: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Burgers', 'Chicken', 'Rice', 'Drinks', 'Desserts', 'Snacks']);
  const [tables, setTables] = useState<Table[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ 
    eWalletNumber: '', 
    qrCodeUrl: '',
    staffPin: 'staff123',
    adminPin: 'admin123'
  });
  const [isLoading, setIsLoading] = useState(true);

  // FETCH ALL DATA FROM "BACKEND"
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await BeeHiveAPI.getInitData();
      setOrders(data.orders);
      setMenu(data.menu);
      setTables(data.tables);
      setPaymentConfig(data.paymentConfig);
      setCategories(data.categories);
    } catch (error) {
      console.error("Backend Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Poll for updates every 5 seconds to make the tracker "Live"
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const placeOrder = async (params: any) => {
    await BeeHiveAPI.createOrder(params);
    await refreshData();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await BeeHiveAPI.updateOrderStatus(orderId, status);
    await refreshData();
  };

  const saveMenuItem = async (item: MenuItem) => {
    await BeeHiveAPI.saveMenuItem(item);
    await refreshData();
  };

  const deleteMenuItem = async (id: string) => {
    await BeeHiveAPI.deleteMenuItem(id);
    await refreshData();
  };

  const addCategory = async (category: string) => {
    await BeeHiveAPI.addCategory(category);
    await refreshData();
  };

  const updatePaymentConfig = async (config: PaymentConfig) => {
    await BeeHiveAPI.updatePaymentConfig(config);
    await refreshData();
  };

  const toggleTable = async (id: string, occupied: boolean) => {
    await BeeHiveAPI.updateTableStatus(id, occupied);
    await refreshData();
  };

  return (
    <AppContext.Provider value={{ 
      orders, menu, categories, tables, paymentConfig, isLoading,
      placeOrder, updateOrderStatus, saveMenuItem, deleteMenuItem, 
      addCategory, updatePaymentConfig, toggleTable, refreshData 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
