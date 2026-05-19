/**
 * BEEHIVE RESTOBAR - PROD BACKEND SERVER
 * Node.js + Express + MySQL (ESM FIXED)
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// DB pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

// async wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ================= ROUTES =================

// INIT
app.get('/api/init', asyncHandler(async (req, res) => {
  const [orders] = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
  const [menu] = await pool.query('SELECT * FROM menu');
  const [categories] = await pool.query('SELECT name FROM categories');
  const [tables] = await pool.query('SELECT * FROM tables');
  const [settings] = await pool.query('SELECT * FROM settings LIMIT 1');

  res.json({
    orders: orders.map(o => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
    })),
    menu,
    categories: categories.map(c => c.name),
    tables: tables.map(t => ({ ...t, isOccupied: !!t.isOccupied })),
    paymentConfig: settings[0] || {}
  });
}));

// CREATE ORDER
app.post('/api/orders', asyncHandler(async (req, res) => {
  const {
    customerName,
    tableNumber,
    items,
    total,
    orderType,
    paymentMethod,
    paymentReference,
    paymentSender
  } = req.body;

  const id = Math.random().toString(36).substring(2, 11).toUpperCase();
  const timestamp = Date.now();

  await pool.execute(
    `INSERT INTO orders 
    (id, customerName, tableNumber, items, total, orderType, paymentMethod, paymentReference, paymentSender, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      customerName,
      tableNumber,
      JSON.stringify(items),
      total,
      orderType,
      paymentMethod,
      paymentReference,
      paymentSender,
      timestamp,
      'Pending'
    ]
  );

  if (orderType === 'Dine-in' && tableNumber) {
    await pool.execute('UPDATE tables SET isOccupied = 1 WHERE id = ?', [tableNumber]);
  }

  res.status(201).json({ id, status: 'Pending' });
}));

// UPDATE ORDER STATUS
app.patch('/api/orders/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [rows] = await pool.query(
    'SELECT tableNumber FROM orders WHERE id = ?',
    [id]
  );

  const order = rows[0];

  await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

  if ((status === 'Completed' || status === 'Cancelled') && order?.tableNumber) {
    await pool.execute('UPDATE tables SET isOccupied = 0 WHERE id = ?', [order.tableNumber]);
  }

  res.json({ success: true });
}));

// MENU
app.get('/api/menu', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM menu');
  res.json(rows);
}));

// IMPORTANT: FIXED WILDCARD (THIS FIXES YOUR RENDER CRASH)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
