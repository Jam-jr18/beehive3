import React, { useState, useEffect } from 'react';
import { useApp } from './store';
import { MenuItem, OrderItem, PaymentMethod, OrderType } from './types';
import { ShoppingCart, Plus, Minus, X, Trash2, CheckCircle2, Clock, ClipboardList, Wallet, Banknote, Utensils, ShoppingBag, AlertTriangle, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';

const MenuCard: React.FC<{ item: MenuItem; onAdd: (item: MenuItem) => void }> = ({ item, onAdd }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-orange-100 flex flex-col h-full"
  >
    <div className="h-48 overflow-hidden relative group">
      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
      <div 
        className="absolute top-2 right-2 px-3 py-1 rounded-full font-bold shadow-sm bg-white/90 backdrop-blur-sm text-yellow-600" 
        style={item.accentColor ? { backgroundColor: item.accentColor, color: 'white' } : {}}
      >
        ₱{item.price}
      </div>
    </div>
    <div className="p-4 flex flex-col flex-grow">
      <h3 className="font-bold text-xl mb-1 text-gray-800" style={item.accentColor ? { color: item.accentColor } : {}}>{item.name}</h3>
      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description}</p>
      <button onClick={() => onAdd(item)} className="mt-auto w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
        <Plus size={20} /> Add to Order
      </button>
    </div>
  </motion.div>
);

export const CustomerView: React.FC = () => {
  const { menu, categories: dbCategories, placeOrder, tables, paymentConfig, orders, isLoading, refreshData } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isOrdered, setIsOrdered] = useState(false);
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('beehive_customer_name') || '');
  const [tableNumber, setTableNumber] = useState('');
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSender, setPaymentSender] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('Dine-in');
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('beehive_customer_name', customerName);
  }, [customerName]);

  const myOrders = orders.filter(o => o.customerName.trim().toLowerCase() === customerName.trim().toLowerCase() && customerName !== '');
  const activeOrders = myOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  const hasActiveOrders = activeOrders.length > 0;
  
  const getStatusTheme = () => {
    if (!hasActiveOrders) return { label: 'Order History', color: 'bg-slate-700', icon: <Clock size={18} /> };
    const readyOrder = activeOrders.find(o => o.status === 'Ready');
    if (readyOrder) return { label: 'READY!', color: 'bg-green-500', icon: <CheckCircle2 size={18} /> };
    const preparingOrder = activeOrders.find(o => o.status === 'Preparing');
    if (preparingOrder) return { label: 'PREPARING', color: 'bg-orange-500', icon: <div className="w-2 h-2 bg-white rounded-full animate-ping" /> };
    return { label: 'PENDING', color: 'bg-yellow-500', icon: <Clock size={18} className="animate-spin-slow" /> };
  };

  const statusTheme = getStatusTheme();
  const categories = ['All', ...dbCategories];

  const groupedMenu = dbCategories.reduce((acc, cat) => {
    const items = menu.filter(item => item.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const filteredMenu = selectedCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || cart.length === 0) return;
    if (orderType === 'Dine-in' && !tableNumber) {
      alert("Please select a table.");
      return;
    }
    if (paymentMethod === 'E-Wallet' && (!paymentReference || !paymentSender)) {
      alert("Please fill in e-wallet details (Reference and Sender Name).");
      return;
    }
    
    const orderData = {
      items: [...cart],
      customerName: customerName.trim(),
      tableNumber: orderType === 'Dine-in' ? tableNumber : undefined,
      paymentMethod,
      paymentReference: paymentMethod === 'E-Wallet' ? paymentReference : undefined,
      paymentSender: paymentMethod === 'E-Wallet' ? paymentSender.trim() : undefined,
      orderType,
      total: cartTotal,
      timestamp: Date.now()
    };

    await placeOrder(orderData);
    setLastReceipt(orderData);

    setCart([]);
    setIsOrdered(true);
    setPaymentReference('');
    setPaymentSender('');
  };

  useEffect(() => {
    if (orderType === 'Dine-in' && !tableNumber) {
      const available = tables.find(t => !t.isOccupied);
      if (available) setTableNumber(available.id);
    }
  }, [tables, tableNumber, orderType]);

  const isTableOccupied = (id: string) => tables.find(t => t.id === id)?.isOccupied;

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-0 lg:flex">
      <div className="flex-grow flex flex-col h-screen overflow-y-auto">
        <header className="bg-yellow-500 text-white p-4 sticky top-0 z-20 shadow-md">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 items-center">
            {/* Left Slot - Keep Empty for Secret Menu Trigger */}
            <div className="hidden md:block" />

            {/* Middle Slot - Centered Branding */}
            <div className="flex items-center justify-center gap-2">
              <div className="bg-white p-1 rounded-full shadow-sm">
                <img src="https://cdn-icons-png.flaticon.com/512/3249/3249911.png" alt="logo" className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black tracking-tighter italic">BeeHive Restobar</h1>
            </div>

            {/* Right Slot - Tracker Button */}
            <div className="flex justify-center md:justify-end mt-4 md:mt-0">
              {myOrders.length > 0 && (
                <button 
                  onClick={() => setShowMyOrders(true)}
                  className={cn(
                    "relative p-1.5 transition-all duration-500 flex items-center gap-3 px-5 shadow-xl rounded-full border-2 group overflow-hidden",
                    statusTheme.color,
                    "border-white/30 text-white",
                    hasActiveOrders && "animate-bounce shadow-lg"
                  )}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    {statusTheme.icon}
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[8px] font-black opacity-60 tracking-widest uppercase mb-0.5">Track Order</span>
                      <span className="text-[10px] font-black tracking-[0.15em] uppercase">Status Tracker</span>
                    </div>
                  </div>
                  
                  {hasActiveOrders && (
                    <div className="bg-white/20 px-2 py-1 rounded-lg border border-white/20 backdrop-blur-sm relative z-10">
                      <span className="text-[9px] font-black tracking-tighter uppercase whitespace-nowrap">
                        {statusTheme.label}
                      </span>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="bg-white shadow-sm sticky top-[64px] z-10">
          <div className="container mx-auto p-4 flex justify-center">
            {/* Categories Centered */}
            <div className="flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 justify-center max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all shrink-0",
                    selectedCategory === cat 
                      ? "bg-yellow-500 text-white shadow-lg scale-105" 
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="container mx-auto p-4 flex-grow space-y-12">
          {selectedCategory === 'All' ? (
            Object.entries(groupedMenu).map(([category, items]) => (
              <div key={category} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">{category}</h2>
                  <div className="h-px bg-slate-200 flex-grow" />
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{items.length} Options</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {items.map(item => (
                    <MenuCard key={item.id} item={item} onAdd={addToCart} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">{selectedCategory}</h2>
                <div className="h-1.5 bg-yellow-500 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMenu.map(item => (
                  <MenuCard key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <aside className="hidden lg:flex w-[400px] xl:w-[450px] bg-white border-l h-screen flex-col sticky top-0 shrink-0 shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-yellow-500 text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart />
            <h2 className="text-2xl font-bold italic tracking-tighter">YOUR SWARM ORDER</h2>
          </div>
        </div>

        {/* ORDER TYPE CHOICE - Primary Action */}
        <div className="p-4 bg-slate-50 border-b">
          <div className="bg-white p-1.5 rounded-3xl border-2 border-slate-100 flex shadow-sm">
            <button 
              onClick={() => setOrderType('Dine-in')}
              className={cn(
                "flex-grow py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
                orderType === 'Dine-in' ? "bg-orange-500 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Utensils size={16} /> Dine-in
            </button>
            <button 
              onClick={() => setOrderType('Take-out')}
              className={cn(
                "flex-grow py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
                orderType === 'Take-out' ? "bg-blue-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <ShoppingBag size={16} /> Take-out
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-white">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingCart size={64} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">Your hive is empty!</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                <img src={item.image} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-grow">
                  <h4 className="font-bold text-gray-800 leading-tight">{item.name}</h4>
                  <p className="text-yellow-600 font-medium">₱{item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-lg border shadow-sm">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-yellow-600"><Minus size={16} /></button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-yellow-600"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <form onSubmit={handleCheckout} className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                  <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-2 ring-yellow-500 outline-none bg-white" placeholder="Enter name" />
                </div>
                {orderType === 'Dine-in' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                      Table
                      {isTableOccupied(tableNumber) && <span className="text-red-500 flex items-center gap-1 animate-pulse"><AlertTriangle size={12} /> ALREADY OCCUPIED</span>}
                    </label>
                    <select value={tableNumber} onChange={e => setTableNumber(e.target.value)} className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 ring-yellow-500 outline-none bg-white font-bold", isTableOccupied(tableNumber) && "border-red-500 text-red-600")}>
                      {tables.map(t => (
                        <option key={t.id} value={t.id} className={t.isOccupied ? "text-red-400" : ""}>
                          Table {t.id} {t.isOccupied ? '(FULL)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment</label>
                  <div className="flex bg-white rounded-xl border p-1">
                    <button type="button" onClick={() => setPaymentMethod('Cash')} className={cn("flex-grow py-2 rounded-lg text-xs font-bold flex flex-col items-center", paymentMethod === 'Cash' ? "bg-yellow-500 text-white" : "text-gray-400")}>
                      <Banknote size={16} /> Cash
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('E-Wallet')} className={cn("flex-grow py-2 rounded-lg text-xs font-bold flex flex-col items-center", paymentMethod === 'E-Wallet' ? "bg-yellow-500 text-white" : "text-gray-400")}>
                      <Wallet size={16} /> E-Wallet
                    </button>
                  </div>
                </div>
              </div>

              {paymentMethod === 'E-Wallet' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                    <img src={paymentConfig.qrCodeUrl} className="w-20 h-20 bg-white p-1 rounded-lg border object-contain" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-indigo-400">GCash / Maya</p>
                      <p className="font-bold text-indigo-900">{paymentConfig.eWalletNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase">Sender Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={14} />
                        <input required value={paymentSender} onChange={e => setPaymentSender(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-indigo-100 rounded-lg focus:ring-2 ring-indigo-500 outline-none" placeholder="Account Name" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase">Reference Number</label>
                      <input required value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="w-full px-4 py-2 border border-indigo-100 rounded-lg focus:ring-2 ring-indigo-500 outline-none font-mono text-sm" placeholder="Ref #" />
                    </div>
                  </div>
                </motion.div>
              )}
            </form>

            <div className="flex justify-between items-center text-2xl font-black mb-4 px-2 text-yellow-600">
              <span className="text-gray-600">Total</span>
              <span>₱{cartTotal.toLocaleString()}</span>
            </div>
            <button disabled={!customerName || (orderType === 'Dine-in' && !tableNumber) || isTableOccupied(tableNumber)} onClick={handleCheckout} className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-lg">
              Confirm Order
            </button>
          </div>
        )}
      </aside>

      {/* Success & Receipt Modal */}
      <AnimatePresence>
        {isOrdered && lastReceipt && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }} 
              animate={{ y: 0, scale: 1 }} 
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="bg-yellow-500 p-8 text-center text-white relative">
                <CheckCircle2 size={56} className="mx-auto mb-4 drop-shadow-md" />
                <h3 className="text-3xl font-black italic">BUZZING SUCCESS!</h3>
                <p className="text-yellow-100 font-bold uppercase tracking-widest text-xs mt-2">Order Confirmed & Sent to Hive</p>
                <button 
                  onClick={() => { setIsOrdered(false); setLastReceipt(null); }}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 bg-slate-50 flex-grow max-h-[60vh] overflow-y-auto">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 font-mono text-sm">
                  <div className="text-center border-b border-dashed pb-4 mb-4">
                    <h4 className="font-black text-lg text-slate-800">BEEHIVE RESTOBAR</h4>
                    <p className="text-[10px] text-slate-400 uppercase">Online Order Receipt</p>
                    <p className="text-[10px] text-slate-400">{new Date(lastReceipt.timestamp).toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    {lastReceipt.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-bold">₱{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed pt-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="uppercase text-slate-400">Customer:</span>
                      <span className="font-bold text-slate-700">{lastReceipt.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase text-slate-400">Type:</span>
                      <span className="font-bold text-slate-700">{lastReceipt.orderType}</span>
                    </div>
                    {lastReceipt.tableNumber && (
                      <div className="flex justify-between">
                        <span className="uppercase text-slate-400">Table:</span>
                        <span className="font-bold text-yellow-600">{lastReceipt.tableNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="uppercase text-slate-400">Payment:</span>
                      <span className="font-bold text-slate-700">{lastReceipt.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-100 pt-4 flex justify-between items-center">
                    <span className="font-black text-lg">TOTAL</span>
                    <span className="font-black text-2xl text-yellow-600">₱{lastReceipt.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-t flex flex-col gap-3">
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                  <Download size={20} /> Print Receipt
                </button>
                <button 
                  onClick={() => { setIsOrdered(false); setLastReceipt(null); }}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMyOrders && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMyOrders(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 p-2 rounded-xl">
                    <ClipboardList size={24} className="text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic tracking-tighter leading-none">THE HIVE TRACKER</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Guest: {customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => refreshData()} className={cn("p-2 hover:bg-white/10 rounded-full transition-all text-yellow-500", isLoading && "animate-spin")}><Clock size={20} /></button>
                  <button onClick={() => setShowMyOrders(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50 relative">
                {isLoading && (
                  <div className="fixed top-20 right-10 z-50">
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shadow-sm" />
                  </div>
                )}
                {activeOrders.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preparing</p>
                      <p className="text-2xl font-black text-orange-500">{activeOrders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ready to Hive</p>
                      <p className="text-2xl font-black text-green-500">{activeOrders.filter(o => o.status === 'Ready').length}</p>
                    </div>
                  </div>
                )}
                {myOrders.length === 0 ? (
                  <div className="text-center py-20"><Clock size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400 font-black uppercase text-xs tracking-widest">No order history found</p></div>
                ) : (
                  myOrders.map(order => (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={order.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                      <div className={cn("absolute top-0 left-0 w-full h-1.5", order.status === 'Pending' ? "bg-red-500" : order.status === 'Preparing' ? "bg-orange-500" : order.status === 'Ready' ? "bg-green-500" : "bg-slate-300")} />
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest">ID: {order.id}</p>
                          <div className="font-black text-slate-800 text-lg flex items-center gap-2">{order.orderType === 'Dine-in' ? <Utensils size={18} className="text-orange-500" /> : <ShoppingBag size={18} className="text-blue-500" />}{order.orderType === 'Dine-in' ? `Table ${order.tableNumber}` : 'Take-out'}</div>
                        </div>
                        <div className={cn("px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border", order.status === 'Pending' ? "bg-red-50 text-red-600 border-red-100" : order.status === 'Preparing' ? "bg-orange-50 text-orange-600 border-orange-100" : order.status === 'Ready' ? "bg-green-500 text-white animate-bounce border-green-400" : "bg-slate-50 text-slate-400 border-slate-100")}>{order.status}</div>
                      </div>
                      <div className="space-y-2 mb-6">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm"><span className="text-slate-600 font-medium"><span className="font-black text-slate-900 mr-2">{item.quantity}x</span> {item.name}</span><span className="font-bold text-slate-400">₱{item.price * item.quantity}</span></div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Paid via {order.paymentMethod}</p>
                          {order.paymentReference && <div className="flex flex-col"><span className="text-[10px] font-mono font-bold text-yellow-600">Ref: {order.paymentReference}</span><span className="text-[10px] text-slate-400 italic">Sender: {order.paymentSender}</span></div>}
                        </div>
                        <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Total Bill</p><p className="text-xl font-black text-slate-900">₱{order.total.toLocaleString()}</p></div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
