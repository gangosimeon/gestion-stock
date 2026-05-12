-- ============================================================
-- sql-seed.sql — Schéma PostgreSQL + données initiales
-- Application : Gestion de Stock Optique
-- Compatibilité : PostgreSQL 14+
-- Usage : psql -U postgres -d gestion_stock -f sql-seed.sql
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Remise à zéro (ordre inverse des FK) ────────────────────────────────────
DROP TABLE IF EXISTS audit_logs         CASCADE;
DROP TABLE IF EXISTS cash_operations    CASCADE;
DROP TABLE IF EXISTS cash_sessions      CASCADE;
DROP TABLE IF EXISTS inventory_lines    CASCADE;
DROP TABLE IF EXISTS inventory_sessions CASCADE;
DROP TABLE IF EXISTS customer_payments  CASCADE;
DROP TABLE IF EXISTS supplier_payments  CASCADE;
DROP TABLE IF EXISTS stock_movements    CASCADE;
DROP TABLE IF EXISTS sale_items         CASCADE;
DROP TABLE IF EXISTS sales              CASCADE;
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders    CASCADE;
DROP TABLE IF EXISTS expenses           CASCADE;
DROP TABLE IF EXISTS products           CASCADE;
DROP TABLE IF EXISTS customers          CASCADE;
DROP TABLE IF EXISTS suppliers          CASCADE;
DROP TABLE IF EXISTS categories         CASCADE;
DROP TABLE IF EXISTS warehouse_stocks   CASCADE;
DROP TABLE IF EXISTS warehouses         CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ─── Types ENUM ───────────────────────────────────────────────────────────────
CREATE TYPE user_role         AS ENUM ('ADMIN', 'GESTIONNAIRE', 'CAISSIER');
CREATE TYPE sale_type         AS ENUM ('RETAIL', 'WHOLESALE');
CREATE TYPE payment_method    AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER');
CREATE TYPE order_status      AS ENUM ('PENDING', 'DELIVERED');
CREATE TYPE movement_reason   AS ENUM ('SUPPLY', 'SALE', 'LOSS', 'ADJUSTMENT');
CREATE TYPE session_status    AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE cash_op_type      AS ENUM ('IN', 'OUT');
CREATE TYPE audit_action      AS ENUM ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','RECEIVE','PAY','TRANSFER','OPEN','CLOSE');

-- ─── UTILISATEURS ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            VARCHAR(20)  PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(120) UNIQUE,
  phone         VARCHAR(30),
  password_hash TEXT         NOT NULL DEFAULT crypt('password123', gen_salt('bf')),
  role          user_role    NOT NULL DEFAULT 'CAISSIER',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  magasin       VARCHAR(80),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, username, full_name, email, role, is_active, magasin) VALUES
  ('u_01','admin',       'Administrateur Système', 'admin@optique.ci',        'ADMIN',        TRUE, 'Siège Social'),
  ('u_02','diallo_m',    'Mamadou Diallo',          'diallo.m@optique.ci',     'GESTIONNAIRE', TRUE, 'Magasin Central'),
  ('u_03','kouassi_a',   'Ama Kouassi',             'kouassi.a@optique.ci',    'CAISSIER',     TRUE, 'Magasin Central'),
  ('u_04','bamba_s',     'Seydou Bamba',            'bamba.s@optique.ci',      'CAISSIER',     TRUE, 'Magasin Central'),
  ('u_05','traore_f',    'Fatou Traoré',            'traore.f@optique.ci',     'GESTIONNAIRE', TRUE, 'Dépôt Nord'),
  ('u_06','yao_k',       'Kouamé Yao',              'yao.k@optique.ci',        'CAISSIER',     TRUE, 'Dépôt Nord'),
  ('u_07','coulibaly_n', 'Nafi Coulibaly',          'coulibaly.n@optique.ci',  'ADMIN',        TRUE, 'Siège Social'),
  ('u_08','kone_d',      'David Koné',              'kone.d@optique.ci',       'CAISSIER',     TRUE, 'Magasin Central'),
  ('u_09','ouattara_i',  'Issa Ouattara',           'ouattara.i@optique.ci',   'GESTIONNAIRE', FALSE,'Dépôt Nord'),
  ('u_10','assi_r',      'Rose Assi',               'assi.r@optique.ci',       'CAISSIER',     TRUE, 'Magasin Central');

-- ─── ENTREPÔTS ────────────────────────────────────────────────────────────────
CREATE TABLE warehouses (
  id         VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO warehouses (id, name, address) VALUES
  ('wh_1', 'Magasin Central', 'Plateau, Abidjan'),
  ('wh_2', 'Dépôt Nord',      'Adjamé, Abidjan');

-- ─── STOCK PAR ENTREPÔT ───────────────────────────────────────────────────────
CREATE TABLE warehouse_stocks (
  warehouse_id VARCHAR(20) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id   VARCHAR(20) NOT NULL,
  quantity     INTEGER     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (warehouse_id, product_id)
);

-- ─── CATÉGORIES ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id   VARCHAR(10)  PRIMARY KEY,
  name VARCHAR(80)  NOT NULL UNIQUE
);

INSERT INTO categories (id, name) VALUES
  ('c01','Lunettes de vue'),('c02','Lunettes de soleil'),('c03','Lentilles journalières'),
  ('c04','Lentilles mensuelles'),('c05','Lentilles annuelles'),('c06','Solutions lentilles'),
  ('c07','Montures homme'),('c08','Montures femme'),('c09','Montures enfant'),
  ('c10','Montures sport'),('c11','Verres simples'),('c12','Verres progressifs'),
  ('c13','Verres anti-reflets'),('c14','Verres photochromiques'),('c15','Étuis et protections'),
  ('c16','Cordons et chaînes'),('c17','Nettoyants optiques'),('c18','Loupes et instruments'),
  ('c19','Matériel optométrie'),('c20','Accessoires divers');

-- ─── FOURNISSEURS (15) ────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id                      VARCHAR(20)  PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  phone                   VARCHAR(30),
  email                   VARCHAR(120),
  address                 TEXT,
  delivery_lead_time_days INTEGER      NOT NULL DEFAULT 7 CHECK (delivery_lead_time_days >= 0),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO suppliers (id, name, email, delivery_lead_time_days) VALUES
  ('sup_01','Luxottica Group',           'orders@luxottica.com',    21),
  ('sup_02','Safilo Group',              'orders@safilo.com',       18),
  ('sup_03','Essilor International',     'supplies@essilor.fr',     14),
  ('sup_04','Alcon Laboratories',        'orders@alcon.com',        30),
  ('sup_05','Johnson & Johnson Vision',  'vision@jnj.com',          28),
  ('sup_06','CooperVision',              'info@coopervision.com',   25),
  ('sup_07','Carl Zeiss Vision',         'vision@zeiss.com',        20),
  ('sup_08','Hoya Vision Care',          'orders@hoya.com',         35),
  ('sup_09','Rodenstock GmbH',           'info@rodenstock.com',     22),
  ('sup_10','Marchon Eyewear',           'orders@marchon.com',      28),
  ('sup_11','Silhouette International',  'orders@silhouette.com',   24),
  ('sup_12','Nikon Lenswear',            'lenswear@nikon.com',      32),
  ('sup_13','Transitions Optical',       'orders@transitions.com',  20),
  ('sup_14','Optik Pro Distribution CI', 'ventes@optikpro.ci',       5),
  ('sup_15','AfriVision SARL',           'commandes@afrivision.ci',  3);

-- ─── PRODUITS (200 via procédure) ─────────────────────────────────────────────
CREATE TABLE products (
  id               VARCHAR(20)    PRIMARY KEY,
  sku              VARCHAR(30)    UNIQUE NOT NULL,
  name             VARCHAR(150)   NOT NULL,
  category_id      VARCHAR(10)    NOT NULL REFERENCES categories(id),
  supplier_id      VARCHAR(20)    REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_price   NUMERIC(12,0)  NOT NULL CHECK (purchase_price >= 0),
  retail_price     NUMERIC(12,0)  NOT NULL CHECK (retail_price >= purchase_price),
  wholesale_price  NUMERIC(12,0)  NOT NULL CHECK (wholesale_price >= purchase_price),
  stock_quantity   INTEGER        NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  alert_threshold  INTEGER        NOT NULL DEFAULT 5  CHECK (alert_threshold >= 0),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Génération de 200 produits via DO block
DO $$
DECLARE
  brands  TEXT[] := ARRAY['Ray-Ban','Oakley','Alcon','Zeiss','Essilor','Hoya','Acuvue','Bausch+Lomb','Silhouette','Tom Ford','Gucci','Prada','Dior','Persol','Lindberg'];
  pfx     TEXT[] := ARRAY['Monture Vue','Lunette Soleil','Lentille Jour','Lentille Mois','Lentille An','Solution','Monture H','Monture F','Monture Kid','Sport Frame','Verre Simple','Progressif','Anti-Reflet','Photochromique','Étui','Cordon','Spray Optique','Loupe','Équipement','Accessoire'];
  pmins   INT[]  := ARRAY[15000,10000,2500,4000,12000,1200,18000,18000,8000,20000,3000,25000,12000,20000,800,300,800,2500,45000,400];
  pmaxs   INT[]  := ARRAY[70000,55000,10000,18000,45000,6000,75000,75000,30000,90000,20000,110000,55000,75000,7000,4500,5000,25000,450000,8000];
  sups    TEXT[] := ARRAY['sup_01','sup_02','sup_03','sup_04','sup_05','sup_06','sup_07','sup_08','sup_09','sup_10','sup_11','sup_12','sup_13','sup_14','sup_15'];
  cats    TEXT[] := ARRAY['c01','c02','c03','c04','c05','c06','c07','c08','c09','c10','c11','c12','c13','c14','c15','c16','c17','c18','c19','c20'];
  ci INT; pp NUMERIC; rp NUMERIC; wp NUMERIC;
BEGIN
  FOR i IN 1..200 LOOP
    ci := ((i-1) % 20) + 1;
    pp := (FLOOR(random()*(pmaxs[ci]-pmins[ci])+pmins[ci])/500)::INT * 500;
    rp := (pp * (1.35 + random()*0.6) / 500)::INT * 500;
    wp := (pp * (1.10 + random()*0.25) / 500)::INT * 500;
    INSERT INTO products (id,sku,name,category_id,supplier_id,purchase_price,retail_price,wholesale_price,stock_quantity,alert_threshold)
    VALUES (
      'p_'||LPAD(i::TEXT,3,'0'),
      'SKU-'||LPAD(i::TEXT,4,'0'),
      pfx[ci]||' '||brands[((i-1)%15)+1]||' '||CHR(65+((i-1)%26))||LPAD(((i%99)+1)::TEXT,2,'0'),
      cats[ci], sups[((i-1)%15)+1], pp, rp, wp,
      0, (FLOOR(random()*12)+3)::INT
    );
  END LOOP;
END $$;

-- ─── CLIENTS (50) ─────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id           VARCHAR(20)   PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  phone        VARCHAR(30),
  email        VARCHAR(120),
  credit_limit NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO customers (id, name, phone, credit_limit) VALUES
  ('cl_001','Mamadou Diallo',  '+225 07 45 23 11', 100000),
  ('cl_002','Fatou Bah',       '+225 07 62 84 30', 0),
  ('cl_003','Ibrahim Barry',   '+225 07 11 55 72', 200000),
  ('cl_004','Awa Koné',        '+225 07 38 19 64', 50000),
  ('cl_005','Seydou Traoré',   '+225 07 71 42 88', 500000),
  ('cl_006','Aminata Coulibaly','+225 07 29 67 14', 0),
  ('cl_007','Oumar Kouyaté',   '+225 07 53 31 95', 100000),
  ('cl_008','Mariam Diaby',    '+225 07 18 74 46', 200000),
  ('cl_009','Cheikh Camara',   '+225 07 85 22 63', 0),
  ('cl_010','Kadiatou Touré',  '+225 07 44 96 27', 50000);
-- NOTE: Générer les 40 clients restants via le script Node.js ou mock-db-large.ts

-- ─── VENTES ───────────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id              VARCHAR(20)    PRIMARY KEY,
  type            sale_type      NOT NULL DEFAULT 'RETAIL',
  customer_id     VARCHAR(20)    REFERENCES customers(id) ON DELETE SET NULL,
  payment_method  payment_method NOT NULL DEFAULT 'CASH',
  paid_amount     NUMERIC(12,0)  NOT NULL CHECK (paid_amount >= 0),
  total           NUMERIC(12,0)  NOT NULL CHECK (total >= 0),
  profit          NUMERIC(12,0)  NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(20)    NOT NULL REFERENCES users(id)
);

CREATE TABLE sale_items (
  id             SERIAL         PRIMARY KEY,
  sale_id        VARCHAR(20)    NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id     VARCHAR(20)    NOT NULL REFERENCES products(id),
  quantity       INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(12,0)  NOT NULL CHECK (unit_price >= 0),
  purchase_price NUMERIC(12,0)  NOT NULL CHECK (purchase_price >= 0)
);

-- ─── COMMANDES FOURNISSEURS ───────────────────────────────────────────────────
CREATE TABLE purchase_orders (
  id            VARCHAR(20)   PRIMARY KEY,
  supplier_id   VARCHAR(20)   NOT NULL REFERENCES suppliers(id),
  status        order_status  NOT NULL DEFAULT 'PENDING',
  total_amount  NUMERIC(12,0) NOT NULL CHECK (total_amount >= 0),
  paid_amount   NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  invoice_number VARCHAR(50),
  invoice_date  DATE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  delivered_at  TIMESTAMPTZ
);

CREATE TABLE purchase_order_lines (
  id                  SERIAL         PRIMARY KEY,
  purchase_order_id   VARCHAR(20)    NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id          VARCHAR(20)    NOT NULL REFERENCES products(id),
  quantity            INTEGER        NOT NULL CHECK (quantity > 0),
  unit_purchase_price NUMERIC(12,0)  NOT NULL CHECK (unit_purchase_price >= 0),
  line_total          NUMERIC(12,0)  GENERATED ALWAYS AS (quantity * unit_purchase_price) STORED
);

-- ─── MOUVEMENTS DE STOCK ─────────────────────────────────────────────────────
CREATE TABLE stock_movements (
  id              VARCHAR(25)    PRIMARY KEY,
  product_id      VARCHAR(20)    NOT NULL REFERENCES products(id),
  warehouse_id    VARCHAR(20)    NOT NULL REFERENCES warehouses(id),
  quantity        INTEGER        NOT NULL,
  reason          movement_reason NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(20)    NOT NULL REFERENCES users(id),
  note            TEXT
);

-- ─── DÉPENSES ─────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id               VARCHAR(20)   PRIMARY KEY,
  category         VARCHAR(50)   NOT NULL,
  label            VARCHAR(150)  NOT NULL,
  amount           NUMERIC(12,0) NOT NULL CHECK (amount > 0),
  expense_date     DATE          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by       VARCHAR(20)   NOT NULL REFERENCES users(id),
  note             TEXT
);

-- ─── CAISSE ───────────────────────────────────────────────────────────────────
CREATE TABLE cash_sessions (
  id               VARCHAR(25)   PRIMARY KEY,
  status           session_status NOT NULL DEFAULT 'OPEN',
  opening_balance  NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  counted_cash     NUMERIC(12,0),
  opened_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  opened_by        VARCHAR(20)   NOT NULL REFERENCES users(id),
  closed_by        VARCHAR(20)   REFERENCES users(id)
);

CREATE TABLE cash_operations (
  id         VARCHAR(25)   PRIMARY KEY,
  session_id VARCHAR(25)   NOT NULL REFERENCES cash_sessions(id),
  type       cash_op_type  NOT NULL,
  amount     NUMERIC(12,0) NOT NULL CHECK (amount > 0),
  note       TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by VARCHAR(20)   NOT NULL REFERENCES users(id)
);

-- ─── PAIEMENTS CLIENTS / FOURNISSEURS ────────────────────────────────────────
CREATE TABLE customer_payments (
  id               VARCHAR(20)   PRIMARY KEY,
  customer_id      VARCHAR(20)   NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_date     DATE          NOT NULL,
  amount           NUMERIC(12,0) NOT NULL CHECK (amount > 0),
  note             TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_payments (
  id                VARCHAR(20)   PRIMARY KEY,
  supplier_id       VARCHAR(20)   NOT NULL REFERENCES suppliers(id),
  purchase_order_id VARCHAR(20)   REFERENCES purchase_orders(id) ON DELETE SET NULL,
  payment_date      DATE          NOT NULL,
  amount            NUMERIC(12,0) NOT NULL CHECK (amount > 0),
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── INVENTAIRES ──────────────────────────────────────────────────────────────
CREATE TABLE inventory_sessions (
  id              VARCHAR(25)   PRIMARY KEY,
  warehouse_id    VARCHAR(20)   NOT NULL REFERENCES warehouses(id),
  note            TEXT,
  items_count     INTEGER       NOT NULL DEFAULT 0,
  total_difference INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(20)   NOT NULL REFERENCES users(id)
);

CREATE TABLE inventory_lines (
  id                SERIAL       PRIMARY KEY,
  session_id        VARCHAR(25)  NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  product_id        VARCHAR(20)  NOT NULL REFERENCES products(id),
  system_quantity   INTEGER      NOT NULL,
  physical_quantity INTEGER      NOT NULL,
  difference        INTEGER      GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED
);

-- ─── JOURNAL D'AUDIT ──────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id           BIGSERIAL      PRIMARY KEY,
  user_id      VARCHAR(20)    NOT NULL REFERENCES users(id),
  action       audit_action   NOT NULL,
  entity_type  VARCHAR(50)    NOT NULL,
  entity_id    VARCHAR(50)    NOT NULL,
  entity_label TEXT,
  ip_address   INET           NOT NULL DEFAULT '127.0.0.1',
  status       VARCHAR(10)    NOT NULL DEFAULT 'SUCCESS',
  before_json  JSONB,
  after_json   JSONB,
  meta_json    JSONB,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── INDEX ────────────────────────────────────────────────────────────────────
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_supplier  ON products(supplier_id);
CREATE INDEX idx_sales_created_at   ON sales(created_at DESC);
CREATE INDEX idx_sales_customer     ON sales(customer_id);
CREATE INDEX idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_movements_product  ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_movements_reason   ON stock_movements(reason);
CREATE INDEX idx_po_supplier_status ON purchase_orders(supplier_id, status);
CREATE INDEX idx_audit_user_action  ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_expenses_date      ON expenses(expense_date DESC);

-- ─── VUE : Stock par entrepôt ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_warehouse_stock AS
SELECT
  ws.warehouse_id,
  w.name  AS warehouse_name,
  ws.product_id,
  p.sku, p.name AS product_name,
  ws.quantity,
  p.alert_threshold,
  CASE WHEN ws.quantity <= p.alert_threshold THEN TRUE ELSE FALSE END AS is_alert
FROM warehouse_stocks ws
JOIN warehouses w ON w.id = ws.warehouse_id
JOIN products p   ON p.id = ws.product_id;

-- ─── VUE : Dashboard KPIs ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM products)                                          AS total_products,
  (SELECT COUNT(*) FROM products WHERE stock_quantity <= alert_threshold)  AS stock_alerts,
  (SELECT COUNT(*) FROM customers)                                          AS total_customers,
  (SELECT COUNT(*) FROM purchase_orders WHERE status='PENDING')             AS pending_orders,
  (SELECT COALESCE(SUM(total),0) FROM sales
   WHERE created_at::DATE = CURRENT_DATE)                                   AS today_sales_total,
  (SELECT COALESCE(SUM(profit),0) FROM sales
   WHERE created_at::DATE = CURRENT_DATE)                                   AS today_profit,
  (SELECT COALESCE(SUM(stock_quantity * purchase_price),0) FROM products)   AS stock_value;
