# 🐝 BeeHive Restobar - Full-Stack Deployment Guide

This guide provides step-by-step instructions to take your **BeeHive Restobar** live using **GitHub**, **Render**, and **Aiven (MySQL)**.

---

## 1. Database Setup (Cloud MySQL)

### A. Create Cloud Database on Aiven
1.  Go to [Aiven.io](https://aiven.io/) and create a free account.
2.  Create a new **MySQL** service.
3.  Choose the **Free Tier** (or the lowest cost plan).
4.  Wait for the status to show **"Running"**.
5.  Under **Connection Information**, copy your `Host`, `Port`, `User`, `Password`, and `Database Name` (default is usually `defaultdb`).

### B. Connect & Create Tables (MySQL Workbench)
1.  Open **MySQL Workbench** on your computer.
2.  Create a new connection using the Aiven details.
3.  Open a new **SQL Tab** and paste the **Complete Schema** below.
4.  **Execute (⚡)** to build your restaurant's foundation.

```sql
-- BEEHIVE RESTOBAR - PRODUCTION SCHEMA
CREATE DATABASE IF NOT EXISTS beehive_db;
USE beehive_db;

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (name VARCHAR(255) PRIMARY KEY);

-- 2. Menu (Supports Base64 Images)
CREATE TABLE IF NOT EXISTS menu (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(255),
    description TEXT,
    image LONGTEXT,
    accentColor VARCHAR(20),
    FOREIGN KEY (category) REFERENCES categories(name) ON DELETE SET NULL
);

-- 3. Tables (Restaurant Seating)
CREATE TABLE IF NOT EXISTS tables (id VARCHAR(10) PRIMARY KEY, isOccupied BOOLEAN DEFAULT FALSE);

-- 4. Settings (Payment & Security)
CREATE TABLE IF NOT EXISTS settings (
    eWalletNumber VARCHAR(50),
    qrCodeUrl LONGTEXT,
    staffPin VARCHAR(50) DEFAULT 'staff123',
    adminPin VARCHAR(50) DEFAULT 'admin123'
);

-- 5. Orders (The Transaction Engine)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    customerName VARCHAR(255) NOT NULL,
    tableNumber VARCHAR(10),
    items LONGTEXT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    orderType VARCHAR(50) NOT NULL,
    paymentMethod VARCHAR(50) NOT NULL,
    paymentReference VARCHAR(255),
    paymentSender VARCHAR(255),
    timestamp BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending'
);

-- SEED INITIAL DATA
INSERT IGNORE INTO categories (name) VALUES ('Burgers'), ('Chicken'), ('Rice'), ('Drinks'), ('Desserts'), ('Snacks');
INSERT IGNORE INTO tables (id, isOccupied) VALUES ('1',0),('2',0),('3',0),('4',0),('5',0),('6',0),('7',0),('8',0),('9',0),('10',0),('11',0),('12',0),('13',0),('14',0),('15',0),('16',0),('17',0),('18',0),('19',0),('20',0);
INSERT IGNORE INTO settings (eWalletNumber, qrCodeUrl, staffPin, adminPin) VALUES ('09123456789', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BeeHiveRestobar', 'staff123', 'admin123');
```

---

## 2. Code Deployment (GitHub & Render)

### A. Push to GitHub
1.  Create a new repository on GitHub.
2.  Push your code:
    ```bash
    git init
    git add .
    git commit -m "BeeHive Full-Stack Release"
    git remote add origin YOUR_REPO_URL
    git push -u origin main
    ```

### B. Host on Render.com
1.  Create a **New Web Service** and connect your GitHub repo.
2.  **Settings**:
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `node server.js`
3.  **Environment Variables** (Add these in the Render dashboard):
    *   `DB_HOST`: (From Aiven)
    *   `DB_USER`: (From Aiven)
    *   `DB_PASSWORD`: (From Aiven)
    *   `DB_NAME`: (usually `defaultdb` or `beehive_db`)
    *   `DB_PORT`: `3306`

---

## 3. How to Operate the System

### 👤 Customer View
*   Accessible to everyone at your Render URL.
*   Customers can order Dine-in or Take-out.
*   **Status Tracker**: Shows rolling live updates once an order is placed.

### 👨‍🍳 Staff Portal
*   **Access**: Hover cursor at the **Top-Left Corner** → Select "Staff Portal".
*   **PIN**: `staff123` (Changeable in Admin Settings).
*   **Function**: Start preparation, set orders to ready, and finalize completed meals.

### 📈 Admin Management
*   **Access**: Hover cursor at the **Top-Left Corner** → Select "Management".
*   **PIN**: `admin123` (Changeable in Admin Settings).
*   **Function**:
    *   **Analytics**: View Daily/Monthly/Yearly sales.
    *   **Menu**: Add/Edit/Delete items, upload photos, and create new categories.
    *   **Settings**: Update GCash numbers, QR codes, and security PINs.
    *   **Export**: Preview and download sales reports to CSV (Excel).

---

### 🛡️ Security Note
The system uses **SSL encryption** for the database connection and **JSON-based order tracking** to ensure high-performance and data integrity. All images are stored as optimized Base64 strings.
