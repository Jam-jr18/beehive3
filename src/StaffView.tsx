import React from 'react';
import { useApp } from './store';
import { OrderStatus } from './types';
import { Clock, CheckCircle, ChefHat, Trash2, User, Hash, Utensils, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from './utils/cn';

export const StaffView: React.FC = () => {
  const { orders, updateOrderStatus } = useApp();

  const activeOrders = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  const pastOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Cancelled');

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 'bg-red-100 text-red-600 border-red-200';
      case 'Preparing': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Ready': return 'bg-green-100 text-green-600 border-green-200';
      case 'Completed': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const statusFlow: OrderStatus[] = ['Pending', 'Preparing', 'Ready', 'Completed'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <header className="bg-slate-800 text-white p-4 sticky top-0 z-20 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat size={28} className="text-yellow-500" />
            <h1 className="text-xl font-bold italic">BeeHive Kitchen Terminal</h1>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex items-center gap-1">
              <span className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                activeOrders.some(o => o.status === 'Pending') ? "bg-red-500" : 
                activeOrders.some(o => o.status === 'Preparing') ? "bg-orange-500" : "bg-green-500"
              )} />
              <span>{activeOrders.length} Active Orders</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <h2 className="text-lg font-bold text-gray-600 flex items-center gap-2">
            <Clock size={20} /> Incoming & Preparation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-3xl">No active orders.</div>
            ) : (
              activeOrders.map(order => (
                <motion.div layout key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-gray-400" />
                        <span className="font-mono font-bold text-gray-800 text-xs">{order.id}</span>
                        {order.orderType === 'Dine-in' ? <Utensils size={14} className="text-orange-500" /> : <ShoppingBag size={14} className="text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 text-sm font-bold text-gray-700"><User size={14} />{order.customerName}</div>
                         <div className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-black uppercase">
                           {order.orderType === 'Dine-in' ? `Table ${order.tableNumber}` : 'Take-out'}
                         </div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold border", 
                      getStatusColor(order.status),
                      order.status === 'Ready' && "animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                    )}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="p-4 bg-indigo-50/50 border-b space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-400 uppercase">Payment: {order.paymentMethod}</span>
                      <span className="text-[10px] font-bold text-indigo-900">₱{order.total}</span>
                    </div>
                    {order.paymentMethod === 'E-Wallet' && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="text-[10px] text-indigo-600 font-medium">Sender: {order.paymentSender}</div>
                        <div className="text-[10px] text-indigo-600 font-mono text-right">Ref: {order.paymentReference}</div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-grow space-y-2">
                    {Array.isArray(order.items) ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">
                            <span className="text-yellow-600 font-bold mr-2">{item.quantity}x</span>{item.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-red-400 italic">Error loading items</p>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 flex gap-2">
                    {order.status !== 'Ready' ? (
                      <button onClick={() => updateOrderStatus(order.id, statusFlow[statusFlow.indexOf(order.status) + 1])} className="flex-grow bg-yellow-500 hover:bg-yellow-600 text-white font-black py-3 rounded-xl transition-all shadow-md active:scale-95">
                        {order.status === 'Pending' ? 'Start Preparation' : 'Set as Ready'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => updateOrderStatus(order.id, 'Completed')} className="flex-grow bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                          <CheckCircle size={18} /> Done
                        </button>
                        <button onClick={() => updateOrderStatus(order.id, 'Cancelled')} className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={20} /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-600 flex items-center gap-2"><CheckCircle size={20} /> Order History</h2>
          <div className="space-y-3">
            {pastOrders.slice(0, 10).map(order => (
              <div key={order.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-bold text-gray-700 text-sm">{order.customerName}</div>
                  <div className="text-[10px] text-gray-400">{order.orderType} • {new Date(order.timestamp).toLocaleTimeString()}</div>
                </div>
                <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", order.status === 'Completed' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{order.status}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
