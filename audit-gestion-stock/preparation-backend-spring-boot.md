# GestStock — Audit technique de préparation du backend Spring Boot

*Commit analysé : `3945251` (branche `main`), 3 octobre 2026. Lecture seule : aucun fichier du dépôt n'a été modifié.*

**Abréviations.** **MBI** = `src/app/core/interceptors/mock-backend.interceptor.ts` (backend simulé, 1 976 lignes, 69 handlers). Les chemins sont relatifs à `src/app/`. Les numéros de ligne sont ceux du commit `3945251`.

**Statuts.** EXISTE · PARTIEL · ABSENT · PROBLÉMATIQUE · À CONFIRMER.

---

## A. Architecture actuelle

### A.1 Repository

| Élément | Constat |
|---|---|
| Type | Mono-projet Angular CLI (`angular.json`, projet `gestion-stock`). **Aucun code serveur**, aucun `pom.xml`/`build.gradle`, aucun Docker. |
| Taille | 257 fichiers suivis ; TS 12 624 l., HTML 3 381 l., SCSS 2 837 l. |
| Docs | `README.md` (générique CLI), `TECHNICAL_AUDIT.md` (audit mai 2026), `DATABASE_SCHEMA.md` (MongoDB « reconstruit »). |
| Schémas de BD proposés (non utilisés) | `core/mocks/seeds/sql-seed.sql` (PostgreSQL : 20 tables, 11 index, `uuid-ossp`, `pgcrypto`), `mongo-seed.js`, `mongo-seed-large.js`. Utiles comme brouillon, **pas comme source de vérité** (ils reproduisent les défauts du modèle front). |
| Environnements | `environments/environment.ts` : `useMocks: true`, `apiUrl: http://localhost:3000/api`. `environment.prod.ts` : `useMocks: false`, `apiUrl: https://api.example.com/api` (factice). |
| Tests | `app.spec.ts` uniquement : 2 tests, 1 en échec. |

### A.2 Architecture Angular

```
routing.ts ─► /login, /forgot-password, '' ─► layout.routes.ts (LayoutShell, 15 features lazy)
features/<domaine>/
   data/   <domaine>.facade.ts (BehaviorSubject + combineLatest → vm$), *-vm.model.ts
   pages/  composants routés
   ui/     drawers, dialogs
core/
   models/        19 interfaces = contrat de données de fait
   services/      14 *-api.service.ts (HttpClient fins) + auth, token-storage, warehouse-context
   interceptors/  apiError, warehouse (X-Warehouse-Id), mockBackend, jwt (dans auth/)
   guards/        authGuard, roleGuard — NON BRANCHÉS
auth/            AuthService « nouveau » (login/refresh/logout), jwtInterceptor, guards, modèles
```

**Chaîne HTTP réelle** (`app.config.ts:21`) : `apiErrorInterceptor → warehouseInterceptor → mockBackendInterceptor → jwtInterceptor`.

- Avec `useMocks=true`, le mock répond **avant** que le JWT ne soit ajouté. Il ne reçoit donc jamais de token et retombe sur l'admin (MBI:377-382).
- Avec `useMocks=false`, le mock appelle `next(req)` (MBI:392). Le JWT est alors ajouté **correctement** et la requête part vers `environment.apiUrl`.

**Conséquence clé** : le front est déjà prêt à parler à un vrai backend. Il suffit de passer `useMocks=false` et de servir l'API sous `apiUrl`.

### A.3 Couches et appels

- **Facades** : products, stock, sales, clients, suppliers, purchases, cash-register, expenses, inventory, dashboard, reports, users.
- **Pages qui appellent directement les ApiServices** (sans facade) : appointments, audit-logs, client-detail, supplier-detail, inventory-history, warehouses (list + transfer), layout (liste des dépôts).
- **Gestion d'erreur** : `apiErrorInterceptor` affiche `err.error.message` dans une snackbar. Les 11 copies de `toApiError` lisent aussi `err.error.message`.

### A.4 Sécurité front actuelle

| Point | État | Preuve |
|---|---|---|
| Guards sur routes | ABSENT (écrits, jamais utilisés) | `routing.ts`, `layout.routes.ts` |
| Stockage tokens | `localStorage` (« se souvenir ») ou `sessionStorage` | `auth/services/auth.service.ts:40-47` |
| Refresh | Sur 401 : `POST /auth/refresh {refreshToken}`, puis rejoue la requête ; échec → logout | `auth/interceptors/jwt.interceptor.ts:22-34` |
| URLs publiques | `/auth/login`, `/auth/forgot-password` | `jwt.interceptor.ts:7` |
| Deux modèles d'utilisateur | `auth/models/user.model.ts` (`role: ADMIN|MANAGER|EMPLOYEE`), `core/models/user.model.ts` (`roles: ADMIN|CAISSIER|GESTIONNAIRE`) | — |

---

## B. Fonctionnalités existantes (côté interface)

| # | Domaine | Écran / route | Statut UI | Statut logique (mock) |
|---|---|---|---|---|
| 1 | Auth | `/login`, `/forgot-password` | EXISTE | PROBLÉMATIQUE (mdp `admin` universel) |
| 2 | Rôles/permissions | — | PARTIEL (`users.facade` `canManage`) | PROBLÉMATIQUE (inopérant en mock) |
| 3 | Produits | `/products` | EXISTE | PARTIEL |
| 4 | Catégories | sélecteur dans fiche produit | PARTIEL (lecture) | PARTIEL (`GET` seul) |
| 5 | Marques | — | ABSENT | ABSENT |
| 6 | Stock / mouvements | `/stock` | EXISTE | PROBLÉMATIQUE |
| 7 | Entrepôts / transferts | `/warehouses`, `/warehouses/transfer`, sélecteur d'en-tête | EXISTE | PARTIEL |
| 8 | Fournisseurs | `/suppliers`, `/suppliers/:id` | EXISTE | PARTIEL |
| 9 | Achats | `/purchases` (drawer création + détail) | EXISTE | PROBLÉMATIQUE |
| 10 | Réceptions | bouton « Réceptionner » (confirmation) | PARTIEL (totale uniquement) | PROBLÉMATIQUE (stock dépôt non incrémenté) |
| 11 | Clients | `/clients`, `/clients/:id` | EXISTE | PARTIEL |
| 12 | Ventes (POS) | `/sales` + facture PDF | EXISTE | PROBLÉMATIQUE (prix client) |
| 13 | Caisse | `/cash-register/open|close|history` | EXISTE | PARTIEL (session globale) |
| 14 | Inventaires | `/inventory/count|history` | EXISTE | PROBLÉMATIQUE (application immédiate) |
| 15 | Retours | — | ABSENT | ABSENT |
| 16 | Alertes | libellé « Stock faible / Rupture » | PARTIEL | ABSENT côté API |
| 17 | Audit | `/audit-logs` | EXISTE | PROBLÉMATIQUE (2 actions tracées) |
| 18 | Dashboard | `/dashboard` | EXISTE | PARTIEL (calcul client, courbe fictive) |
| 19 | Rapports | `/reports` | EXISTE | PARTIEL (calcul client) ; `/api/reports/*` faux et non utilisés |
| 20 | Dépenses | `/expenses` | EXISTE | PARTIEL |
| 21 | Rendez-vous | `/appointments` | EXISTE | PARTIEL |
| 22 | Utilisateurs | `/users` | EXISTE | PARTIEL (pas de mot de passe) |

---

## C. Contrats API existants, domaine par domaine

### C.0 Conventions transverses (à reproduire à l'identique en V1)

| Convention | Valeur actuelle | Preuve |
|---|---|---|
| Préfixe | `{apiUrl}` = `http://localhost:3000/api` (dev) | `environment.ts` |
| En-tête dépôt | `X-Warehouse-Id: <id>` sur **toutes** les requêtes (défaut `wh_1`, persistant en `localStorage.warehouse_id`) | `warehouse.interceptor.ts`, `warehouse-context.service.ts` |
| Auth | `Authorization: Bearer <accessToken>` (sauf login/forgot) | `jwt.interceptor.ts` |
| Liste | `{ "items": T[], "total": number }` (`PaginatedResult<T>`, `products-api.service.ts:3`) ; le front lit presque toujours `items` seul | — |
| Pagination | Seuls audit-logs et appointments : `?page=<0-based>&size=<n>` | `audit-logs-api.service.ts`, `appointments-api.service.ts` |
| Erreur | Corps `{ "message": "..." }` + statut 400/401/403/404 ; le message est **affiché tel quel** à l'utilisateur | MBI:335-343, `api-error.interceptor.ts:7` |
| Création | `201` + objet créé | MBI (tous les POST de création) |
| Suppression | `200 { "ok": true }` (sauf RDV : `204` sans corps) | MBI:728, 1761 |
| Identifiants | Chaînes opaques (`p_1`, `wh_1`, `s_01`…) ; le front ne les interprète jamais, sauf le défaut `wh_1` | — |
| Horodatages | ISO-8601 UTC complet (`createdAt`, `openedAt`, `deliveredAt`…) ; le front fait `createdAt.slice(0,10)` pour grouper par jour | `dashboard.facade.ts:102`, `reports.facade.ts:113` |
| Dates métier | `YYYY-MM-DD` (`paymentDateIso`, `expenseDateIso`, `invoiceDateIso`) | `pay-*-dialog.component.ts:32` |
| Montants | `number` JSON (FCFA, entiers en pratique) | `mock-db.ts` |

### C.1 Authentification

- **Front attend** :
  - `POST /auth/login {username, password}` renvoie `{accessToken, refreshToken, expiresIn, user}`. `expiresIn` est en **secondes** : le front calcule l'expiration `Date.now()+expiresIn*1000`.
  - `user` doit contenir `id, username, email, role` (`ADMIN|MANAGER|EMPLOYEE`), lus par le layout (`user.username[0]`, `user.email`, `user.role`) et le bridge `core/services/auth.service.ts:33-46`.
  - L'écran Utilisateurs utilise en parallèle `roles: ('ADMIN'|'CAISSIER'|'GESTIONNAIRE')[]`.
- **Endpoints simulés** :
  - `POST /auth/login` ;
  - `POST /auth/refresh {refreshToken}` → même forme que login ;
  - `POST /auth/forgot-password {email}` → `{message}` ou `404` ;
  - `GET /auth/me` → User (non utilisé par le front).
- **Règles visibles** : login refusé si identifiants vides (400), utilisateur inconnu (401) ou mot de passe ≠ `admin` (401). TTL : access 1 h, refresh 30 j (`jwt.sim.ts:38-39`).
- **Validations** : UI `username`/`password` requis ; `email` au format email.
- **Problèmes** : `isActive` non vérifié ; refresh sans contrôle de signature ni d'expiration ; énumération d'emails ; pas de `logout` serveur ; deux modèles de rôles.
- **Manquant** : mot de passe haché, changement et réinitialisation réels, verrouillage, révocation.

### C.2 Rôles et permissions

- **Rôles** : `ADMIN`, `GESTIONNAIRE`, `CAISSIER` (`core/models/role.model.ts`) ; alias d'affichage `ADMIN/MANAGER/EMPLOYEE`.
- **Matrice appliquée par MBI** (32 contrôles) :

| Ressource | Lecture | Création | Modification | Suppression / action |
|---|---|---|---|---|
| products | auth | ADMIN, GEST | ADMIN, GEST | ADMIN |
| categories | auth | — | — | — |
| warehouses | auth | ADMIN, GEST | — | transfert : ADMIN, GEST |
| stock/movements | auth | **auth (aucun rôle)** | — | — |
| suppliers | auth | ADMIN, GEST | ADMIN, GEST | ADMIN ; paiements : ADMIN, GEST |
| purchases/orders | auth | ADMIN, GEST | — | receive/invoice/pay : ADMIN, GEST |
| customers | auth | **auth** | ADMIN, GEST, CAISSIER | ADMIN ; paiements : ADMIN, GEST, CAISSIER |
| sales | auth | **auth** | — | — |
| cash-register | auth | open/operations/close : 3 rôles | — | — |
| inventory/sessions | auth | ADMIN, GEST | — | — |
| expenses | auth | ADMIN, GEST | — | ADMIN |
| users | ADMIN | ADMIN | ADMIN | ADMIN |
| audit-logs | ADMIN | — | — | — |
| appointments | auth | **auth** | **auth** | **auth** |
| reports | auth | — | — | — |

- **Front** : aucun filtrage du menu ; `canManage` (ADMIN) dans Utilisateurs uniquement.
- **Manquant** : permissions fines, portée par dépôt, interdiction de supprimer le dernier admin.

### C.3 Produits

- **Front attend** : `Product { id, sku, name, categoryId, categoryName?, supplierId?, purchasePrice, retailPrice, wholesalePrice, stockQuantity, alertThreshold }`. `stockQuantity` est le **stock du dépôt de l'en-tête**.
- **Endpoints** :
  - `GET /products` → `{items,total}` (sans paramètre ; filtrage, tri et pagination côté client) ;
  - `GET /products/{id}` ;
  - `POST /products` (payload = Product sans `id`, **inclut** `stockQuantity` initial et `categoryName`) → 201 ;
  - `PUT /products/{id}` (payload complet, sémantique partielle, **modifie le stock** du dépôt) ;
  - `DELETE /products/{id}` → `{ok:true}`.
- **Validations UI** (`product-drawer.component.ts:65-75`) : `sku` requis ≤ 50 ; `name` requis ≤ 200 ; `categoryId` requis ; prix ≥ 0 ; `stockQuantity` ≥ 0 ; `alertThreshold` ≥ 0.
- **Règles visibles** :
  - à la création, stock 0 dans tous les dépôts, puis stock initial dans le dépôt courant ;
  - libellé UI « Rupture » si stock ≤ 0, « Stock faible » si stock ≤ seuil ;
  - SKU auto `SKU-XXXX` si absent.
- **Relations** : Category (N:1), Supplier (N:1 optionnel), stock par dépôt (1:N).
- **Problèmes** :
  - pas d'unicité SKU ;
  - nom vide accepté par l'API ;
  - stock modifié sans mouvement ;
  - suppression physique sans contrôle des références ;
  - audit seulement sur PUT.
- **Manquant** : barcode, marque, unité, TVA, statut actif, description, image, seuil max, CUMP, historique des prix.

### C.4 Catégories

- **Front attend** : `Category { id, name }` via `GET /categories` → `{items,total}`.
- **Simulé** : lecture seule ; 5 catégories figées (`mock-db.ts:29-35`).
- **Manquant** : CRUD, unicité, hiérarchie, activation, écran de gestion.

### C.5 Marques

ABSENT : ni modèle, ni endpoint, ni champ. La marque n'apparaît que dans les libellés de produits.

### C.6 Stock

- **Front attend** : `StockMovement { id, productId, quantity (signé), reason: SUPPLY|SALE|LOSS|ADJUSTMENT, createdAt, createdByUserId, note? }`.
- **Endpoints** :
  - `GET /stock/movements?from=<ISO>&to=<ISO>&productId=<id>` (paramètres optionnels) → `{items,total}`. Le front enrichit lui-même nom et SKU à partir de la liste produits ;
  - `POST /stock/movements {productId, quantity, reason, note?}` → 201.
- **Mapping UI** (`stock-movement-drawer.component.ts:53-58`) : SUPPLY +, SALE −, LOSS −, ADJUSTMENT **toujours +** (aucun ajustement négatif possible depuis l'UI).
- **Règles** : quantité ≠ 0 ; refus si le stock du dépôt deviendrait < 0 ; le mouvement s'applique au dépôt de l'en-tête.
- **Stockage simulé** : `Record<warehouseId, Record<productId, qty>>` (MBI:309-327) + `Product.stockQuantity` séparé (seconde source).
- **Problèmes** :
  - mouvement **sans `warehouseId`** ;
  - pas de pagination ;
  - pas de contrôle de rôle ;
  - motif `SALE` saisissable manuellement sans vente ;
  - aucun lien vers la pièce source ;
  - aucun audit.
- **Manquant** : `GET` des niveaux de stock par dépôt et consolidé, réservé/disponible, motifs `INITIAL/TRANSFER_IN/TRANSFER_OUT/RETURN/INVENTORY`.

### C.7 Entrepôts / magasins

- **Front attend** : `Warehouse { id, name }`.
- **Endpoints** :
  - `GET /warehouses` → `{items,total}` (sélecteur d'en-tête) ;
  - `POST /warehouses {name}` → 201 ;
  - `POST /warehouses/transfer {fromWarehouseId, toWarehouseId, productId, quantity}` → `{ok:true}`.
- **Validations** : nom requis, unique (insensible à la casse) ; transfert : dépôts différents et existants, quantité > 0 (UI ≥ 1), stock source suffisant.
- **Effets** : 2 mouvements `ADJUSTMENT` (−/+) avec note `Transfert A -> B`.
- **Problèmes** : transfert immédiat et mono-produit ; aucun dépôt rattaché aux pièces ; dépôt `wh_1` codé en dur côté front (défaut) et côté mock.
- **Manquant** : `PUT/DELETE` ou désactivation, code, adresse, type, droits utilisateur ↔ dépôt.

### C.8 Fournisseurs

- **Front attend** :
  - `Supplier { id, name, phone?, email?, address?, deliveryLeadTimeDays }` ;
  - `SupplierPurchaseHistory { id, supplierId, purchaseDateIso (datetime ISO), reference, itemsCount, totalAmount }` ;
  - `SupplierPayment { id, supplierId, paymentDateIso, amount, orderId?, note? }`.
- **Endpoints** :
  - `GET/POST /suppliers` ;
  - `GET/PUT/DELETE /suppliers/{id}` ;
  - `GET /suppliers/{id}/purchases` ;
  - `GET/POST /suppliers/{id}/payments {amount, paymentDateIso, orderId?, note?}`.
- **Calcul front** (`supplier-detail-page.component.ts:79-81`) : `balance = Σ history.totalAmount − Σ payments.amount`.
- **Validations** : nom requis ; délai ≥ 0 ; paiement > 0, date requise, ≤ reste à payer de la commande si `orderId`.
- **Problèmes** :
  - suppression qui efface l'historique mais laisse les commandes ;
  - un paiement sans `orderId` ne réduit le `paidAmount` d'aucune commande, donc **deux soldes divergents** (par commande / par fournisseur) ;
  - l'historique est une table dupliquée de la réception.
- **Manquant** : statut actif, conditions de paiement, échéances.

### C.9 Achats (commandes fournisseurs)

- **Front attend** :
  - `PurchaseOrder { id, supplierId, supplierName, status: PENDING|DELIVERED, createdAt, deliveredAt?, lines: [{productId, productSku, productName, quantity, unitPurchasePrice, lineTotal}], totalAmount, paidAmount, invoice?: {invoiceNumber, invoiceDateIso, totalAmount} }`.
- **Endpoints** :
  - `GET /purchases/orders` ;
  - `GET /purchases/orders/{id}` ;
  - `POST /purchases/orders {supplierId, lines:[{productId, quantity, unitPurchasePrice}]}` → 201 ;
  - `POST /purchases/orders/{id}/invoice {invoiceNumber, invoiceDateIso}` → `SupplierInvoice` 201 ;
  - `POST /purchases/orders/{id}/pay {amount, paymentDateIso, note?}` → `PurchaseOrder` mis à jour.
- **Validations** : fournisseur requis et existant ; ≥ 1 ligne ; produit existant ; quantité > 0 ; prix ≥ 0.
- **Règles** : `totalAmount = Σ qty × prix` ; paiement ≤ reste dû ; facture indépendante du paiement.
- **Problèmes** :
  - aucune annulation ni modification ;
  - pas de dépôt de destination ;
  - deux routes de paiement redondantes (C.8 / C.9) ;
  - la facture reprend le total de la commande.

### C.10 Réceptions

- **Endpoint** : `POST /purchases/orders/{id}/receive {}`. Le service prévoit `{deliveredAtIso?}`, que la facade n'envoie pas et que le mock ignore. Retourne `PurchaseOrder` (`status=DELIVERED`, `deliveredAt`).
- **Effets simulés** (MBI:1219-1259) :
  - `product.stockQuantity += qty` ;
  - `product.purchasePrice = unitPurchasePrice` ;
  - mouvement `SUPPLY` ;
  - ligne d'historique fournisseur.
- **Bug bloquant** : **le stock par dépôt n'est pas incrémenté**, alors que l'API produits renvoie ce stock-là (MBI:530).
- **Manquant** : réceptions partielles multiples, dépôt de réception, écarts, contrôle qualité, CUMP.

### C.11 Clients

- **Front attend** :
  - `Customer { id, name, phone?, email?, creditLimit }` ;
  - `CustomerPayment { id, customerId, paymentDateIso, amount, note? }`.
- **Endpoints** :
  - `GET/POST /customers` ;
  - `GET/PATCH/DELETE /customers/{id}` (mise à jour en **PATCH**, payload complet sans `id`) ;
  - `GET /customers/{id}/sales` → ventes du client ;
  - `GET/POST /customers/{id}/payments {amount, paymentDateIso, note?}`.
- **Calcul front** (`client-detail-page.component.ts:84-87`) : `debt = Σ sales.total − Σ sales.paidAmount − Σ payments.amount`. Le front plafonne la saisie du paiement à `debt`, mais **pas l'API**.
- **Validations** : nom requis ; `creditLimit` ≥ 0 (sinon remis à 0 en PATCH) ; paiement > 0 et date requise.
- **Problèmes** : surpaiement accepté par l'API ; suppression qui efface les paiements mais garde les ventes ; création ouverte à tout utilisateur authentifié.

### C.12 Ventes

- **Front attend** :
  - `Sale { id, type: RETAIL|WHOLESALE, customerId?, items:[{productId, quantity, unitPrice, purchasePrice}], paymentMethod: CASH|MOBILE_MONEY|BANK_TRANSFER, paidAmount, total, profit, createdAt, createdByUserId }`.
- **Endpoints** :
  - `GET /sales` → **toutes** les ventes (utilisé par dashboard, rapports, POS) ;
  - `POST /sales {type, customerId?, paymentMethod, paidAmount, items:[{productId, quantity, unitPrice, purchasePrice}]}` → 201 `Sale`.
- **Règles** :
  - panier non vide ;
  - quantité > 0 (entière : `Math.floor` côté UI) ;
  - `0 ≤ paidAmount ≤ total` (défaut `total`) ;
  - si client : plafond `currentDebt + (total − paidAmount) ≤ creditLimit` ;
  - stock du dépôt suffisant pour chaque ligne ;
  - décrément + mouvement `SALE` par ligne ;
  - audit `CREATE SALE`.
  - Prix détail/gros choisi côté UI.
  - UI : crédit (`paidAmount < total`) exige un client (`sales-shell-page.component.ts:181`).
- **Problèmes** :
  - `unitPrice` et `purchasePrice` **pris du client** ;
  - crédit sans client accepté par l'API ;
  - aucun `warehouseId`, numéro de facture, statut, lien caisse ;
  - pas de `GET /sales/{id}` ;
  - pas de pagination ni de filtre de période.
- **Manquant** : annulation, retours, remises, TVA, paiement mixte, numérotation légale.

### C.13 Caisse

- **Front attend** :
  - `CashRegisterSession { id, status: OPEN|CLOSED, openedAt, openedByUserId, openingBalance, closedAt?, closedByUserId?, countedCash?, cashSalesTotal, totalIn, totalOut, expectedCash, difference }` (champs calculés serveur) ;
  - `CashOperation { id, sessionId, type: IN|OUT, amount, createdAt, createdByUserId, note? }`.
- **Endpoints** :
  - `GET /cash-register/current` → session ou **`null`** ;
  - `GET /cash-register/sessions` ;
  - `POST /cash-register/open {openingBalance}` → 201 ;
  - `POST /cash-register/operations {type, amount, note?}` → 201 ;
  - `GET /cash-register/sessions/{id}/operations` ;
  - `POST /cash-register/close {countedCash}`.
- **Calculs** (MBI:268-297) :
  - `cashSalesTotal` = Σ `paidAmount` des ventes `CASH` entre ouverture et clôture (ou maintenant) ;
  - `expectedCash = openingBalance + cashSalesTotal + totalIn − totalOut` ;
  - `difference = countedCash − expectedCash`.
- **Règles** : une seule session `OPEN` au total ; opérations et clôture seulement si une session est ouverte ; montants ≥ 0 / > 0.
- **Problèmes** :
  - session **globale** (ni poste, ni dépôt, ni opérateur) ;
  - vente rattachée par fenêtre horaire et non par clé ;
  - vente cash possible caisse fermée ;
  - encaissement de créance client non compté.

### C.14 Inventaires

- **Front attend** : `InventorySession { id, createdAt, createdByUserId, note?, lines:[{productId, productSku, productName, systemQuantity, physicalQuantity, difference}], itemsCount, totalDifference }`.
- **Endpoints** :
  - `GET /inventory/sessions` (tri décroissant) ;
  - `GET /inventory/sessions/{id}` ;
  - `POST /inventory/sessions {note?, lines:[{productId, physicalQuantity}]}` → 201.
- **Règles** :
  - le stock théorique est relu côté serveur au moment de l'envoi ;
  - chaque écart ≠ 0 donne `setStock(physique)` + mouvement `ADJUSTMENT` ;
  - application **immédiate**.
- **UI** : tous les produits listés, quantité physique **pré-remplie = stock théorique**, toutes les lignes envoyées.
- **Problèmes** : pas de dépôt dans la session ; pas de statut ni de validation ; écarts non justifiés ; articles non comptés réputés conformes.

### C.15 Retours

ABSENT (client et fournisseur) : ni modèle, ni endpoint, ni écran.

### C.16 Alertes

PARTIEL : seul le calcul UI `stockQuantity ≤ alertThreshold` existe (`products.facade.ts:290-298`). `DailyReport.stockAlertsCount` existe, mais est calculé faux (sur le champ produit, MBI:1868) et n'est pas utilisé. Aucune alerte de péremption, de retard fournisseur ou de créance.

### C.17 Audit

- **Front attend** :
  - `AuditLogEntry { id, createdAt, userId, username, userRole, action, entityType, entityId, entityLabel, ipAddress, status: SUCCESS|FAILURE, changes?:[{field, oldValue, newValue}], details?, before?, after?, meta? }` ;
  - `AuditLogStats { totalToday, failuresLast7Days, mostActiveUser, mostFrequentAction }`.
- **Énumérations** :
  - `action` ∈ CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, RECEIVE, PAY, TRANSFER, OPEN, CLOSE ;
  - `entityType` ∈ PRODUCT, SALE, SUPPLIER, PURCHASE_ORDER, EXPENSE, INVENTORY_SESSION, CASH_REGISTER_SESSION, WAREHOUSE_TRANSFER, CUSTOMER, USER, SYSTEM.
  - Les données de démo utilisent en plus STOCK_MOVEMENT, CUSTOMER_PAYMENT, SUPPLIER_PAYMENT, REPORT, WAREHOUSE (hors type).
- **Endpoints** :
  - `GET /audit-logs?page&size&dateFrom&dateTo&actions=A,B&entityTypes=X,Y&userId&status&search` → `{items,total}` ;
  - `GET /audit-logs/{id}` ;
  - `GET /audit-logs/stats` ;
  - `GET /audit-logs/export?...` → **CSV `text/csv`**, séparateur `;`, en-tête `Date;Utilisateur;Rôle;Action;Entité;ID Entité;Label;IP;Statut;Détails`.
- **Problèmes** : alimentation réelle limitée à `PUT /products` et `POST /sales` ; données de démo codées en dur ; IP fixe ; plafond de 500 entrées.

### C.18 Dashboard

- **Front** : aucun endpoint dédié. Il appelle `GET /products` + `GET /sales` et calcule (`dashboard.facade.ts`) :
  - CA et marge du jour ;
  - Σ unités en stock (dépôt courant) ;
  - ventes par jour sur 14 jours ;
  - top 8 produits ;
  - « évolution du stock » **fictive**.
- **Manquant** : endpoint d'agrégats serveur (valeur du stock, ruptures, sous seuil, créances, dettes).

### C.19 Rapports

- **Front** : la page `/reports` utilise `GET /products` + `GET /sales` et filtre côté client par jour, mois ou année (`reports.facade.ts:110-121`) : CA, marge brute, nombre de transactions, top produits, séries, export Excel (xlsx).
- **Endpoints simulés non utilisés** : `GET /reports/daily?date=YYYY-MM-DD`, `/monthly?month=YYYY-MM`, `/yearly?year=YYYY`. Ils renvoient `DailyReport{date,totalSales,transactionsCount,profit,expenses,stockAlertsCount}`, `MonthlyReport{month,totalSales,profitNet,expenses,lossCount}` et `YearlyReport{year,totalSales,profitNet,expenses}`, avec des totaux **non filtrés** (faux). Seul consommateur : `ReportsPageComponent`, non routé.

### C.20 Dépenses (hors liste demandée, mais présent)

- `Expense { id, category (texte libre), label, amount, expenseDateIso, createdAt, createdByUserId, note? }`.
- `GET /expenses` (tri date décroissante) ; `POST /expenses` (ADMIN, GEST) ; `DELETE /expenses/{id}` (ADMIN).
- Validations : catégorie, libellé et date requis ; montant > 0.

### C.21 Rendez-vous (hors liste, présent)

- `Appointment { id, customerName, phone, dateTime (ISO), status: SCHEDULED|COMPLETED|CANCELLED, note? }`.
- `GET /appointments?page&size&search&status&dateFrom&dateTo` (paginé) ; `GET/PUT/DELETE /appointments/{id}` ; `POST /appointments` ; `PATCH /appointments/{id}/status`.
- `PATCH /status` est bogué (MBI:1768, id lu à l'index `[4]` = `"status"`) mais non appelé. Aucun contrôle de rôle.

### C.22 Utilisateurs

- `GET /users` ; `POST /users {username, fullName, phone?, roles, isActive}` ; `PUT /users/{id} {username, fullName, phone?, roles}` ; `PATCH /users/{id}/active {isActive}` ; `DELETE /users/{id}`. Tout est réservé à ADMIN.
- Validations : username requis et unique (insensible à la casse) ; nom complet requis ; ≥ 1 rôle.
- Manquant : mot de passe, email obligatoire, dépôts autorisés.

### C.23 Tests existants

`app.spec.ts` : « should create the app » (OK) et « should render title » (échec : attend un `<h1>Hello, gestion-stock</h1>` qui n'existe plus). Aucun test de facade, de service ou de règle métier. Vitest est configuré (`ng test`).

---

## D. Modèles métier identifiés

| Modèle front (source) | Entité JPA proposée | Champs à ajouter / corriger |
|---|---|---|
| User (`core/models/user.model.ts`) | `AppUser` | `passwordHash`, `email` unique, `active`, `failedAttempts`, `lockedUntil`, `lastLoginAt` ; dépôts autorisés |
| Role (type) | `Role` + `Permission` (ou enum + table de jointure) | Rôles ADMIN/GESTIONNAIRE/CAISSIER |
| Warehouse | `Warehouse` | `code` unique, `type`, `address`, `active` |
| Category | `Category` | `name` unique, `parent` (optionnel), `active` |
| — | `Brand` | à créer |
| Product | `Product` | `barcode` unique, `brand`, `unit`, `vatRate`, `active`, `averageCost` ; **pas de `stockQuantity` persistant** |
| (map mock) | `StockLevel` | `(warehouse, product)` unique, `quantity`, `@Version` |
| StockMovement | `StockMovement` | `warehouse`, `unitCost`, `sourceType`, `sourceId`, motifs étendus, `createdBy` |
| — | `StockTransfer` + lignes | phase 3 (V1 : transfert immédiat conservé) |
| Supplier | `Supplier` | `active` |
| PurchaseOrder + Line | `PurchaseOrder`, `PurchaseOrderLine` | `number`, `warehouse`, statuts étendus, `receivedQuantity` par ligne |
| (receive) | `GoodsReceipt` + lignes | réceptions partielles |
| SupplierInvoice (imbriqué) | `SupplierInvoice` | entité 1:1 (V1) avec la commande |
| SupplierPayment | `SupplierPayment` | `method` |
| SupplierPurchaseHistory | **vue / requête**, pas une table | dérivée des réceptions |
| Customer | `Customer` | `active` |
| CustomerPayment | `CustomerPayment` | `method`, `cashSession` |
| Sale + SaleItem | `Sale`, `SaleLine` | `number`, `warehouse`, `cashSession`, `status`, snapshot produit (sku, nom), `unitCost` |
| CashRegisterSession / CashOperation | `CashSession`, `CashOperation` | `warehouse`, opérateur |
| InventorySession + Line | `InventorySession`, `InventoryLine` | `warehouse`, `status`, `validatedBy` |
| Expense | `Expense` | `warehouse` (optionnel) |
| Appointment | `Appointment` | lien `Customer` optionnel |
| AuditLogEntry | `AuditLog` | `before/after` en `jsonb` |
| — | `RefreshToken` | hash, expiration, révocation, famille de rotation |

**Relations principales** :

- Category 1–N Product ; Supplier 1–N Product (fournisseur par défaut) ; Product N–N Warehouse via StockLevel.
- StockMovement N–1 Product et Warehouse.
- Supplier 1–N PurchaseOrder 1–N Line ; PurchaseOrder 1–N GoodsReceipt ; PurchaseOrder 1–0..1 SupplierInvoice ; Supplier 1–N SupplierPayment (N–0..1 PurchaseOrder).
- Customer 1–N Sale 1–N SaleLine ; Customer 1–N CustomerPayment.
- CashSession 1–N CashOperation ; CashSession 1–N Sale.
- InventorySession 1–N InventoryLine.
- AppUser référencé en `createdBy` partout.

---

## E. Règles métier identifiées (à porter dans les services Spring)

| Id | Règle | Source |
|---|---|---|
| RG-STK-1 | Toute variation de stock = 1 mouvement + mise à jour du niveau du dépôt, dans la **même transaction** | MBI (vente, transfert, inventaire, mouvement manuel) |
| RG-STK-2 | Le stock d'un dépôt ne peut pas devenir négatif | MBI:1629, 1705, 603 |
| RG-STK-3 | Mouvement manuel : quantité ≠ 0 ; produit existant | MBI:1619-1625 |
| RG-PRD-1 | À la création d'un produit, niveau 0 dans chaque dépôt ; stock initial possible dans le dépôt courant (→ mouvement `INITIAL`) | MBI:660-668 |
| RG-PRD-2 | Statut UI : ≤ 0 « Rupture », ≤ seuil « Stock faible » | `products.facade.ts:290` |
| RG-WH-1 | Nom de dépôt unique (insensible à la casse) ; nouveau dépôt initialisé à 0 pour tous les produits | MBI:563-572 |
| RG-TRF-1 | Transfert : dépôts distincts et existants, quantité > 0, stock source suffisant | MBI:590-603 |
| RG-SAL-1 | Panier non vide ; quantités > 0 entières | MBI:1670 ; `sales.facade.ts:133` |
| RG-SAL-2 | `0 ≤ paidAmount ≤ total` ; défaut = total | MBI:1679-1681 |
| RG-SAL-3 | Si `paidAmount < total`, client obligatoire *(UI seulement aujourd'hui : à imposer côté serveur)* | `sales-shell-page.component.ts:181` |
| RG-SAL-4 | Plafond : `dette actuelle + reste dû ≤ creditLimit` | MBI:1687-1696 |
| RG-SAL-5 | Prix unitaire = `retailPrice` (RETAIL) ou `wholesalePrice` (WHOLESALE) *(à calculer côté serveur)* | `sales.facade.ts:82,109` |
| RG-SAL-6 | `total = Σ prix × qté` ; `profit = Σ (prix − coût) × qté` | MBI:1675-1676 |
| RG-CUS-1 | `dette = Σ total ventes − Σ payé à la vente − Σ paiements` | MBI:1687-1691 ; `client-detail` |
| RG-CUS-2 | `creditLimit ≥ 0`, défaut 0 (donc aucun crédit) | MBI:1471, 1504 |
| RG-PUR-1 | Commande : fournisseur existant, ≥ 1 ligne, qté > 0, prix ≥ 0 ; `total = Σ qté × prix` | MBI:1138-1169 |
| RG-PUR-2 | Réception seulement si commande `PENDING` ; entrée en stock + mouvement `SUPPLY` | MBI:1210-1244 |
| RG-PUR-3 | Paiement > 0, date requise, ≤ reste dû | MBI:1314-1318, 1089-1097 |
| RG-PUR-4 | Facture : numéro et date requis | MBI:1281-1282 |
| RG-PUR-5 | Coût produit mis à jour à réception *(aujourd'hui : dernier prix ; cible : CUMP)* | MBI:1227 |
| RG-CSH-1 | Une seule session ouverte (cible : par poste ou dépôt) ; fond ≥ 0 | MBI:960-967 |
| RG-CSH-2 | Opération : type IN/OUT, montant > 0, session ouverte requise | MBI:994-1003 |
| RG-CSH-3 | `expectedCash = fond + ventes cash + IN − OUT` ; `difference = compté − attendu` | MBI:268-297 |
| RG-INV-1 | Ligne : produit existant, quantité physique ≥ 0 ; `difference = physique − théorique (relu serveur)` | MBI:765-786 |
| RG-INV-2 | Écart ≠ 0 → ajustement + mouvement (cible : à la **validation**, pas à la saisie) | MBI:789-805 |
| RG-EXP-1 | Dépense : catégorie, libellé, date requis ; montant > 0 | MBI:1897-1900 |
| RG-USR-1 | Username unique (insensible à la casse), nom requis, ≥ 1 rôle | MBI:1361-1366, 1398-1404 |
| RG-SUP-1 | Fournisseur : nom requis ; délai de livraison ≥ 0 | MBI:843-846 |

---

## F. Dépendances frontend/backend à respecter

1. **Base URL** : le front appelle `http://localhost:3000/api` en dev. Il faut soit lancer Spring sur `server.port=3000` avec `context-path=/api`, soit modifier `environment.ts` (modification front, phase suivante).
2. **Activer le vrai backend** : `useMocks: false` dans l'environnement ciblé. Sans autre changement, le JWT est alors bien transmis (le mock passe la main).
3. **Format d'erreur** : renvoyer **toujours** `{"message": "..."}` (en français, lisible par l'utilisateur). Une `ProblemDetail` Spring brute (`detail`) ne serait **pas affichée** correctement. Recommandation : `ProblemDetail` étendu avec les propriétés `message`, `code` et `errors[]`.
4. **Listes** : enveloppe `{items, total}`. Ne pas exposer `Page<T>` de Spring (`content`, `totalElements`…). Garder `page` 0-based et `size` pour audit et RDV.
5. **Login/refresh** : réponse `{accessToken, refreshToken, expiresIn (secondes), user}`. Le refresh est envoyé **dans le corps** (`{refreshToken}`), pas en cookie, tant que le front n'est pas modifié.
6. **Objet `user`** : fournir `role` (valeurs lues par le layout : `ADMIN`, `MANAGER`, `EMPLOYEE`) **et** `roles` (`ADMIN|GESTIONNAIRE|CAISSIER`) pendant la transition, ou unifier le front d'abord (décision I.4).
7. **En-tête `X-Warehouse-Id`** : obligatoire de fait. Le front envoie `wh_1` par défaut. Si les identifiants deviennent des UUID, `wh_1` sera invalide au premier chargement. Il faut soit un fallback serveur (dépôt par défaut de l'utilisateur), soit un ajustement front (décision I.3).
8. **CORS** : origine `http://localhost:4200` en dev ; en-têtes autorisés `Authorization`, `Content-Type`, `X-Warehouse-Id`.
9. **Sérialisation** :
   - `Instant` en ISO-8601 UTC avec `Z` (`WRITE_DATES_AS_TIMESTAMPS=false`) ;
   - `LocalDate` en `YYYY-MM-DD` pour `*DateIso` ;
   - montants en nombre JSON (`BigDecimal` sérialisé en nombre, pas en chaîne) ;
   - identifiants en **chaînes**.
10. **Codes de statut** : 201 sur les créations, 200 `{ok:true}` sur les suppressions, 204 sur `DELETE /appointments/{id}`, 200 + `null` sur `/cash-register/current` sans session (vérifier que le corps est bien `null` et pas vide).
11. **CSV d'audit** : `text/csv`, séparateur `;`, même en-tête.
12. **Champs enrichis attendus dans les réponses** : `PurchaseOrder.supplierName`, `lines[].productSku/productName/lineTotal`, `InventoryLine.productSku/productName`. Ne pas renvoyer d'entités JPA brutes : utiliser des DTO.
13. **`Product.stockQuantity` en sortie** = niveau du dépôt de l'en-tête (calculé, non persistant). En entrée, **à ignorer** en `PUT` (décision I.6).
14. **Champs envoyés mais à ignorer ou vérifier côté serveur** :
    - `SaleItem.unitPrice` et `purchasePrice` ;
    - `Product.categoryName` ;
    - `Product.stockQuantity` en `PUT`.
15. **Verbes à conserver** : `PATCH /customers/{id}` (payload complet), `PUT /suppliers/{id}`, `PUT /products/{id}`, `PUT /users/{id}`, `PATCH /users/{id}/active`.
16. **Endpoints dont le front dépend pour charger les écrans** (un 404 bloquerait l'écran) :
    - `GET /products`, `/categories`, `/suppliers`, `/warehouses`, `/sales`, `/customers` ;
    - `GET /purchases/orders`, `/stock/movements`, `/inventory/sessions`, `/expenses`, `/users` ;
    - `GET /cash-register/current`, `/cash-register/sessions`, `/audit-logs`, `/audit-logs/stats`, `/appointments`.

---

## G. Risques de migration

| # | Risque | Gravité | Mitigation |
|---|---|---|---|
| G1 | Écart de contrat silencieux (nom de champ, enveloppe, format de date) qui casse un écran sans erreur visible | Élevée | Tests de contrat MockMvc par endpoint, basés sur les interfaces TS ; OpenAPI publié ; recette écran par écran |
| G2 | Format d'erreur Spring ≠ `{message}` | Élevée | `@RestControllerAdvice` unique dès le premier commit |
| G3 | IDs `wh_1` codés en dur côté front | Moyenne | Fallback serveur ou correctif front (I.3) |
| G4 | Le front charge **toutes** les ventes et tous les produits : le volume augmente avec la persistance | Moyenne | V1 : conserver le contrat ; V1.1 : pagination et agrégats serveur + adaptation des facades |
| G5 | Double modèle de rôles | Moyenne | Unifier (I.4) avant de brancher les guards |
| G6 | Corriger le comportement en changeant le contrat (stock non éditable, prix serveur) déroute l'UI | Moyenne | Accepter les champs mais les ignorer, et documenter ; adapter l'UI ensuite |
| G7 | Concurrence sur le stock (deux ventes simultanées) | Élevée | Verrou pessimiste `SELECT … FOR UPDATE` sur `stock_level` ou `@Version` + retry |
| G8 | Arrondis monétaires | Moyenne | `NUMERIC(14,2)` + `BigDecimal` (même si FCFA = entiers) ; décider de l'échelle (I.8) |
| G9 | Fuseau horaire des agrégats journaliers (front en UTC) | Faible | Stocker en UTC ; fuseau métier configurable (`Africa/Abidjan` = UTC) |
| G10 | Données mock (démo) à migrer ou non | Faible | Seed Flyway séparé `db/seed-dev` (profil `dev`), jamais en prod |
| G11 | Mélange mock/réel pendant la transition (le mock laisse passer les routes inconnues, MBI:1975) | Faible | Possible migration domaine par domaine : retirer progressivement les handlers du mock |
| G12 | Tokens en `localStorage` (XSS) | Moyenne | V1 compatible ; V2 : refresh en cookie HttpOnly (adaptation front) |

---

## H. Proposition d'architecture Spring Boot

### H.1 Stack et versions

| Brique | Choix |
|---|---|
| JDK / build | Java 21, Maven (wrapper), Spring Boot 3.x (dernière stable au démarrage) |
| Web | `spring-boot-starter-web`, Jackson (`jsr310`) |
| Données | Spring Data JPA / Hibernate 6, PostgreSQL 16, Flyway, HikariCP |
| Sécurité | Spring Security 6, stateless ; JWT via `spring-boot-starter-oauth2-resource-server` (Nimbus, HS256 en V1, RS256 possible) ; `BCryptPasswordEncoder` ou Argon2 |
| Validation | `spring-boot-starter-validation` (Bean Validation 3) |
| Docs | `springdoc-openapi-starter-webmvc-ui` (`/swagger-ui.html`, `/v3/api-docs`) |
| Mapping | MapStruct |
| Tests | JUnit 5, Mockito, AssertJ, Spring Boot Test, MockMvc, **Testcontainers PostgreSQL** |
| Ops | Actuator (`health`), Docker Compose (postgres + api) |

### H.2 Organisation : monolithe modulaire par domaine

```
backend/                                 (nouveau dossier à la racine du repo, ou repo séparé — I.1)
  pom.xml
  src/main/java/com/geststock/
    GestStockApplication.java
    common/        api (PageResponse{items,total}, OkResponse), error (ApiException, BusinessException,
                   GlobalExceptionHandler → {message, code, errors[]}), web (WarehouseContext résolu
                   depuis X-Warehouse-Id), audit (AuditService, @Audited/aspect), time (Clock)
    security/      SecurityConfig, JwtService, AuthController, RefreshTokenService,
                   CurrentUser, PermissionEvaluator
    users/         AppUser, Role, UserController, UserService
    catalog/       Product, Category, Brand, ProductController, CategoryController
    warehouse/     Warehouse, WarehouseController
    inventory/     StockLevel, StockMovement, StockService (applyMovement — SEUL point d'écriture),
                   StockController, TransferService, InventorySession(+Line), InventoryController
    purchasing/    Supplier, PurchaseOrder(+Line), GoodsReceipt, SupplierInvoice, SupplierPayment,
                   SupplierController, PurchaseOrderController
    sales/         Customer, CustomerPayment, Sale(+Line), PricingService, CreditService,
                   SaleController, CustomerController
    cash/          CashSession, CashOperation, CashService, CashRegisterController
    expenses/      Expense, ExpenseController
    appointments/  Appointment, AppointmentController
    reporting/     DashboardController, ReportController (requêtes d'agrégats)
    audit/         AuditLog, AuditLogController (list/stats/export CSV)
  src/main/resources/
    application.yml, application-dev.yml, application-prod.yml
    db/migration/  V1__init_security.sql, V2__catalog_warehouse.sql, V3__stock.sql, V4__purchasing.sql,
                   V5__sales_customers.sql, V6__cash.sql, V7__inventory.sql, V8__expenses_appointments.sql,
                   V9__audit.sql
    db/seed-dev/   R__dev_seed.sql (profil dev uniquement)
```

Couches par module : `Controller (DTO + @Valid) → Service (@Transactional, règles) → Repository (JPA)`. Les entités ne sortent jamais des services.

### H.3 Points de conception clés

1. **`StockService.applyMovement(cmd)`** : seul code qui modifie `stock_level`.
   - Il verrouille la ligne (`@Lock(PESSIMISTIC_WRITE)`), contrôle la non-négativité, écrit `stock_movement` avec `warehouse_id`, `source_type/id`, `unit_cost` et `created_by`, puis renvoie le nouveau niveau.
   - Vente, réception, transfert, inventaire et mouvement manuel passent tous par lui.
2. **Prix serveur** : `PricingService` relit `retailPrice`/`wholesalePrice` et le coût (CUMP). Il ignore `unitPrice` et `purchasePrice` reçus, ou les rejette s'ils diffèrent (option : `409` si le prix a changé).
3. **CUMP** à la réception : `newAvg = (qtyTot × avg + qtyRecue × prix) / (qtyTot + qtyRecue)`, sur le stock **tous dépôts** (décision I.9).
4. **Contexte dépôt** : un `HandlerMethodArgumentResolver` ou filtre lit `X-Warehouse-Id`, vérifie son existence et l'accès de l'utilisateur, et l'injecte (`@CurrentWarehouse Warehouse wh`).
5. **Sécurité** :
   - JWT d'accès 15 min, claims `sub=userId`, `username`, `roles` ;
   - refresh opaque (UUID) stocké **haché** en table, avec rotation à chaque usage et révocation au logout ;
   - `isActive` vérifié au login et au refresh ;
   - verrouillage après N échecs ;
   - `@PreAuthorize("hasAuthority('stock.adjust')")`, permissions dérivées des rôles via une table `role_permission`.
6. **Erreurs** : `BusinessException(code, message)` → 400/409 ; `EntityNotFound` → 404 ; `MethodArgumentNotValid` → 400 avec `errors[]` ; `AccessDenied` → 403 ; auth → 401.
   - Toujours `{message}`.
   - Codes stables : `STOCK_INSUFFICIENT`, `CREDIT_LIMIT_EXCEEDED`, `CASH_ALREADY_OPEN`, `ORDER_NOT_PENDING`, `AMOUNT_EXCEEDS_REMAINING`…
7. **Audit** : `AuditService.record(...)` appelé dans la **même transaction**, depuis les services (pas seulement depuis un aspect HTTP), avec `before/after` en `jsonb`. IP via `X-Forwarded-For` ou `remoteAddr`. Connexions et échecs de connexion tracés.
8. **Identifiants** : `UUID` (`gen_random_uuid()`), exposés en chaîne. Numéros métier lisibles séparés (`VTE-2026-000123`, `CMD-…`) via séquences PostgreSQL.
9. **Suppressions** : soft delete (`active=false`) pour produits, clients, fournisseurs, dépôts et utilisateurs. `DELETE` HTTP conservé pour le front, mais désactive. Refus `409` si des pièces actives référencent l'objet (décision I.10).
10. **Montants** : `NUMERIC(14,2)` + `BigDecimal`. Quantités `INTEGER` (ou `NUMERIC(14,3)` si unités fractionnaires, I.8).
11. **Contrat** : OpenAPI généré ; tests de contrat MockMvc + JSON fixtures dérivés des interfaces TS.

### H.4 Schéma PostgreSQL V1 (tables et contraintes essentielles)

| Table | Contraintes / index clés |
|---|---|
| `app_user` | `username` unique (lower), `email` unique, `active` |
| `role`, `permission`, `role_permission`, `user_role`, `user_warehouse` | PK composites |
| `refresh_token` | `token_hash` unique, `user_id`, `expires_at`, `revoked_at` |
| `warehouse` | `code` unique, `lower(name)` unique |
| `category`, `brand` | `lower(name)` unique |
| `product` | `sku` unique, `barcode` unique nullable, FK category/brand/supplier, `CHECK` prix ≥ 0, `avg_cost` |
| `stock_level` | PK `(warehouse_id, product_id)`, `CHECK quantity >= 0`, `version` |
| `stock_movement` | idx `(product_id, created_at)`, `(warehouse_id, created_at)`, `CHECK quantity <> 0`, `reason` enum |
| `supplier`, `supplier_payment` | FK, idx `supplier_id` |
| `purchase_order`, `purchase_order_line`, `goods_receipt`, `goods_receipt_line`, `supplier_invoice` | `number` unique, statut, `CHECK quantity > 0` |
| `customer`, `customer_payment` | `CHECK credit_limit >= 0`, `CHECK amount > 0` |
| `sale`, `sale_line` | `number` unique, idx `(created_at)`, `(customer_id)`, `(warehouse_id, created_at)`, `CHECK 0 <= paid_amount <= total` |
| `cash_session`, `cash_operation` | index partiel unique `(warehouse_id) WHERE status='OPEN'` (ou par poste) |
| `inventory_session`, `inventory_line` | statut, FK warehouse |
| `expense`, `appointment` | idx dates |
| `audit_log` | idx `(created_at)`, `(user_id)`, `(entity_type, entity_id)` ; aucun `UPDATE`/`DELETE` applicatif |

### H.5 Stratégie de tests

- **Unitaires** (JUnit 5 + Mockito) : `StockService`, `PricingService`, `CreditService`, `CashService` (calcul `expectedCash`), CUMP, règles RG-*.
- **Intégration** (`@SpringBootTest` + Testcontainers) : transactions vente, réception et inventaire ; **concurrence** (2 threads vendent le dernier article : une seule vente doit réussir) ; migrations Flyway.
- **Contrat** (`@WebMvcTest`/MockMvc) : forme JSON de chaque endpoint de la section C, codes HTTP, format d'erreur `{message}`.
- **Sécurité** : chaque endpoint × rôle (matrice C.2 corrigée).
- **Objectif** : ≥ 80 % de couverture sur les packages de services métier ; CI (GitHub Actions) : build + tests + Testcontainers.

---

## I. Questions / décisions restant à confirmer

| # | Question | Recommandation par défaut |
|---|---|---|
| I.1 | Backend dans le même repo (`/backend`) ou repo séparé ? | Même repo (mono-repo `frontend/` + `backend/`) pour un contrat synchronisé ; à confirmer car cela déplace le front |
| I.2 | Port et chemin : garder `http://localhost:3000/api` ou modifier `environment.ts` ? | `server.port=8080` + modification d'une ligne dans `environment.ts`, plus standard |
| I.3 | Identifiants : UUID (rupture du défaut `wh_1`) ou identifiants textuels conservés ? | UUID + fallback serveur sur le dépôt par défaut de l'utilisateur + correctif front ensuite |
| I.4 | Modèle de rôles : unifier sur `ADMIN/GESTIONNAIRE/CAISSIER` ? Quid de `MANAGER/EMPLOYEE` ? | Unifier sur les 3 rôles métier ; renvoyer temporairement `role` mappé (GESTIONNAIRE→MANAGER, CAISSIER→EMPLOYEE) |
| I.5 | V1 strictement iso-contrat (front inchangé) ou corrections de contrat dès V1 ? | Iso-contrat d'abord, corrections ensuite en lots front + back coordonnés |
| I.6 | `PUT /products` : ignorer `stockQuantity` (le champ de la fiche devient inopérant) ou le transformer en ajustement motivé ? | Ignorer + retirer le champ de l'UI en édition ; stock initial accepté seulement à la création (mouvement `INITIAL`) |
| I.7 | Prix de vente : rejet si différent du tarif, ou acceptation de remises ? | Prix serveur ; remises en V2 avec droit et plafond |
| I.8 | Précision des montants (FCFA sans décimales ?) et quantités fractionnaires ? | `NUMERIC(14,2)` pour l'argent, `INTEGER` pour les quantités |
| I.9 | Valorisation : CUMP global ou par dépôt ? FIFO ? | CUMP global |
| I.10 | Suppressions : soft delete ou refus si références ? | Soft delete + refus si pièces ouvertes |
| I.11 | Caisse : une session par dépôt, par poste ou par utilisateur ? | Par dépôt en V1 (index partiel), par poste plus tard |
| I.12 | TVA applicable, taux, mentions de facture (contexte Côte d'Ivoire) ? | À valider avec le comptable avant la phase « ventes complètes » |
| I.13 | Réinitialisation du mot de passe : envoi d'email réel (SMTP) en V1 ? | V1 : réinitialisation par l'admin ; email plus tard |
| I.14 | Migrer les données de démonstration ? | Seed `dev` uniquement |
| I.15 | Rendez-vous : conserver le module, le lier au client ? | Conserver, lien client optionnel |
| I.16 | Hébergement cible (VPS, cloud, on-premise boutique) ? | Impacte Docker, sauvegardes, TLS : à préciser |
| I.17 | Les endpoints `/reports/*` (faux, inutilisés) : les supprimer du contrat ou les implémenter correctement ? | Les implémenter correctement (filtrés par période) pour préparer le passage du dashboard côté serveur |

---

## J. Ordre recommandé d'implémentation

Chaque étape livre un backend utilisable **et** permet de basculer les écrans correspondants (le mock peut rester actif pour le reste).

| Étape | Contenu | Écrans débloqués | Critère de fin |
|---|---|---|---|
| J0 | Squelette : Maven, Boot, PostgreSQL via Docker Compose, Flyway V1, `GlobalExceptionHandler` (`{message}`), `PageResponse{items,total}`, CORS, OpenAPI, Actuator, CI, Testcontainers | — | Build et tests verts ; Swagger accessible |
| J1 | Sécurité : `app_user`, rôles, permissions, hash, `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`, JWT filter, contrôle `isActive`, audit `LOGIN/LOGOUT` ; CRUD `/users` | Login, Utilisateurs | Matrice rôle × endpoint testée |
| J2 | Référentiels : `warehouse`, `category`, `supplier`, `customer` (CRUD au contrat actuel) ; résolution `X-Warehouse-Id` | Sélecteur de dépôt, Fournisseurs, Clients (liste) | Tests de contrat |
| J3 | **Cœur stock** : `product` (sans stock persistant), `stock_level`, `stock_movement`, `StockService.applyMovement` ; `GET/POST /products`, `/stock/movements`, `/warehouses/transfer` | Produits, Stock, Transferts | Test de concurrence OK ; Σ mouvements = niveau |
| J4 | Achats : commandes, réception (entrée en stock **par dépôt**, CUMP), facture, paiements (unifier les deux routes) ; historique fournisseur dérivé | Achats, détail Fournisseur | Réception visible dans le stock du dépôt |
| J5 | Ventes et crédit : `POST/GET /sales` avec prix serveur, contrôle de plafond, client obligatoire si crédit, mouvements ; paiements clients avec contrôle de surpaiement | POS, détail Client | Tests RG-SAL-* et RG-CUS-* |
| J6 | Caisse : sessions par dépôt, opérations, clôture, ventes cash rattachées à la session | Caisse | `expectedCash` testé |
| J7 | Inventaire (contrat actuel, avec `warehouse_id`) + dépenses + rendez-vous | Inventaire, Dépenses, RDV | — |
| J8 | Audit systématique (toutes écritures) + `/audit-logs` (liste, stats, export CSV) | Audit | Chaque mutation produit une entrée |
| J9 | Reporting serveur : `/reports/*` corrects + `/dashboard/summary` | Rapports (option), Dashboard | Chiffres = recalcul SQL de référence |
| J10 | Bascule : `useMocks=false` en dev, recette complète écran par écran, retrait du mock du bundle de prod | Toute l'application | Recette signée |
| Ensuite | Évolutions de contrat coordonnées front + back : pagination serveur, guards et menu par rôle, réceptions partielles, annulations et retours, workflow d'inventaire, TVA et remises, code-barres, lots | — | Selon la feuille de route de l'audit |

**Correctifs front minimes à prévoir en parallèle** (hors de cette étape d'audit) :

- ordre des intercepteurs (`jwt` avant `mockBackend`) ;
- branchement des guards ;
- `environment.ts` (port) ;
- défaut `wh_1` ;
- unification `AuthService` ;
- retrait du champ stock en édition produit.

---

## Verdict : le repository est-il suffisamment compris ?

**Oui.** Le dépôt est suffisamment compris pour commencer l'implémentation du backend :

- le contrat HTTP complet (69 handlers, 19 modèles, payloads réels envoyés par les composants, formats de réponse et d'erreur attendus) est identifié ;
- les règles métier simulées sont extraites (section E) ;
- les écarts et défauts à ne pas reproduire sont listés (sections C et G) ;
- les dépendances de compatibilité sont explicites (section F).

**Conditions avant d'écrire la première ligne** : trancher **I.1 à I.5** (emplacement du code, port, format des identifiants, modèle de rôles, iso-contrat ou non). Elles conditionnent le squelette J0 et la sécurité J1. Les autres décisions (I.6 à I.17) peuvent être prises au fil des étapes concernées.

Points restant **À CONFIRMER** et non déductibles du code : règles fiscales (TVA, facturation), volumétrie cible, hébergement, besoin réel des rendez-vous.
