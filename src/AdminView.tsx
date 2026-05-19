import React, { useState } from 'react';
import { useApp } from './store';
import { MenuItem } from './types';
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  ShoppingBag, Plus, Edit2, Trash2, 
  QrCode, Palette, Save, X, Image as ImageIcon,
  LayoutGrid, LayoutList, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';

export const AdminView: React.FC = () => {
  const { 
    orders, menu, categories: dbCategories, addCategory, saveMenuItem, deleteMenuItem, 
    paymentConfig, updatePaymentConfig, tables, toggleTable 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'Analytics' | 'Menu' | 'Settings'>('Analytics');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [exportPreview, setExportPreview] = useState<any[] | null>(null);
  const [exportRange, setExportRange] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All'>('All');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const itemCounts: Record<string, number> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Time-based filtering logic
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const dailyOrders = completedOrders.filter(o => o.timestamp >= startOfDay);
  const monthlyOrders = completedOrders.filter(o => o.timestamp >= startOfMonth);
  const yearlyOrders = completedOrders.filter(o => o.timestamp >= startOfYear);

  const getSalesStats = (orderList: any[]) => {
    const revenue = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const itemCounts: Record<string, number> = {};
    const catSales: Record<string, number> = {};

    orderList.forEach(order => {
      if (order && order.items) {
        order.items.forEach((item: any) => {
          const category = item.category || 'Uncategorized';
          catSales[category] = (catSales[category] || 0) + (item.price * item.quantity);
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      }
    });

    return { revenue, orders: orderList.length, catSales };
  };

  const dailyStats = getSalesStats(dailyOrders);
  const monthlyStats = getSalesStats(monthlyOrders);
  const yearlyStats = getSalesStats(yearlyOrders);

  const stats = [
    { label: 'Today Sales', value: `₱${dailyStats.revenue.toLocaleString()}`, icon: <DollarSign className="text-green-600" />, bg: 'bg-green-50' },
    { label: 'Monthly Sales', value: `₱${monthlyStats.revenue.toLocaleString()}`, icon: <TrendingUp className="text-blue-600" />, bg: 'bg-blue-50' },
    { label: 'Yearly Sales', value: `₱${yearlyStats.revenue.toLocaleString()}`, icon: <BarChart3 className="text-purple-600" />, bg: 'bg-purple-50' },
    { label: 'Total Volume', value: completedOrders.length, icon: <ShoppingBag className="text-orange-600" />, bg: 'bg-orange-50' },
  ];

  const categorySales: Record<string, number> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      categorySales[item.category] = (categorySales[item.category] || 0) + (item.price * item.quantity);
    });
  });

  const revenueCategories = Object.entries(categorySales).sort((a, b) => b[1] - a[1]);
  const maxCategorySale = Math.max(...Object.values(categorySales), 1);

  const handleExportClick = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    const filtered = orders.filter(order => {
      if (exportRange === 'All') return true;
      const diff = now - order.timestamp;
      if (exportRange === 'Daily') return diff <= oneDay;
      if (exportRange === 'Weekly') return diff <= oneWeek;
      if (exportRange === 'Monthly') return diff <= oneMonth;
      if (exportRange === 'Yearly') return diff <= oneYear;
      return true;
    });

    const data = filtered.map(order => ({
      id: order.id,
      date: new Date(order.timestamp).toLocaleDateString(),
      time: new Date(order.timestamp).toLocaleTimeString(),
      customer: order.customerName,
      type: order.orderType,
      total: order.total,
      status: order.status,
      payment: order.paymentMethod,
      timestamp: order.timestamp
    }));
    setExportPreview(data);
  };

  const confirmDownload = () => {
    if (!exportPreview) return;
    
    // We need to match the original orders again or use the preview data
    const filteredOrders = orders.filter(o => exportPreview.some(p => p.id === o.id));

    const headers = ['Order ID', 'Date', 'Time', 'Customer', 'Type', 'Items', 'Total', 'Payment Method', 'Reference', 'Sender', 'Status'];
    const rows = filteredOrders.map(order => [
      order.id,
      new Date(order.timestamp).toLocaleDateString(),
      new Date(order.timestamp).toLocaleTimeString(),
      order.customerName,
      order.orderType,
      order.items.map(i => `${i.quantity}x ${i.name}`).join(' | '),
      order.total,
      order.paymentMethod,
      order.paymentReference || 'N/A',
      order.paymentSender || 'N/A',
      order.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BeeHive_Sales_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportPreview(null);
  };

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get the base64 image from the hidden input
    const imageBase64 = formData.get('image') as string;
    
    const itemData: MenuItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
      category: formData.get('category') as MenuItem['category'],
      description: formData.get('description') as string,
      image: imageBase64 || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300&h=300',
      accentColor: formData.get('accentColor') as string,
    };

    saveMenuItem(itemData);
    
    // Visual feedback
    alert(`Success: "${itemData.name}" has been saved to the menu!`);
    
    setEditingItem(null);
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 lg:pb-0">
      <header className="bg-indigo-900 text-white p-6 sticky top-0 z-20 shadow-lg">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 size={32} className="text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold italic">BeeHive Admin</h1>
              <p className="text-indigo-200 text-xs tracking-widest uppercase">Management Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center bg-indigo-800/40 rounded-xl p-1 border border-indigo-700/50">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly', 'All'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setExportRange(range)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                    exportRange === range ? "bg-green-500 text-white shadow-lg" : "text-indigo-300 hover:text-white"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={handleExportClick}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              <Download size={16} /> Export {exportRange !== 'All' ? exportRange : ''} Sales
            </button>
            <nav className="flex bg-indigo-800/50 p-1 rounded-xl">
              {(['Analytics', 'Menu', 'Settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === tab ? "bg-white text-indigo-900 shadow-md" : "text-indigo-100 hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 flex-grow">
        {activeTab === 'Analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={stat.label} 
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"
                >
                  <div className={`p-4 rounded-2xl ${stat.bg}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Detailed Breakdown for Today */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-lg">Today's Split</h3>
                  <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                    <LayoutGrid size={20} />
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(dailyStats.catSales).length > 0 ? (
                    Object.entries(dailyStats.catSales).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, amount]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                          <span>{cat}</span>
                          <span className="text-slate-900">₱{amount.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(amount / dailyStats.revenue) * 100}%` }}
                            className="h-full bg-yellow-500"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-slate-300 italic text-sm">No sales today</div>
                  )}
                </div>
              </div>

              {/* Revenue Stream Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800 text-lg">Sales Revenue Stream</h3>
                  <Users size={20} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedOrders.slice(0, 10).map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-indigo-600">{order.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-700">{order.customerName}</div>
                            <div className="text-[10px] text-gray-400">{new Date(order.timestamp).toLocaleDateString()} at {new Date(order.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded uppercase">{order.paymentMethod}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">₱{order.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Popular Items Breakdown */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h3 className="font-bold text-gray-800 text-lg flex justify-between items-center">
                  Top Favorites
                  <TrendingUp size={20} className="text-indigo-400" />
                </h3>
                <div className="space-y-4">
                  {popularItems.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">{idx + 1}</div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold text-slate-700">{item.name}</span>
                          <span className="text-[10px] font-black text-indigo-600 uppercase">{item.count} Sold</span>
                        </div>
                        <div className="h-1 w-full bg-slate-50 rounded-full mt-1">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.count / popularItems[0].count) * 100}%` }}
                            className="h-full bg-indigo-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {popularItems.length === 0 && <div className="py-10 text-center text-slate-300 italic text-sm">No data yet</div>}
                </div>
              </div>

              {/* All-Time Category Chart */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <h3 className="font-bold text-gray-800 text-lg mb-6 flex justify-between items-center">
                  Lifetime Revenue by Category
                  <TrendingUp size={20} className="text-gray-400" />
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {revenueCategories.map(([cat, amount]) => (
                    <div key={cat} className="flex flex-col items-center gap-2">
                      <div className="w-full flex-grow flex items-end justify-center min-h-[100px] gap-1">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${(amount / maxCategorySale) * 100}%` }}
                          className="w-full bg-indigo-500 rounded-t-2xl shadow-inner max-w-[60px]"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{cat}</p>
                        <p className="font-bold text-gray-800 text-sm">₱{amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {revenueCategories.length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-400 italic">No category data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <LayoutGrid /> Menu Management
              </h2>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Plus size={20} /> Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menu.map(item => (
                <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
                  <div className="h-40 relative">
                    <img src={item.image} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="p-3 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform shadow-xl"
                        title="Edit Item"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                            deleteMenuItem(item.id);
                          }
                        }}
                        className="p-3 bg-white text-red-500 rounded-full hover:scale-110 transition-transform shadow-xl"
                        title="Delete Item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{item.category}</span>
                        <h4 className="font-bold text-gray-800" style={item.accentColor ? { color: item.accentColor } : {}}>{item.name}</h4>
                      </div>
                      <span className="font-bold text-indigo-900">₱{item.price}</span>
                    </div>
                    {item.accentColor && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.accentColor }} />
                        <span className="text-[10px] font-medium text-gray-400">Custom Accent</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Settings */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
              <div className="flex items-center gap-4 border-b pb-6">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <QrCode size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Payment Gateway</h3>
                  <p className="text-sm text-gray-500">Configure your e-wallet and QR code</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-Wallet Number</label>
                      <input 
                        className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold text-gray-700"
                        value={paymentConfig.eWalletNumber}
                        onChange={(e) => updatePaymentConfig({ ...paymentConfig, eWalletNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload QR Code</label>
                      <input 
                        type="file"
                        accept="image/*"
                        className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none text-sm text-gray-500"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updatePaymentConfig({ ...paymentConfig, qrCodeUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Security PIN Settings */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Staff Portal PIN</label>
                      <input 
                        type="password"
                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold"
                        value={paymentConfig.staffPin}
                        onChange={(e) => updatePaymentConfig({ ...paymentConfig, staffPin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Admin Management PIN</label>
                      <input 
                        type="password"
                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold"
                        value={paymentConfig.adminPin}
                        onChange={(e) => updatePaymentConfig({ ...paymentConfig, adminPin: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-indigo-50 rounded-[32px] border-2 border-dashed border-indigo-200">
                    <img src={paymentConfig.qrCodeUrl} className="w-40 h-40 bg-white p-2 rounded-2xl shadow-xl mb-4" />
                    <p className="text-xs font-bold text-indigo-600">PREVIEW ON CUSTOMER APP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Settings */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 border-b pb-6 mb-8">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                  <LayoutList size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Table Management</h3>
                  <p className="text-sm text-gray-500">Manual override for table availability</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => toggleTable(table.id, !table.isOccupied)}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                      table.isOccupied 
                        ? "bg-red-50 border-red-200 text-red-600" 
                        : "bg-green-50 border-green-200 text-green-600"
                    )}
                  >
                    <span className="text-lg font-black">{table.id}</span>
                    <span className="text-[8px] font-bold uppercase">{table.isOccupied ? 'FULL' : 'OPEN'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Preview Modal */}
      <AnimatePresence>
        {exportPreview && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExportPreview(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-10 md:bottom-10 md:w-[800px] bg-white z-[70] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b flex justify-between items-center bg-green-50">
                <div>
                  <h3 className="text-2xl font-black text-green-900 flex items-center gap-2">
                    <Download /> Data Export Preview
                  </h3>
                  <p className="text-green-600 text-xs font-bold uppercase tracking-widest mt-1">Review your sales data before downloading</p>
                </div>
                <button onClick={() => setExportPreview(null)} className="p-2 hover:bg-green-100 rounded-full transition-colors"><X /></button>
              </div>

              <div className="flex-grow overflow-auto p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0 font-black text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Date/Time</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {exportPreview.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-[10px] text-green-600 font-bold">{row.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold">{row.date}</div>
                          <div className="text-[10px] text-gray-400">{row.time}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">{row.customer}</td>
                        <td className="px-6 py-4">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", row.type === 'Dine-in' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800">₱{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 border-t bg-gray-50 flex gap-4">
                <button 
                  onClick={() => setExportPreview(null)}
                  className="flex-grow bg-white border-2 border-slate-200 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDownload}
                  className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                >
                  <Download size={20} /> Download CSV Report
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Item Modal (Add/Edit) */}
      <AnimatePresence>
        {(editingItem || isAdding) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingItem(null); setIsAdding(false); }}
              className="fixed inset-0 bg-indigo-900/60 backdrop-blur-md z-40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-10 bottom-10 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white z-50 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-2xl font-black text-indigo-900">
                  {editingItem ? 'Edit Specialty' : 'New Hive Delight'}
                </h3>
                <button onClick={() => { setEditingItem(null); setIsAdding(false); }} className="p-2 hover:bg-gray-200 rounded-full">
                  <X />
                </button>
              </div>

              <form id="menuItemForm" onSubmit={handleSaveItem} className="flex-grow overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Display Name</label>
                    <input name="name" required defaultValue={editingItem?.name} className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex justify-between">
                      Category
                      <button 
                        type="button" 
                        onClick={() => setShowAddCategory(!showAddCategory)}
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black"
                      >
                        {showAddCategory ? 'CANCEL' : '+ ADD NEW'}
                      </button>
                    </label>
                    {showAddCategory ? (
                      <div className="flex gap-2">
                        <input 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category..."
                          className="flex-grow px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 ring-indigo-500 outline-none text-sm font-bold"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              addCategory(newCategoryName.trim());
                              setNewCategoryName('');
                              setShowAddCategory(false);
                            }
                          }}
                          className="bg-indigo-600 text-white px-3 rounded-xl hover:bg-indigo-700"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <select name="category" defaultValue={editingItem?.category || 'Burgers'} className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold">
                        {dbCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Price (₱)</label>
                    <input name="price" type="number" required defaultValue={editingItem?.price} className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Item Image</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <ImageIcon />
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const form = (e.target as HTMLInputElement).form;
                                if (form) (form.elements.namedItem('image') as HTMLInputElement).value = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="flex-grow px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none text-sm" 
                        />
                        <input type="hidden" name="image" defaultValue={editingItem?.image} />
                      </div>
                      {(editingItem?.image || isAdding) && (
                        <div className="text-[10px] text-gray-400 font-bold uppercase italic">Image data loaded from system</div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Accent Color (Hex)</label>
                    <div className="flex gap-4 items-center">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Palette />
                      </div>
                      <input name="accentColor" type="color" defaultValue={editingItem?.accentColor || '#eab308'} className="w-20 h-14 bg-gray-50 border rounded-2xl p-1" />
                      <input name="accentColorText" className="flex-grow px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none font-mono" placeholder="#000000" onChange={(e) => {
                        const form = e.target.form;
                        if(form) (form.elements.namedItem('accentColor') as HTMLInputElement).value = e.target.value;
                      }} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                    <textarea name="description" rows={3} defaultValue={editingItem?.description} className="w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none text-sm" />
                  </div>
                </div>
              </form>

              <div className="p-8 border-t bg-gray-50">
                <button type="submit" form="menuItemForm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                  <Save size={20} /> Save Configuration
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
