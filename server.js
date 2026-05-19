/**
 * BEEHIVE RESTOBAR - PROD BACKEND SERVER (Node.js/Express + MySQL)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false // Required for Aiven/Managed MySQL
  }
});

// Helper to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- API ENDPOINTS ---

// GET: All Initial Data
app.get('/api/init', asyncHandler(async (req, res) => {
  const [orders] = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
  const [menu] = await pool.query('SELECT * FROM menu');
  const [categories] = await pool.query('SELECT name FROM categories');
  const [tables] = await pool.query('SELECT * FROM tables');
  const [settings] = await pool.query('SELECT * FROM settings LIMIT 1');

  res.json({
    orders: orders.map(o => {
      let parsedItems = [];
      try {
        parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      } catch (e) {
        console.error("Failed to parse items for order:", o.id);
        parsedItems = [];
      }
      return { ...o, items: parsedItems };
    }),
    menu,
    categories: categories.map(c => c.name),
    tables: tables.map(t => ({ ...t, isOccupied: !!t.isOccupied })),
    paymentConfig: settings[0] || {}
  });
}));

// POST: Create Order
app.post('/api/orders', asyncHandler(async (req, res) => {
  const { customerName, tableNumber, items, total, orderType, paymentMethod, paymentReference, paymentSender } = req.body;
  const id = Math.random().toString(36).substr(2, 9).toUpperCase();
  const timestamp = Date.now();

  // If items is already a string (from some clients) or an object
  const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

  await pool.execute(
    'INSERT INTO orders (id, customerName, tableNumber, items, total, orderType, paymentMethod, paymentReference, paymentSender, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, customerName, tableNumber, itemsJson, total, orderType, paymentMethod, paymentReference, paymentSender, timestamp, 'Pending']
  );

  if (orderType === 'Dine-in' && tableNumber) {
    await pool.execute('UPDATE tables SET isOccupied = 1 WHERE id = ?', [tableNumber]);
  }

  res.status(201).json({ id, status: 'Pending' });
}));

// PATCH: Update Order Status
app.patch('/api/orders/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [rows] = await pool.query('SELECT tableNumber FROM orders WHERE id = ?', [id]);
  const order = rows[0];

  await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

  if ((status === 'Completed' || status === 'Cancelled') && order?.tableNumber) {
    await pool.execute('UPDATE tables SET isOccupied = 0 WHERE id = ?', [order.tableNumber]);
  }

  res.json({ success: true });
}));

// GET: Menu
app.get('/api/menu', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM menu');
  res.json(rows);
}));

// POST: Save/Update Menu Item
app.post('/api/menu', asyncHandler(async (req, res) => {
  const { id, name, price, category, description, image, accentColor } = req.body;
  const [exists] = await pool.query('SELECT id FROM menu WHERE id = ?', [id]);

  if (exists.length > 0) {
    await pool.execute(
      'UPDATE menu SET name=?, price=?, category=?, description=?, image=?, accentColor=? WHERE id=?',
      [name, price, category, description, image, accentColor, id]
    );
  } else {
    await pool.execute(
      'INSERT INTO menu (id, name, price, category, description, image, accentColor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, price, category, description, image, accentColor]
    );
  }
  res.json({ success: true });
}));

// DELETE: Menu Item
app.delete('/api/menu/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM menu WHERE id = ?', [id]);
  res.status(204).send();
}));

// POST: Categories
app.post('/api/categories', asyncHandler(async (req, res) => {
  const { category } = req.body;
  await pool.execute('INSERT IGNORE INTO categories (name) VALUES (?)', [category]);
  res.json({ success: true });
}));

// POST: Settings
app.post('/api/settings', asyncHandler(async (req, res) => {
  const { eWalletNumber, qrCodeUrl, staffPin, adminPin } = req.body;
  await pool.execute('DELETE FROM settings');
  await pool.execute('INSERT INTO settings (eWalletNumber, qrCodeUrl, staffPin, adminPin) VALUES (?, ?, ?, ?)', [eWalletNumber, qrCodeUrl, staffPin, adminPin]);
  res.json({ success: true });
}));

// PATCH: Table Toggle
app.patch('/api/tables/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isOccupied } = req.body;
  await pool.execute('UPDATE tables SET isOccupied = ? WHERE id = ?', [isOccupied ? 1 : 0, id]);
  res.json({ success: true });
}));

// Catch-all to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server live on port ${PORT}`);
});
