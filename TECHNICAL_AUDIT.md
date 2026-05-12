# Audit Technique — Gestion Stock (Optique)

> Généré par audit logiciel approfondi — Mai 2026  
> Portée : code métier complet, règles de gestion, workflows, validations, sécurité, bugs détectés

---

## Table des matières

1. [Vue d'ensemble de l'application](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Règles de sécurité et d'accès](#4-règles-de-sécurité)
5. [Module Ventes](#5-module-ventes)
6. [Module Achats (Commandes fournisseurs)](#6-module-achats)
7. [Module Stock et Inventaire](#7-module-stock-et-inventaire)
8. [Module Caisse](#8-module-caisse)
9. [Module Clients](#9-module-clients)
10. [Module Fournisseurs](#10-module-fournisseurs)
11. [Module Produits et Entrepôts](#11-module-produits-et-entrepôts)
12. [Module Dépenses](#12-module-dépenses)
13. [Module Rapports et Dashboard](#13-module-rapports-et-dashboard)
14. [Module Audit Logs](#14-module-audit-logs)
15. [Diagrammes de flux](#15-diagrammes-de-flux)
16. [Bugs détectés](#16-bugs-détectés)
17. [Problèmes d'architecture](#17-problèmes-darchitecture)
18. [Recommandations](#18-recommandations)

---

## 1. Vue d'ensemble

Application Angular 20 de gestion de stock pour un magasin d'optique multi-entrepôts.  
Le système gère : ventes retail/gros, commandes fournisseurs, inventaires physiques, caisse, clients crédit, dépenses, rapports financiers et journal d'audit.

### Périmètre fonctionnel

| Domaine | Fonctionnalités |
|---|---|
| **Ventes** | Panier, checkout CASH/MOBILE/VIREMENT, credit, gros/détail |
| **Achats** | Commande → Réception → Facturation → Paiement |
| **Stock** | Mouvements manuels, transferts inter-entrepôts, alertes seuil |
| **Inventaire** | Session physique, calcul d'écarts, ajustements automatiques |
| **Caisse** | Ouverture/fermeture, opérations IN/OUT, réconciliation |
| **Clients** | CRUD, limite de crédit, paiements partiels, historique |
| **Fournisseurs** | CRUD, historique achats, paiements |
| **Dashboard** | KPIs temps réel, graphiques, top produits |
| **Audit** | Journal complet, export CSV, statistiques |

---

## 2. Architecture technique

### Stack

- **Framework** : Angular 20 (standalone components)
- **État** : RxJS BehaviorSubject + `combineLatest` (pattern ViewModel observable)
- **Config** : Angular Signals (`mockConfig` signal)
- **Mock API** : HTTP Interceptor fonctionnel (`mockBackendInterceptor`)
- **Auth** : JWT simulé + legacy `mock-token::<username>`

### Pattern architectural : Feature → Facade → ApiService → Interceptor

```
Feature Component
    └── Facade (BehaviorSubject VM)
        └── ApiService (HttpClient)
            └── mockBackendInterceptor (if useMocks=true)
                └── mock-db.ts (données en mémoire)
```

### Structure des dossiers

```
src/app/
├── auth/                     ← Login, refresh token, auth service
├── core/
│   ├── guards/               ← authGuard, roleGuard
│   ├── interceptors/         ← mockBackendInterceptor, authInterceptor
│   ├── models/               ← 19 interfaces TypeScript
│   ├── mocks/                ← config, engine (JWT, query, network), mock-db
│   └── services/             ← 17 services API
└── features/
    ├── appointments/
    ├── audit-logs/
    ├── cash-register/
    ├── clients/
    ├── dashboard/
    ├── expenses/
    ├── inventory/
    ├── products/
    ├── purchases/
    ├── sales/
    ├── stock/
    ├── teams/
    └── warehouses/
```

### Contexte multi-entrepôts

Chaque requête HTTP peut porter le header `X-Warehouse-Id`.  
Le service `WarehouseContextService` persiste le choix dans `localStorage`.  
Fallback côté interceptor : `wh_1` (entrepôt principal).

---

## 3. Modèle de données

### Relations principales

```
Warehouse ──────────────── WarehouseStock (Map<warehouseId, Map<productId, qty>>)
    │
Product ──┬─── Category
          └─── Supplier ─── SupplierPayment
                         └── SupplierPurchaseHistory
                         └── PurchaseOrder ──── PurchaseOrderLine

Customer ──────────────── CustomerPayment
    └── Sale ──────────── SaleItem ──── Product
                └── StockMovement (reason=SALE)

CashRegisterSession ───── CashOperation
                      └── Sale (CASH, dans la fenêtre temporelle)

InventorySession ─────── InventoryLine ──── StockMovement (reason=ADJUSTMENT)

AuditLogEntry ─── (toutes les actions système)
```

### Rôles utilisateurs

```typescript
type Role = 'ADMIN' | 'CAISSIER' | 'GESTIONNAIRE';
```

| Rôle | Permissions |
|---|---|
| **ADMIN** | Tout (CRUD complet, suppression, audit, utilisateurs) |
| **GESTIONNAIRE** | Produits, fournisseurs, entrepôts, commandes, inventaires, transferts |
| **CAISSIER** | Ventes, caisse, clients (CRUD), paiements clients |

### Statuts des entités

| Entité | Statuts |
|---|---|
| `PurchaseOrder` | `PENDING` → `DELIVERED` |
| `CashRegisterSession` | `OPEN` → `CLOSED` |
| `StockMovement.reason` | `SUPPLY` \| `SALE` \| `LOSS` \| `ADJUSTMENT` |
| `Appointment.status` | (libre, non typé strictement côté modèle) |

---

## 4. Règles de sécurité

### Authentification

**Règle 1 — Accès sans token (mode dev)**
```
requireAuth() : si aucun Bearer token → fallback mockUsers[0] (admin)
```
> ⚠️ Bug : voir §16.B1

**Règle 2 — Token JWT**
- Format : 3 segments base64url séparés par `.`
- Payload décodé → champ `sub` = username
- `verifyMockJwt()` vérifie l'expiration (`exp` timestamp)

**Règle 3 — Token legacy**
- Format : `mock-token::<username>`
- Toujours accepté pour rétrocompatibilité

**Règle 4 — Refresh token**
- JWT 3 parts → `verifyMockJwt(refreshToken).sub` → recherche utilisateur
- Legacy → parsing `::` → username

### Matrice des permissions par endpoint

| Endpoint | GET | POST | PUT/PATCH | DELETE |
|---|---|---|---|---|
| `/api/auth/*` | public | public | — | — |
| `/api/products` | authentifié | ADMIN + GESTIONNAIRE | ADMIN + GESTIONNAIRE | ADMIN |
| `/api/warehouses` | authentifié | ADMIN + GESTIONNAIRE | — | — |
| `/api/suppliers` | authentifié | ADMIN + GESTIONNAIRE | ADMIN + GESTIONNAIRE | ADMIN |
| `/api/customers` | authentifié | authentifié | ADMIN + GESTIONNAIRE + CAISSIER | ADMIN |
| `/api/sales` | authentifié | authentifié | — | — |
| `/api/purchases/orders` | authentifié | ADMIN + GESTIONNAIRE | — (receive/pay/invoice) | — |
| `/api/inventory/sessions` | authentifié | ADMIN + GESTIONNAIRE | — | — |
| `/api/cash-register/*` | authentifié | ADMIN + GESTIONNAIRE + CAISSIER | — | — |
| `/api/expenses` | authentifié | ADMIN + GESTIONNAIRE | — | ADMIN |
| `/api/users` | ADMIN | ADMIN | ADMIN | ADMIN |
| `/api/audit-logs` | ADMIN | — | — | — |

### Guards côté frontend

**`authGuard`** : vérifie `auth.isAuthenticated` → basé sur présence du `accessToken` en storage.

> ⚠️ Bug : voir §16.B2 — `isAuthenticated` est basé sur la présence du token, pas sur sa validité.

**`roleGuard`** : lit `route.data.roles[]` → appel `auth.hasAnyRole()` → observable async.

---

## 5. Module Ventes

### Workflow complet

```
[1] Chargement initial
    ├── productsApi.list()   → produits avec stockQuantity
    └── salesApi.listCustomers() → liste clients

[2] Construction du panier
    ├── addProductToCart(productId)
    │   ├── Lookup produit dans productsSubject
    │   ├── Prix selon type: WHOLESALE → wholesalePrice, RETAIL → retailPrice
    │   └── Si déjà dans panier → updateQuantity(qty + 1)
    ├── updateQuantity(productId, qty)
    │   └── qty ≤ 0 → retire la ligne du panier
    └── removeLine(productId)

[3] Changement de type de vente (RETAIL ↔ WHOLESALE)
    └── setSaleType(type)
        └── Re-price TOUTES les lignes du panier selon le nouveau type

[4] Validation et soumission
    ├── Validation panier non vide
    ├── Calcul total = Σ(unitPrice × qty)
    ├── Calcul profit = Σ((unitPrice - purchasePrice) × qty)
    ├── paidAmount ∈ [0, total]
    ├── Si paidAmount < total → crédit (nécessite client)
    └── POST /api/sales

[5] Traitement côté API (intercepteur)
    ├── Validation articles (productId, qty > 0)
    ├── Validation paidAmount ≤ total
    ├── Si crédit avec client :
    │   ├── Calculer dette courante = totalSales - totalPaidSales - totalPayments
    │   ├── nextDebt = currentDebt + (total - paidAmount)
    │   └── Refus si nextDebt > customer.creditLimit
    ├── Validation stock par entrepôt (X-Warehouse-Id)
    │   └── Refus si stock(wh, productId) - qty < 0
    ├── Création de la vente
    ├── Pour chaque article :
    │   ├── adjustStock(warehouseId, productId, -qty)
    │   └── Création StockMovement (reason=SALE)
    └── appendAudit(CREATE, SALE)
```

### Calculs clés

```typescript
// Prix par type
unitPrice = type === 'WHOLESALE' ? product.wholesalePrice : product.retailPrice

// Ligne
lineTotal  = unitPrice × qty
lineProfit = (unitPrice − purchasePrice) × qty

// Panier
total  = Σ lineTotal
profit = Σ lineProfit

// Crédit client
currentDebt = Σ(sales.total) − Σ(sales.paidAmount) − Σ(customerPayments.amount)
nextDebt    = currentDebt + (total − paidAmount)
→ Refus si nextDebt > customer.creditLimit
```

### Règles de gestion ventes

- **RG-V1** : Panier vide → refus (400)
- **RG-V2** : `paidAmount < 0` ou `paidAmount > total` → refus (400)
- **RG-V3** : Vente à crédit sans client → **refusé côté UI** uniquement (pas de garde côté API)
- **RG-V4** : Stock insuffisant → refus (400) par entrepôt
- **RG-V5** : Limite de crédit dépassée → refus (400)
- **RG-V6** : Quantité décimale → `Math.floor()` appliqué côté facade
- **RG-V7** : Changement de type RETAIL/WHOLESALE reprices toutes les lignes existantes

---

## 6. Module Achats

### Workflow complet (4 étapes)

```
[ÉTAPE 1] Création de commande
    ├── Acteurs : ADMIN, GESTIONNAIRE
    ├── POST /api/purchases/orders
    ├── Validations :
    │   ├── supplierId requis et valide
    │   ├── Au moins 1 ligne
    │   ├── productId valide par ligne
    │   ├── qty > 0
    │   └── unitPurchasePrice ≥ 0
    ├── totalAmount = Σ(qty × unitPurchasePrice)
    └── Statut initial : PENDING

[ÉTAPE 2] Réception
    ├── Acteurs : ADMIN, GESTIONNAIRE
    ├── POST /api/purchases/orders/:id/receive
    ├── Validations : statut doit être PENDING
    ├── Pour chaque ligne :
    │   ├── product.stockQuantity += qty    (global, pas par entrepôt !)
    │   ├── product.purchasePrice = unitPurchasePrice  (mise à jour du PA)
    │   └── Création StockMovement (reason=SUPPLY)
    ├── Ajout dans SupplierPurchaseHistory
    └── Statut → DELIVERED

[ÉTAPE 3] Facturation (optionnelle)
    ├── Acteurs : ADMIN, GESTIONNAIRE
    ├── POST /api/purchases/orders/:id/invoice
    ├── Validations : invoiceNumber, invoiceDateIso requis
    └── Attache SupplierInvoice à la commande

[ÉTAPE 4] Paiement
    ├── Acteurs : ADMIN, GESTIONNAIRE
    ├── POST /api/purchases/orders/:id/pay
    ├── Validations :
    │   ├── amount > 0
    │   ├── paymentDateIso requis
    │   └── amount ≤ (totalAmount − paidAmount)
    ├── order.paidAmount += amount
    └── Création SupplierPayment
```

### Règles de gestion achats

- **RG-A1** : Seules commandes PENDING peuvent être réceptionnées
- **RG-A2** : La réception met à jour le `purchasePrice` au dernier prix d'achat (FIFO non géré)
- **RG-A3** : Paiements partiels autorisés — plusieurs paiements possibles
- **RG-A4** : Paiement > reste dû → refus (400)
- **RG-A5** : Facturation possible indépendamment du paiement
- **RG-A6** : Pas de statut CANCELLED (annulation non implémentée)

---

## 7. Module Stock et Inventaire

### Mouvements de stock

```
StockMovement.quantity :
  > 0 → Entrée (IN)  : SUPPLY, ADJUSTMENT+
  < 0 → Sortie (OUT) : SALE, LOSS, ADJUSTMENT-

toUiType(m) = m.quantity >= 0 ? 'IN' : 'OUT'
```

### Sources de mouvements automatiques

| Déclencheur | reason | qty |
|---|---|---|
| Réception commande fournisseur | `SUPPLY` | +qty de la ligne |
| Création vente | `SALE` | -qty de chaque article |
| Transfert inter-entrepôts | `ADJUSTMENT` | -qty (source) / +qty (destination) |
| Session inventaire (écart ≠ 0) | `ADJUSTMENT` | physique - système |

### Transfert inter-entrepôts

```
[1] Vérifications :
    ├── fromWarehouseId ≠ toWarehouseId
    ├── productId valide
    ├── qty > 0
    └── stock(fromWh, productId) - qty ≥ 0

[2] Opérations atomiques :
    ├── adjustStock(fromWh, productId, -qty)
    ├── adjustStock(toWh, productId, +qty)
    ├── Création StockMovement OUT (fromWh)
    └── Création StockMovement IN (toWh)
```

### Session d'inventaire physique

```
[1] Réception lignes : [{ productId, physicalQuantity }]
[2] Pour chaque ligne :
    ├── systemQuantity = getStock(warehouseId, productId)
    ├── difference = physicalQuantity − systemQuantity
    └── Si difference ≠ 0 :
        ├── setStock(warehouseId, productId, physicalQuantity)
        └── Création StockMovement (reason=ADJUSTMENT, qty=difference)
[3] Résumé session :
    ├── itemsCount = nb de lignes
    └── totalDifference = Σ(difference)
```

### Alertes de stock

Calculées à la volée : `product.stockQuantity ≤ product.alertThreshold`

---

## 8. Module Caisse

### Lifecycle d'une session

```
[OUVERTURE]
    ├── Acteurs : ADMIN, GESTIONNAIRE, CAISSIER
    ├── Règle : une seule session OPEN à la fois
    ├── openingBalance ≥ 0
    └── Statut : OPEN

[EN COURS]
    └── Opérations : IN (dépôt) / OUT (retrait)
        ├── type ∈ ['IN', 'OUT']
        └── amount > 0

[FERMETURE]
    ├── countedCash ≥ 0
    ├── Calcul réconciliation automatique
    └── Statut : CLOSED
```

### Calcul de réconciliation (computeCashSessionSummary)

```
cashSalesTotal = Σ(sales.paidAmount WHERE paymentMethod='CASH'
                   AND sale.createdAt ∈ [openedAt, closedAt|now])

totalIn  = Σ(cashOperations.amount WHERE type='IN' AND sessionId=id)
totalOut = Σ(cashOperations.amount WHERE type='OUT' AND sessionId=id)

expectedCash = openingBalance + cashSalesTotal + totalIn − totalOut
difference   = countedCash − expectedCash
```

### Règles de gestion caisse

- **RG-C1** : Impossible d'ouvrir si une session est déjà OPEN
- **RG-C2** : Impossible d'opérer si aucune session OPEN
- **RG-C3** : Seules les ventes CASH entrent dans `cashSalesTotal`
- **RG-C4** : `difference` peut être positif (excédent) ou négatif (manquant)
- **RG-C5** : Pas de validation de la différence maximale autorisée

---

## 9. Module Clients

### Gestion du crédit

```
Solde dû = Σ(sales.total) − Σ(sales.paidAmount) − Σ(customerPayments.amount)

Vente à crédit :
    nextDebt = currentDebt + (saleTotal − paidAmount)
    → Refus si nextDebt > customer.creditLimit
```

### Règles de gestion clients

- **RG-CL1** : `creditLimit` = 0 par défaut → toutes les ventes doivent être intégralement payées
- **RG-CL2** : Suppression d'un client → supprime aussi ses `customerPayments`
- **RG-CL3** : Les ventes liées NE sont PAS supprimées lors d'un DELETE client
- **RG-CL4** : Paiement partiel de dette possible à tout moment

---

## 10. Module Fournisseurs

- CRUD complet (ADMIN + GESTIONNAIRE)
- `deliveryLeadTimeDays` : délai de livraison estimé (validation ≥ 0)
- Suppression : cascade sur `supplierPurchases` (historique supprimé)
- Les `purchaseOrders` liés NE sont PAS supprimés
- Historique achats via `SupplierPurchaseHistory` (alimenté à la réception)
- Paiements multi-commandes possible via `/api/suppliers/:id/payments`

---

## 11. Module Produits et Entrepôts

### Stock multi-entrepôts

```
mockWarehouseStocks : Record<warehouseId, Record<productId, qty>>

getStock(wh, pid)     → mockWarehouseStocks[wh]?.[pid] ?? 0
setStock(wh, pid, v)  → affectation directe
adjustStock(wh, pid, d) → getStock + d, puis setStock, retourne nouvelle val
```

### Création de produit

```
[1] Validations : nom, catégorie, sku (auto si absent)
[2] Initialise stock = 0 dans TOUS les entrepôts
[3] Applique stockQuantity initial sur l'entrepôt courant (X-Warehouse-Id)
```

### Règles de gestion produits

- **RG-P1** : SKU auto-généré si absent (`SKU-XXXX`)
- **RG-P2** : Suppression produit → supprime le stock dans tous les entrepôts
- **RG-P3** : Suppression produit → les mouvements et ventes liés restent orphelins
- **RG-P4** : Réception commande met à jour `purchasePrice` au dernier prix (pas FIFO/LIFO)
- **RG-P5** : `alertThreshold` : alerte quand `stockQuantity ≤ alertThreshold`

---

## 12. Module Dépenses

- Catégorie libre (string non contrôlée)
- `amount > 0`
- `expenseDateIso` requis (format ISO date)
- Suppression : ADMIN uniquement
- Intégrées aux rapports financiers (daily/monthly/yearly)

---

## 13. Module Rapports et Dashboard

### Rapports API

```
/api/reports/daily?date=YYYY-MM-DD
    totalSales     = Σ(mockSales.total)  [BUG: toutes les ventes, pas filtrées par date !]
    transactionsCount = non calculé      [BUG: champ manquant dans la réponse]
    profit         = Σ(mockSales.profit) [BUG: idem - pas filtré]
    expenses       = Σ(expense.amount WHERE expenseDateIso = date)
    stockAlertsCount = nb produits en alerte

/api/reports/monthly?month=YYYY-MM
    totalSales  = Σ(mockSales.total) [BUG: non filtré par mois]
    profitNet   = profit − expenses
    expenses    = Σ(expense.amount WHERE slice(0,7) = month)
    lossCount   = 0 [HARDCODÉ]

/api/reports/yearly?year=YYYY
    totalSales  = Σ(mockSales.total) [BUG: non filtré par année]
    profitNet   = profit − expenses
    expenses    = Σ(expense.amount WHERE slice(0,4) = year)
```

### Dashboard (calculs côté client, DashboardFacade)

```
KPIs :
    stockTotal       = Σ(product.stockQuantity)  [somme de TOUS les entrepôts ?]
    todaySalesTotal  = Σ(sale.total WHERE createdAt.slice(0,10) = today)
    todayProfit      = Σ(sale.profit WHERE createdAt.slice(0,10) = today)

Graphique ventes par jour : 14 derniers jours
Top produits : 8 meilleurs par CA
Stock evolution : simulation basée sur stockTotal actuel × facteur décroissant (fictif)
```

---

## 14. Module Audit Logs

### Actions tracées

`CREATE` | `UPDATE` | `DELETE` | `LOGIN` | `LOGOUT` | `EXPORT` | `RECEIVE` | `PAY` | `TRANSFER` | `OPEN` | `CLOSE`

### Entités suivies

`PRODUCT` | `SALE` | `SUPPLIER` | `PURCHASE_ORDER` | `EXPENSE` | `INVENTORY_SESSION` | `CASH_REGISTER_SESSION` | `WAREHOUSE_TRANSFER` | `CUSTOMER` | `USER` | `SYSTEM`

### Règles d'audit

- `appendAudit()` est appelé manuellement (non exhaustif)
- Limité à 500 entrées en mémoire (`.slice(0, 500)`)
- `ipAddress` = `127.0.0.1` pour toutes les actions via mock
- `userRole` = `'ADMIN'` par défaut si non fourni

---

## 15. Diagrammes de flux

### Flux de vente

```
CLIENT              CAISSIER (UI)              API (Intercepteur)          STOCK
  │                      │                           │                        │
  │ Commande produits     │                           │                        │
  │──────────────────────►│                           │                        │
  │                       │ addProductToCart()        │                        │
  │                       │ (pricing auto RETAIL)     │                        │
  │                       │                           │                        │
  │ Mode paiement / type  │                           │                        │
  │──────────────────────►│                           │                        │
  │                       │ setSaleType() → reprice   │                        │
  │                       │ setPaidAmount()            │                        │
  │                       │                           │                        │
  │ Confirme              │                           │                        │
  │──────────────────────►│                           │                        │
  │                       │ POST /api/sales ─────────►│                        │
  │                       │                           │ Validation panier      │
  │                       │                           │ Validation crédit      │
  │                       │                           │ Validation stock ─────►│
  │                       │                           │◄──────────────────────│
  │                       │                           │ adjustStock(-qty)─────►│
  │                       │                           │ StockMovement(SALE)    │
  │                       │                           │ appendAudit()          │
  │                       │◄──────────────────── 201  │                        │
  │◄ Reçu ────────────────│                           │                        │
```

### Flux d'achat

```
GESTIONNAIRE           FACADE                   API                   STOCK + FOURNISSEUR
     │                   │                        │                          │
     │ Crée commande      │                        │                          │
     │──────────────────►│ POST /orders ──────────►│                          │
     │                   │                        │ Crée PO (PENDING)        │
     │                   │◄─────────────────────── │                          │
     │                   │                        │                          │
     │ Reçoit marchandise │                        │                          │
     │──────────────────►│ POST /orders/:id/receive►│                          │
     │                   │                        │ PO PENDING ?             │
     │                   │                        │ stockQty += l.qty ───────►│
     │                   │                        │ product.purchasePrice = l.unitPrice
     │                   │                        │ StockMovement(SUPPLY) ───►│
     │                   │                        │ SupplierPurchaseHistory   │
     │                   │                        │ PO → DELIVERED            │
     │                   │◄─────────────────────── │                          │
     │                   │                        │                          │
     │ Facture fournisseur│                        │                          │
     │──────────────────►│ POST /orders/:id/invoice►│                          │
     │                   │                        │ Attache SupplierInvoice  │
     │                   │                        │                          │
     │ Règle paiement     │                        │                          │
     │──────────────────►│ POST /orders/:id/pay ──►│                          │
     │                   │                        │ amount ≤ reste dû ?      │
     │                   │                        │ paidAmount += amount      │
     │                   │                        │ Crée SupplierPayment      │
     │                   │◄─────────────────────── │                          │
```

### Flux d'inventaire

```
GESTIONNAIRE      UI                     API                    STOCK
     │             │                      │                       │
     │ Saisit qtés │                      │                       │
     │────────────►│ POST /inventory/sessions                     │
     │             │─────────────────────►│                       │
     │             │                      │ Pour chaque ligne :   │
     │             │                      │ systemQty = getStock()◄┤
     │             │                      │ diff = physique - sys  │
     │             │                      │ Si diff ≠ 0 :          │
     │             │                      │  setStock(physique) ──►│
     │             │                      │  StockMvt(ADJUSTMENT)  │
     │             │                      │ Crée InventorySession  │
     │             │◄─────────────────────│                       │
     │ Voit rapport│                      │                       │
```

### Flux de caisse

```
CAISSIER               API
   │                    │
   │ Ouvre caisse        │
   │──────────────────►│ POST /cash-register/open
   │                    │ Vérifie : aucune session OPEN
   │                    │ Crée session (OPEN, openingBalance)
   │                    │
   │ Enregistre ventes   │
   │ (via module ventes) │
   │                    │
   │ Ajoute opération    │
   │──────────────────►│ POST /cash-register/operations
   │                    │ Vérifie : session OPEN existe
   │                    │ Crée CashOperation (IN ou OUT)
   │                    │
   │ Ferme caisse        │
   │──────────────────►│ POST /cash-register/close
   │                    │ computeCashSessionSummary()
   │                    │ difference = countedCash - expectedCash
   │                    │ Statut → CLOSED
   │◄──────────────────│ Retourne résumé final
```

---

## 16. Bugs détectés

### 🔴 Critiques

#### B1 — Authentification désactivée en mode dev
**Fichier** : `mock-backend.interceptor.ts:304`
```typescript
// Pendant le dev UI (guards désactivés), on autorise un fallback.
if (!token) return mockUsers[0] ?? null;  // ← retourne admin si pas de token !
```
**Impact** : N'importe quelle requête sans token est acceptée avec les droits admin.  
**Fix** : Supprimer ce fallback ou le conditionner à une variable d'env distincte.

#### B2 — `isAuthenticated` basé sur la présence du token, pas la validité
**Fichier** : `auth.service.ts:53`
```typescript
get isAuthenticated(): boolean {
  return !!this.accessToken;  // ← token peut être expiré
}
```
**Impact** : Un token expiré passe le `authGuard`. L'utilisateur reste "connecté" jusqu'au refresh.

#### B3 — Rapports non filtrés par période
**Fichier** : `mock-backend.interceptor.ts:1788–1893`
```typescript
// Rapport daily
totalSales: mockSales.reduce((a, s) => a + s.total, 0),  // ← TOUTES les ventes
profit: mockSales.reduce((a, s) => a + s.profit, 0),       // ← pas filtrées par date
```
**Impact** : `totalSales`, `profit` du rapport journalier/mensuel/annuel sont identiques peu importe la période demandée.

#### B4 — `transactionsCount` manquant dans la réponse daily
**Fichier** : `mock-backend.interceptor.ts:1786-1795`  
**Impact** : L'interface `DailyReport.transactionsCount` est définie mais jamais peuplée dans le mock.

#### B5 — Réception commande met à jour stockQuantity global, pas par entrepôt
**Fichier** : `mock-backend.interceptor.ts:1150`
```typescript
stockQuantity: (current.stockQuantity ?? 0) + l.quantity,  // ← champ global du Product
```
**Impact** : `product.stockQuantity` (dénormalisé sur le modèle) est mis à jour mais pas `mockWarehouseStocks`. Le stock réel par entrepôt (`getStock(wh, pid)`) n'est PAS mis à jour lors d'une réception. Incohérence totale entre le stock affiché et le stock utilisé pour les validations de vente.

### 🟠 Majeurs

#### B6 — Mutation directe d'objet (appointment status PATCH)
**Fichier** : `mock-backend.interceptor.ts:1695`
```typescript
const appointment = mockAppointments.find(a => a.id === id);
if (appointment) {
  appointment.status = body.status;  // ← mutation directe de l'objet en mémoire
}
```
**Impact** : Mutation de l'objet trouvé par référence → dangereux, contourne l'immuabilité attendue.

#### B7 — Dashboard `stockTotal` somme le champ dénormalisé
**Fichier** : `dashboard.facade.ts:94`
```typescript
const stockTotal = products.reduce((acc, p) => acc + p.stockQuantity, 0);
```
**Impact** : `product.stockQuantity` est un champ potentiellement incohérent (bug B5). Le total affiché peut différer de la réalité multi-entrepôts.

#### B8 — `lossCount` hardcodé à 0 dans les rapports
**Fichier** : `mock-backend.interceptor.ts:1870`
```typescript
lossCount: 0  // ← jamais calculé
```

#### B9 — Double calcul de dette client (inefficace)
**Fichier** : `mock-backend.interceptor.ts:1611-1613`
```typescript
const totalSales = mockSales.filter(s => s.customerId === customerId).reduce(...)
const totalPaidSales = mockSales.filter(s => s.customerId === customerId).reduce(...)
```
**Impact** : Deux parcours O(n) sur le même tableau. Mineur en mock mais problématique sur backend réel.

#### B10 — `computeStockEvolution` (dashboard) est purement fictif
**Fichier** : `dashboard.facade.ts:152`
```typescript
// Sans backend historique, on génère une tendance simple basée sur stock actuel.
const factor = 1 - i * 0.02;  // ← courbe artificielle, pas de données réelles
```
**Impact** : Le graphique d'évolution du stock est faux et trompeur.

### 🟡 Mineurs

#### B11 — `authService.hydrateUserFromApi()` retourne toujours `null`
**Fichier** : `auth.service.ts:79`
```typescript
hydrateUserFromApi(): Observable<User | null> {
  return of(null);  // ← jamais implémenté
}
```

#### B12 — `fullName` du user bridgé = `username` (pas le vrai nom)
**Fichier** : `auth.service.ts:38`
```typescript
fullName: u.username,  // ← devrait être u.fullName
```

#### B13 — Audit log : `STOCK_MOVEMENT` absent des types d'entités
**Fichier** : `audit-log.model.ts:16`
Les transferts génèrent des `StockMovement` mais le type `'STOCK_MOVEMENT'` n'est pas dans `AuditEntityType`. Le log utilise `'WAREHOUSE_TRANSFER'` mais `appendAudit()` n'est pas appelé pour les mouvements manuels de stock.

#### B14 — Suppression d'un fournisseur laisse les PO orphelins
**Fichier** : `mock-backend.interceptor.ts:840`
```typescript
mockSupplierPurchases = mockSupplierPurchases.filter(p => p.supplierId !== id);
// mockPurchaseOrders non nettoyés → référence supplierId invalide
```

---

## 17. Problèmes d'architecture

### A1 — Double service d'authentification (incohérence)

```
core/services/auth.service.ts       ← ancien service
auth/services/auth.service.ts       ← nouveau service (importé dans l'ancien)
```
`AuthService` (core) délègue à `AuthService` (auth feature) et reconstruit un `User` partiel.  
**Problème** : deux sources de vérité, `fullName` incorrect (B12), `email` bridgé, `roles` dépendent d'un cast `as unknown as any`.

### A2 — Champ `product.stockQuantity` dénormalisé et incohérent

`Product.stockQuantity` est à la fois :
- Un champ du modèle TypeScript
- Une valeur calculée par entrepôt (`mockWarehouseStocks`)
- Mis à jour lors de la réception mais PAS dans `mockWarehouseStocks`

**Impact** : les validations de vente utilisent `getStock(wh, pid)` (cohérent) mais l'affichage `product.stockQuantity` est incohérent après réception (B5).

### A3 — Pas de transaction / atomicité sur les opérations multi-step

Exemple vente : si l'audit log échoue après le débit stock → état partiel.  
En mock ce n'est pas critique mais sur API réelle, chaque opération multistep (vente → stock → audit) doit être transactionnelle.

### A4 — `InventoryFacade.refresh()` déclenche deux appels API

```typescript
refresh(): void {
  this.isLoadingSubject.next(true);
  this.productsApi.list()  // ← appel 1 (subscribe direct)
    .pipe(finalize(...))
    .subscribe({
      next: () => this.refreshSubject.next(undefined),  // ← déclenche appel 2 via products$
```
**Impact** : double requête à chaque rafraîchissement de la page inventaire.

### A5 — `createSale()` retourne `unknown` au lieu d'`Observable<Sale>`

**Fichier** : `sales.facade.ts:151`
```typescript
createSale(): unknown { ... }
```
Idem dans `purchases.facade.ts`, `stock.facade.ts`, etc.  
**Impact** : perte totale du typage TypeScript sur le retour des mutations. Impossible de chaîner `.pipe()` sans cast.

### A6 — Filtre client côté UI uniquement, pas côté API

`ClientsFacade.setFilter()` stocke un string dans `filterSubject` mais le filtre n'est jamais appliqué dans une opération `filter()` sur les données. La liste ne se filtre que si le composant HTML s'en charge.

### A7 — `mockAuditLogs` limité à 500 entrées mais aucune pagination côté API

La liste des audit logs retourne **tous** les logs sans pagination (juste `page/size` côté paramètre mais la slice n'est pas toujours appliquée uniformément).

### A8 — Gestion d'erreurs generique (`e instanceof Error ? e.message : 'Erreur'`)

Toutes les facades utilisent le même pattern de catch minimal. Les erreurs HTTP avec code 4xx/5xx sont toutes transformées en string générique, perdant le code HTTP original.

---

## 18. Recommandations

### Priorité 1 — Corrections critiques

| # | Action | Fichier |
|---|---|---|
| R1 | Corriger bug B5 : `adjustStock()` côté entrepôt à la réception | `mock-backend.interceptor.ts:1143` |
| R2 | Corriger bug B3 : filtrer les ventes par période dans les rapports | `mock-backend.interceptor.ts:1788` |
| R3 | Supprimer fallback admin sans token (B1) | `mock-backend.interceptor.ts:304` |
| R4 | Typer les retours de mutations en `Observable<T>` (A5) | toutes les facades |

### Priorité 2 — Qualité métier

| # | Action |
|---|---|
| R5 | Unifier les deux `AuthService` en un seul |
| R6 | Implémenter `transactionsCount` dans les rapports daily |
| R7 | Corriger la mutation directe d'appointment (B6) |
| R8 | Ajouter un statut `CANCELLED` pour les commandes fournisseurs |
| R9 | Implémenter FIFO/LIFO pour le prix d'achat moyen pondéré (PMP) |
| R10 | Ajouter validation max `countedCash` différence en caisse |

### Priorité 3 — Architecture

| # | Action |
|---|---|
| R11 | Supprimer `product.stockQuantity` du modèle ou en faire un champ calculé côté API |
| R12 | Ajouter pagination côté API pour audit-logs et sales |
| R13 | Standardiser la gestion d'erreurs HTTP (garder le status code) |
| R14 | Corriger la double requête dans `InventoryFacade.refresh()` |
| R15 | Remplacer `computeStockEvolution` fictif par données réelles (historique mouvements) |

---

*Fin de l'audit — v1.0 — Mai 2026*
