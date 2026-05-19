-- =============================================
-- BEEHIVE RESTOBAR - COMPLETE PRODUCTION SCHEMA
-- =============================================

CREATE DATABASE IF NOT EXISTS beehive_db;
USE beehive_db;

-- 1. CATEGORIES
-- Manages the menu organization
CREATE TABLE IF NOT EXISTS categories (
    name VARCHAR(255) PRIMARY KEY
);

-- 2. MENU ITEMS
-- Stores food, drinks, etc.
-- image column is LONGTEXT to support large Base64 images
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

-- 3. RESTAURANT TABLES
-- Tracks seating availability
CREATE TABLE IF NOT EXISTS tables (
    id VARCHAR(10) PRIMARY KEY,
    isOccupied BOOLEAN DEFAULT FALSE
);

-- 4. SYSTEM SETTINGS
-- Stores Payment info and Security PINs
CREATE TABLE IF NOT EXISTS settings (
    eWalletNumber VARCHAR(50),
    qrCodeUrl LONGTEXT,
    staffPin VARCHAR(50) DEFAULT 'staff123',
    adminPin VARCHAR(50) DEFAULT 'admin123'
);

-- 5. ORDERS
-- The heart of the kitchen and sales tracking
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    customerName VARCHAR(255) NOT NULL,
    tableNumber VARCHAR(10),
    items LONGTEXT NOT NULL,         -- Use LONGTEXT for maximum compatibility
    total DECIMAL(10, 2) NOT NULL,
    orderType VARCHAR(50) NOT NULL,
    paymentMethod VARCHAR(50) NOT NULL,
    paymentReference VARCHAR(255),
    paymentSender VARCHAR(255),
    timestamp BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending'
);

-- =============================================
-- SEED DATA (INITIAL SETUP)
-- =============================================

INSERT IGNORE INTO categories (name) VALUES 
('Burgers'), ('Chicken'), ('Rice'), ('Drinks'), ('Desserts'), ('Snacks');

-- Initialize 20 Tables
INSERT IGNORE INTO tables (id, isOccupied) VALUES 
('1', 0), ('2', 0), ('3', 0), ('4', 0), ('5', 0),
('6', 0), ('7', 0), ('8', 0), ('9', 0), ('10', 0),
('11', 0), ('12', 0), ('13', 0), ('14', 0), ('15', 0),
('16', 0), ('17', 0), ('18', 0), ('19', 0), ('20', 0);

-- Default system settings
INSERT IGNORE INTO settings (eWalletNumber, qrCodeUrl, staffPin, adminPin) VALUES 
('09123456789', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BeeHiveRestobar', 'staff123', 'admin123');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_order_timestamp ON orders(timestamp);
CREATE INDEX idx_order_status ON orders(status);
