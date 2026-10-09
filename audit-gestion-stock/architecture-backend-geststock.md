# GestStock — Architecture cible du backend (Spring Boot)

*Version 1.0, 3 octobre 2026. Document de conception : aucune fonctionnalité métier n'est codée à ce stade.*

Références :

- `audit-gestion-stock-rapport.md` (audit fonctionnel) ;
- `preparation-backend-spring-boot.md` (contrats existants, règles RG-*, décisions I.*).

---

## 0. Hypothèses de travail (à confirmer)

Les décisions I.1 à I.5 de l'audit précédent n'ont pas encore été tranchées. Ce document retient les options recommandées. Changer l'une d'elles n'impacte que les points indiqués.

| # | Hypothèse retenue | Impact si changée |
|---|---|---|
| H1 (I.1) | Backend dans le **même dépôt**, dossier `backend/`. Le front Angular reste à la racine (aucun déplacement). | Emplacement uniquement |
| H2 (I.2) | API sur `http://localhost:8080/api`. Le front changera une ligne de `environment.ts` au moment de la bascule. | `server.port` |
| H3 (I.3) | Identifiants **UUID** exposés en chaînes. Repli serveur sur le dépôt par défaut de l'utilisateur si `X-Warehouse-Id` est absent ou inconnu. | Type des PK, résolveur de dépôt |
| H4 (I.4) | Rôles unifiés **ADMIN / GESTIONNAIRE / CAISSIER**. Champ de compatibilité `role` (ADMIN/MANAGER/EMPLOYEE) dans la réponse de login, le temps d'unifier le front. | DTO `AuthUserResponse` |
| H5 (I.5) | **V1 iso-contrat** : chemins, verbes et formes JSON identiques à ceux que le front envoie et attend. Les corrections de contrat viendront ensuite, par lots coordonnés front + back. | Contrôleurs « legacy » |
| H6 | Package racine `com.geststock`. | Cosmétique |
| H7 | Spring Boot : **dernière version stable au démarrage** (lignée 4.x), Java 21. Vérifier au moment du démarrage la compatibilité de springdoc-openapi et de MapStruct avec la version retenue. | Versions du `pom.xml` |

**Bibliothèques ajoutées à la stack imposée** (à valider) :

| Bibliothèque | Statut | Rôle |
|---|---|---|
| **MapStruct** | Recommandé | Mappers générés à la compilation, sans réflexion |
| **Testcontainers** (PostgreSQL) | Recommandé | Tests sur un vrai PostgreSQL ; évite les écarts de comportement de H2 |
| **ArchUnit** | Optionnel | Vérifier par des tests les règles de dépendances entre modules |

Le JWT n'exige **aucune bibliothèque tierce** : on utilise `spring-boot-starter-oauth2-resource-server` (Nimbus, fourni par Spring Security). Lombok n'est pas retenu : DTO en `record`, entités écrites explicitement.

---

## 1. Architecture cible

### 1.1 Principes

1. **Monolithe modulaire** : un seul déployable, découpé en modules métier aux frontières explicites. Pas de microservices : un seul développeur, et des transactions stock + argent qui doivent rester locales.
2. **Package par fonctionnalité** (`product/`, `sale/`…), pas par couche technique. Chaque module expose une **API publique minimale** (service + DTO) ; le reste est package-private.
3. **Le serveur fait foi** pour les prix, les coûts, le stock, les droits et les dates.
4. **Le stock n'est modifié qu'à un seul endroit** : `StockService.applyMovement(...)`.
5. **Pas de dépendance cyclique** entre modules. Quand deux modules doivent se « parler » dans les deux sens, on passe par un **grand livre** (ledger) ou par un événement (voir §3).
6. **Contrat d'abord** : DTO = contrat JSON du front (H5), documenté par OpenAPI et verrouillé par des tests de contrat.

### 1.2 Arborescence

```
backend/
├── pom.xml
├── mvnw, mvnw.cmd, .mvn/
├── docker-compose.yml                  # postgres:16 (+ pgadmin optionnel)
└── src/
    ├── main/java/com/geststock/
    │   ├── GestStockApplication.java
    │   ├── config/        # configuration technique transverse
    │   ├── security/      # authentification, JWT, refresh tokens, contexte utilisateur
    │   ├── common/        # socle partagé : entités de base, pagination, filtres, utilitaires
    │   ├── exception/     # hiérarchie d'exceptions + handler global
    │   ├── audit/         # journal d'audit métier
    │   ├── user/          # utilisateurs
    │   ├── role/          # rôles
    │   ├── permission/    # permissions et matrice rôle → permissions
    │   ├── warehouse/     # dépôts + résolution du dépôt courant
    │   ├── category/
    │   ├── brand/
    │   ├── product/
    │   ├── stock/         # niveaux, mouvements, transferts
    │   ├── supplier/      # fournisseurs + grand livre fournisseur
    │   ├── purchase/      # commandes, réceptions, factures, paiements fournisseurs
    │   ├── customer/      # clients + grand livre client (créances, paiements)
    │   ├── sale/          # ventes
    │   ├── cash/          # sessions et opérations de caisse
    │   ├── inventory/     # sessions d'inventaire
    │   ├── returns/       # retours clients et fournisseurs  (« return » est un mot réservé Java)
    │   ├── expense/       # dépenses (existant front)
    │   ├── appointment/   # rendez-vous (existant front)
    │   └── report/        # tableaux de bord et rapports (lecture seule)
    ├── main/resources/
    │   ├── application.yml
    │   ├── application-dev.yml
    │   ├── application-test.yml
    │   ├── application-prod.yml
    │   └── db/
    │       ├── migration/     # Flyway : schéma (toutes cibles)
    │       └── seed/dev/      # Flyway : données de démonstration (profil dev seulement)
    └── test/java/com/geststock/
        ├── architecture/      # tests ArchUnit
        ├── support/           # IntegrationTest de base, Testcontainers, builders, JWT de test
        └── <module>/          # tests miroirs des modules
```

### 1.3 Structure interne d'un module

Structure plate, avec un sous-package `dto` (et `internal` si besoin). Exemple avec `product/` :

| Fichier | Rôle | Visibilité |
|---|---|---|
| `Product.java` | `@Entity` | package-private si possible ; sinon public, jamais exposée en JSON |
| `ProductRepository.java` | `JpaRepository` + `JpaSpecificationExecutor` | package-private |
| `ProductSpecifications.java` | Construction des filtres (`Specification<Product>`) | package-private |
| `ProductService.java` | API publique du module (commandes + requêtes) | **public** |
| `ProductController.java` | REST, mince | package-private |
| `ProductMapper.java` | MapStruct | package-private |
| `ProductSort.java` | Liste blanche des tris autorisés | package-private |
| `dto/ProductResponse.java` | Sortie | **public** |
| `dto/CreateProductRequest.java` | Entrée | **public** |
| `dto/UpdateProductRequest.java` | Entrée | **public** |
| `dto/ProductFilter.java` | Paramètres de recherche | **public** |
| `dto/ProductSummary.java` | Vue légère utilisée par les autres modules | **public** |

**Règle** : un autre module n'utilise que `ProductService` et `dto/*`. Il n'accède jamais à `ProductRepository` ni à `Product`.

**Exception tolérée** : les références JPA `@ManyToOne` vers l'entité d'un autre module (par exemple `SaleLine.product`), pour l'intégrité référentielle. Dans ce cas, l'entité est publique mais **ne fait pas partie de l'API** : on la lit, on ne la modifie jamais hors de son module.

---

## 2. Modules fonctionnels

| Module | Responsabilité | Agrégats / entités | V1 iso-contrat |
|---|---|---|---|
| `config` | Jackson, OpenAPI, CORS, JPA auditing, `Clock`, web (argument resolvers), profils | — | Oui |
| `security` | Login, refresh, logout, me ; émission et validation JWT ; refresh tokens ; tentatives échouées ; `CurrentUser` | `RefreshToken` | Oui |
| `common` | `BaseEntity`, `AuditableEntity`, `PageResponse`, `OkResponse`, pagination, tri, filtres, `Money` | — | Oui |
| `exception` | Exceptions métier, `ErrorCode`, `GlobalExceptionHandler`, `ApiError` | — | Oui |
| `audit` | Enregistrement et consultation du journal, stats, export CSV | `AuditLog` | Oui |
| `user` | CRUD utilisateurs, activation, mot de passe, dépôts autorisés | `AppUser`, `UserWarehouse` | Oui |
| `role` | Rôles et affectation | `Role` | Interne |
| `permission` | Catalogue des permissions, matrice rôle → permissions (cache) | `Permission`, `RolePermission` | Interne |
| `warehouse` | Dépôts ; résolution de `X-Warehouse-Id` ; contrôle d'accès au dépôt | `Warehouse` | Oui |
| `category` | Catégories (CRUD, unicité) | `Category` | Oui (GET) + CRUD |
| `brand` | Marques | `Brand` | Nouveau |
| `product` | Catalogue, tarifs, CUMP (stocké, calculé par `stock`/`purchase`) | `Product` | Oui |
| `stock` | Niveaux par dépôt, mouvements, transferts ; **seul point d'écriture du stock** | `StockLevel`, `StockMovement`, `StockTransfer` (V2) | Oui |
| `supplier` | Fournisseurs ; grand livre fournisseur (dettes) | `Supplier`, `SupplierLedgerEntry` | Oui |
| `purchase` | Commandes, réceptions, factures, paiements fournisseurs | `PurchaseOrder`(+`Line`), `GoodsReceipt`(+`Line`), `SupplierInvoice`, `SupplierPayment` | Oui |
| `customer` | Clients ; grand livre client (créances, plafond) ; paiements clients | `Customer`, `CustomerLedgerEntry`, `CustomerPayment` | Oui |
| `sale` | Ventes, tarification, numérotation | `Sale`(+`SaleLine`) | Oui |
| `cash` | Sessions de caisse, opérations, encaissements | `CashSession`, `CashEntry` | Oui |
| `inventory` | Sessions d'inventaire (V1 : application immédiate ; V2 : workflow) | `InventorySession`(+`Line`) | Oui |
| `returns` | Retours clients et fournisseurs, avoirs | `CustomerReturn`(+`Line`), `SupplierReturn`(+`Line`) | **Nouveau (V2)** |
| `expense` | Dépenses | `Expense`, `ExpenseCategory` (V2) | Oui |
| `appointment` | Rendez-vous | `Appointment` | Oui |
| `report` | Dashboard, rapports jour/mois/année, valorisation : **requêtes de lecture uniquement** | — (projections) | Oui |

---

## 3. Diagramme logique et dépendances entre modules

### 3.1 Couches de modules

Une flèche vers le bas signifie « peut dépendre de ».

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ LECTURE                                    report                            │
 │                                   (lit tout en SQL, personne ne dépend de lui)│
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ OPÉRATIONS     returns ──► sale ──► cash          purchase       inventory   │
 │                   │         │                        │               │       │
 │                   └────►────┼──────── purchase ◄─────┘               │       │
 ├─────────────────────────────┼────────────────────────┼───────────────┼───────┤
 │ CŒUR                        └────────► stock ◄────────┴───────────────┘       │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ RÉFÉRENTIELS   product ──► category, brand, supplier                         │
 │                customer     warehouse     expense     appointment            │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ IDENTITÉ       user ──► role ──► permission                                  │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ SOCLE          security   audit   exception   common   config                │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Matrice de dépendances autorisées

| Module | Peut dépendre de (via leurs services publics et DTO) |
|---|---|
| `config`, `common`, `exception` | — (socle) |
| `security` | `common`, `exception`, `user` (chargement utilisateur), `permission` |
| `audit` | `common`, `exception`, `security` (utilisateur courant) |
| `permission` | socle |
| `role` | socle, `permission` |
| `user` | socle, `audit`, `role`, `warehouse` |
| `warehouse` | socle, `audit` |
| `category`, `brand` | socle, `audit` |
| `supplier` | socle, `audit` |
| `customer` | socle, `audit`, `cash` (encaissement d'un paiement client en espèces) |
| `product` | socle, `audit`, `category`, `brand`, `supplier` |
| `stock` | socle, `audit`, `product`, `warehouse` |
| `purchase` | socle, `audit`, `supplier`, `product`, `warehouse`, `stock` |
| `cash` | socle, `audit`, `warehouse` |
| `sale` | socle, `audit`, `customer`, `product`, `warehouse`, `stock`, `cash` |
| `inventory` | socle, `audit`, `product`, `warehouse`, `stock` |
| `returns` | socle, `audit`, `sale`, `purchase`, `customer`, `supplier`, `stock`, `cash` |
| `expense`, `appointment` | socle, `audit` (+ `customer` en lecture pour `appointment`, V2) |
| `report` | **lecture seule** sur les tables de tous les modules, via des requêtes dédiées (JPQL/SQL natif + projections) ; aucun service métier appelé |

### 3.3 Cycles évités par conception

| Cycle potentiel | Résolution |
|---|---|
| `sale` ↔ `customer` (plafond ↔ historique des ventes) | `customer` tient un **grand livre client** (`CustomerLedgerEntry` : DEBIT vente à crédit, CREDIT paiement ou avoir). `sale` appelle `CustomerAccountService.checkAndDebit(...)`. `customer` ne lit jamais les ventes. Dette = solde du grand livre. `GET /customers/{id}/sales` est servi par un contrôleur du module `sale`. |
| `purchase` ↔ `supplier` (dettes ↔ historique des commandes) | Même principe : grand livre fournisseur. `GET /suppliers/{id}/purchases` est servi par `purchase`. |
| `cash` ↔ `sale` (attendu de caisse ↔ ventes) | `sale` et `customer` **poussent** des `CashEntry` dans la session ouverte (`CashService.recordReceipt(...)`). `cash` calcule `expectedCash` uniquement à partir de ses propres écritures. Le rattachement ne se fait plus par fenêtre horaire. |
| `stock` ↔ `purchase`/`sale` | `stock` ne connaît pas les pièces : il reçoit un `sourceType` + `sourceId` opaques dans la commande de mouvement. |

Ces règles sont vérifiées par un test ArchUnit (`architecture/ModuleDependencyTest`) : aucun cycle, accès aux `*Repository` limité au module propriétaire, contrôleurs package-private.

---

## 4. Entities

### 4.1 Classes de base (`common`)

| Classe | Contenu |
|---|---|
| `BaseEntity` (`@MappedSuperclass`) | `UUID id` (`@Id @UuidGenerator`), `@Version long version`. `equals/hashCode` sur `id` (null-safe, `getClass()` via `Hibernate.getClass`). |
| `AuditableEntity extends BaseEntity` | `Instant createdAt`, `UUID createdBy`, `Instant updatedAt`, `UUID updatedBy`, remplis par Spring Data JPA Auditing (`@CreatedDate`, `@CreatedBy`…, `AuditorAware` lu depuis `SecurityContext`). |
| `SoftDeletable` (interface) | `boolean active` ; `deactivate()`. |

### 4.2 Règles de mapping JPA

- `@ManyToOne(fetch = LAZY, optional = …)` **systématiquement** ; pas de `@OneToMany` bidirectionnel sauf à l'intérieur d'un agrégat (en-tête → lignes).
- Cascade (`ALL` + `orphanRemoval`) **uniquement** à l'intérieur d'un agrégat (`Sale` → `SaleLine`). Jamais entre agrégats.
- Énumérations : `@Enumerated(EnumType.STRING)` + contrainte `CHECK` en base.
- Montants : `BigDecimal` / `NUMERIC(14,2)`. Quantités : `int` / `INTEGER`.
- Instants : `Instant` / `TIMESTAMPTZ`. Dates métier : `LocalDate` / `DATE`.
- `jsonb` (`before`/`after` d'audit) : `@JdbcTypeCode(SqlTypes.JSON)`.
- Entités immuables (`StockMovement`, `AuditLog`, écritures de grand livre) : `@Immutable`, pas de setters.
- Pas de logique métier transverse dans les entités. Elles portent seulement leurs invariants locaux, par exemple `PurchaseOrder.markReceived()` qui vérifie le statut.
- `spring.jpa.hibernate.ddl-auto=validate` : **Flyway est l'unique source du schéma**.

### 4.3 Catalogue des entités

| Module | Entité (table) | Champs principaux | Relations | Phase |
|---|---|---|---|---|
| user | `AppUser` (`app_user`) | username (uk, lower), fullName, email (uk), phone, passwordHash, active, failedAttempts, lockedUntil, lastLoginAt, defaultWarehouse | N–N Role, N–N Warehouse | V1 |
| role | `Role` (`role`) | code (ADMIN/GESTIONNAIRE/CAISSIER), label | N–N Permission | V1 |
| permission | `Permission` (`permission`) | code (`product:write`…), description | — | V1 |
| security | `RefreshToken` (`refresh_token`) | tokenHash (uk), user, familyId, expiresAt, revokedAt, replacedBy, userAgent, ip | N–1 AppUser | V1 |
| audit | `AuditLog` (`audit_log`) | createdAt, userId, username, userRole, action, entityType, entityId, entityLabel, status, details, changes (jsonb), before (jsonb), after (jsonb), meta (jsonb), ipAddress, userAgent, warehouseId | — (pas de FK, journal autonome) | V1 |
| warehouse | `Warehouse` (`warehouse`) | code (uk), name (uk lower), type, address, active | — | V1 |
| category | `Category` (`category`) | name (uk lower), parent (V2), active | N–1 Category | V1 |
| brand | `Brand` (`brand`) | name (uk lower), active | — | V1 (non exposé au front V1) |
| product | `Product` (`product`) | sku (uk), barcode (uk null), name, description, category, brand, defaultSupplier, unit, purchasePrice, averageCost, retailPrice, wholesalePrice, vatRate (V2), alertThreshold, maxThreshold, active | N–1 Category/Brand/Supplier | V1 |
| stock | `StockLevel` (`stock_level`) | warehouse, product, quantity (≥ 0), reserved (V2) — uk(warehouse, product) | N–1 Warehouse/Product | V1 |
| stock | `StockMovement` (`stock_movement`) | warehouse, product, quantity (≠ 0, signée), reason, unitCost, sourceType, sourceId, note, createdAt, createdBy, balanceAfter | N–1 Warehouse/Product | V1 |
| stock | `StockTransfer` + `StockTransferLine` | number, from, to, status, … | — | V2 |
| supplier | `Supplier` (`supplier`) | name, phone, email, address, deliveryLeadTimeDays, paymentTermsDays, active | — | V1 |
| supplier | `SupplierLedgerEntry` (`supplier_ledger_entry`) | supplier, type (DEBIT/CREDIT), amount, sourceType, sourceId, entryDate | N–1 Supplier | V1 |
| purchase | `PurchaseOrder` (`purchase_order`) | number (uk), supplier, warehouse, status, orderedAt, deliveredAt, totalAmount, paidAmount | 1–N lines, 1–N receipts, 1–0..1 invoice | V1 |
| purchase | `PurchaseOrderLine` | order, product, productSku, productName (snapshot), quantity, receivedQuantity, unitPurchasePrice, lineTotal | — | V1 |
| purchase | `GoodsReceipt` + `GoodsReceiptLine` | order, warehouse, receivedAt, receivedBy / product, quantity, unitCost | — | V1 (réception totale = 1 réception) |
| purchase | `SupplierInvoice` (`supplier_invoice`) | order (uk), invoiceNumber, invoiceDate, totalAmount, dueDate (V2) | 1–1 PurchaseOrder | V1 |
| purchase | `SupplierPayment` (`supplier_payment`) | supplier, order (null), paymentDate, amount, method, note | — | V1 |
| customer | `Customer` (`customer`) | name, phone, email, creditLimit, active | — | V1 |
| customer | `CustomerLedgerEntry` | customer, type, amount, sourceType, sourceId, entryDate | — | V1 |
| customer | `CustomerPayment` (`customer_payment`) | customer, paymentDate, amount, method, cashEntryId, note | — | V1 |
| sale | `Sale` (`sale`) | number (uk), type, customer, warehouse, cashSession, status (CONFIRMED/CANCELLED), paymentMethod, total, paidAmount, profit, createdAt, createdBy | 1–N SaleLine | V1 |
| sale | `SaleLine` (`sale_line`) | sale, product, productSku, productName, quantity, unitPrice, unitCost, lineTotal, discount (V2), vatRate (V2) | — | V1 |
| cash | `CashSession` (`cash_session`) | warehouse, status, openedAt, openedBy, openingBalance, closedAt, closedBy, countedCash, expectedCash, difference — index unique partiel « une OPEN par dépôt » | 1–N CashEntry | V1 |
| cash | `CashEntry` (`cash_entry`) | session, type (SALE_RECEIPT, CUSTOMER_PAYMENT, IN, OUT, REFUND), amount, sourceType, sourceId, note, createdAt, createdBy | — | V1 |
| inventory | `InventorySession` + `InventoryLine` | warehouse, status, note, createdBy, validatedBy / product, productSku, productName, systemQuantity, physicalQuantity, difference, justification | — | V1 (statut direct `VALIDATED`) |
| returns | `CustomerReturn` + lignes ; `SupplierReturn` + lignes | origine, motif, destination (RESTOCK/SCRAP), montant, avoir | — | V2 |
| expense | `Expense` | category (texte V1), label, amount, expenseDate, warehouse, note | — | V1 |
| appointment | `Appointment` | customerName, phone, dateTime, status, note, customer (V2) | — | V1 |

**Champs « legacy » du contrat front non persistés** :

- `Product.stockQuantity` : calculé depuis `StockLevel` du dépôt courant.
- `Product.categoryName` : jointure.
- `SupplierPurchaseHistory` : projection des réceptions.
- `CashRegisterSession.cashSalesTotal/totalIn/totalOut` : agrégats des `CashEntry`.

---

## 5. DTO — stratégie

### 5.1 Règles

1. **Les entités ne sortent jamais d'un service** vers un contrôleur. Les services renvoient des DTO (ou des projections).
2. DTO = **`record` Java immuables**, dans `<module>/dto`.
3. Une classe par intention :

| Suffixe | Usage | Exemple |
|---|---|---|
| `*Response` | Représentation complète renvoyée par l'API | `ProductResponse` |
| `*Summary` | Version légère pour les listes ou les autres modules | `ProductSummary(id, sku, name)` |
| `Create*Request` / `Update*Request` | Corps entrant, annoté Bean Validation | `CreateSaleRequest` |
| `*Filter` | Paramètres de recherche (query params) | `StockMovementFilter` |
| `*Command` | Appel **interne** entre modules (pas exposé en HTTP) | `StockMovementCommand` |
| `*Result` | Retour d'une action métier interne | `StockMovementResult` |

4. **Noms JSON = noms du contrat TypeScript** (`retailPrice`, `paymentDateIso`, `items`, `total`…). Les noms legacy maladroits sont conservés en V1 (`paymentDateIso` reste `paymentDateIso`) et documentés.
5. **Champs entrants ignorés** : `FAIL_ON_UNKNOWN_PROPERTIES=false` (défaut Spring Boot, réaffirmé dans `JacksonConfig`). Le front envoie des champs que le serveur ne doit pas croire (`unitPrice`, `purchasePrice`, `categoryName`, `stockQuantity` en `PUT`) : ils ne figurent pas dans les `*Request`, ou sont déclarés et explicitement ignorés avec un commentaire OpenAPI `deprecated`.
6. **Sérialisation** :
    - `Instant` → `2026-10-03T21:15:00Z` ; `LocalDate` → `2026-10-03` ;
    - `BigDecimal` → nombre JSON (pas de chaîne) ;
    - `UUID` → chaîne ;
    - `null` inclus (le front teste `?? undefined`).
7. **Validation** : Bean Validation sur les `*Request` (`@NotBlank`, `@Size`, `@PositiveOrZero`, `@Positive`, `@NotEmpty`, `@Valid` sur les listes, `@Email`, `@PastOrPresent`). Les validations **métier** (stock, plafond, statut) vivent dans les services, pas dans les annotations.
8. Groupes de validation non utilisés : un `Create*` et un `Update*` distincts sont plus lisibles.

### 5.2 Exemple de contrat (illustratif, non implémenté)

```java
public record CreateSaleRequest(
    @NotNull SaleType type,
    UUID customerId,
    @NotNull PaymentMethod paymentMethod,
    @PositiveOrZero BigDecimal paidAmount,          // défaut = total si null
    @NotEmpty @Valid List<SaleItemRequest> items) {}

public record SaleItemRequest(
    @NotNull UUID productId,
    @Positive int quantity
    /* unitPrice / purchasePrice envoyés par le front : IGNORÉS (prix serveur) */) {}
```

---

## 6. Repositories

- `interface XxxRepository extends JpaRepository<Xxx, UUID>, JpaSpecificationExecutor<Xxx>`, package-private.
- **Lectures de listes** : `@EntityGraph(attributePaths = {...})` ou projections d'interface ou de DTO, pour éviter le N+1. Les relations `LAZY` ne sont jamais parcourues dans une boucle.
- **Verrouillage** :
  - `StockLevelRepository.findForUpdate(warehouseId, productIds)` avec `@Lock(PESSIMISTIC_WRITE)` et `ORDER BY product_id` (ordre stable, anti-deadlock) ;
  - `CashSessionRepository.findOpenForUpdate(warehouseId)`.
- **Requêtes dérivées** limitées aux cas simples (`existsBySkuIgnoreCase`). Au-delà : `@Query` JPQL nommée, ou `Specification`.
- **Agrégats `report`** : `@Query(nativeQuery = true)` + projections, dans `report` uniquement.
- Pas de `findAll()` sans pagination dans les services, sauf référentiels bornés (dépôts, catégories, rôles).

---

## 7. Services

| Type | Rôle | Exemples |
|---|---|---|
| **Service applicatif** (1 par agrégat) | Cas d'usage, transactions, appels aux autres modules, audit | `ProductService`, `SaleService`, `PurchaseOrderService` |
| **Service de domaine** (sans état, sans transaction propre) | Règles de calcul pures, testables sans Spring | `PricingPolicy`, `AverageCostCalculator`, `CashReconciliation` |
| **Service d'infrastructure** | Accès externes | `CsvExporter`, `PasswordHasher`, `JwtTokenService` |

**Règles :**

1. `@Service` + injection **par constructeur** (champs `final`).
2. `@Transactional(readOnly = true)` au niveau de la classe, et `@Transactional` sur chaque méthode d'écriture (voir §12).
3. Signature orientée cas d'usage :

    ```java
    SaleResponse create(CreateSaleRequest req, CurrentUser user, Warehouse wh);
    Page<SaleResponse> search(SaleFilter f, Pageable p);
    ```

4. Le **dépôt courant** et l'**utilisateur courant** sont passés en paramètres explicites (résolus par le contrôleur), pas lus « magiquement » dans les couches profondes. Cela facilite les tests.
5. Un service ne lève **que** des exceptions de la hiérarchie `exception/` (§9).
6. Méthodes publiques documentées par la règle métier implémentée (`// RG-SAL-4`).

**Services clés (contrats à implémenter plus tard) :**

| Service | Méthode | Responsabilité |
|---|---|---|
| `StockService` | `applyMovements(List<StockMovementCommand>)` | Verrouille, contrôle (≥ 0), écrit les mouvements, met à jour les niveaux ; **unique** point d'écriture |
| `StockService` | `levels(warehouseId, productIds)` | Niveaux pour affichage (`Product.stockQuantity`) |
| `CustomerAccountService` | `balance(customerId)`, `checkCreditAndDebit(...)`, `credit(...)` | Grand livre client |
| `SupplierAccountService` | idem, côté fournisseur | Grand livre fournisseur |
| `CashService` | `requireOpenSession(warehouseId)`, `recordEntry(...)`, `open/close` | Caisse |
| `PricingPolicy` | `unitPrice(product, saleType)` | Tarif détail/gros (V2 : remises, TVA) |
| `AverageCostCalculator` | `newAverage(oldQty, oldAvg, inQty, inCost)` | CUMP |
| `AuditService` | `record(AuditEvent)` | Journal (§16) |

---

## 8. Controllers

- `@RestController`, package-private, `@RequestMapping("/api/...")` (le `/api` est porté par chaque contrôleur, pas par `server.servlet.context-path`, pour garder Actuator et Swagger hors de `/api`).
- **Minces** : validation (`@Valid`), sécurité (`@PreAuthorize`), délégation au service, construction de la réponse. Aucune règle métier.
- Création : `ResponseEntity.created(location).body(dto)` → **201**.
- Suppression legacy : `200 {"ok": true}` (`OkResponse`), sauf `DELETE /appointments/{id}` → **204**.
- Paramètres de filtre et de pagination : `@ParameterObject XxxFilter filter, @ParameterObject Pageable pageable` (springdoc).
- Dépôt courant : `@CurrentWarehouse Warehouse wh`. Utilisateur : `@AuthenticationPrincipal CurrentUser user` (ou résolveur dédié).
- OpenAPI : `@Tag(name = "Produits")` par contrôleur, `@Operation(summary = …)` par endpoint, `@ApiResponse` pour 400/403/404/409/422.
- **Contrôleurs legacy** : les chemins existants (`/purchases/orders/{id}/receive`, `/cash-register/current`…) sont conservés tels quels (H5). Les écarts aux conventions §11 sont listés dans un `LEGACY_ENDPOINTS.md`, avec leur futur équivalent.

---

## 9. Mappers

- **MapStruct**, un mapper par module : `@Mapper(componentModel = "spring", injectionStrategy = CONSTRUCTOR, unmappedTargetPolicy = ReportingPolicy.ERROR)`. Tout champ non mappé fait **échouer la compilation**, ce qui empêche une divergence silencieuse avec le contrat.
- Configuration partagée : `common/mapping/CentralMapperConfig` (`@MapperConfig`).
- **Sens autorisés** :

| Sens | Statut |
|---|---|
| `Entity → *Response / *Summary` | Toujours |
| `Create*Request → Entity` | Seulement pour les référentiels simples (catégorie, marque, fournisseur, client, dépôt) |
| `Update*Request → @MappingTarget Entity` | Référentiels, avec `@Mapping(target = "id", ignore = true)` et champs d'audit ignorés |
| Agrégats métier (vente, commande, inventaire) | **Construits par le service** (logique : snapshot, prix, totaux), jamais par un mapper |

- Champs calculés (`stockQuantity`, `categoryName`, `supplierName`) : passés en `@Context` ou assemblés par le service, pas recalculés dans le mapper.
- Tests : un test unitaire par mapper sur les champs non triviaux.

---

## 10. Exceptions

### 10.1 Hiérarchie (`exception/`)

```
ApiException (abstract, RuntimeException) — HttpStatus status, ErrorCode code, String message, Map<String,Object> details
 ├── NotFoundException            404   ex. PRODUCT_NOT_FOUND
 ├── BusinessRuleException        422   ex. STOCK_INSUFFICIENT, CREDIT_LIMIT_EXCEEDED, CREDIT_REQUIRES_CUSTOMER
 ├── ConflictException            409   ex. SKU_ALREADY_EXISTS, CASH_SESSION_ALREADY_OPEN, ORDER_NOT_PENDING
 ├── ForbiddenOperationException  403   ex. WAREHOUSE_ACCESS_DENIED, LAST_ADMIN_CANNOT_BE_REMOVED
 └── InvalidRequestException      400   ex. INVALID_DATE_RANGE, UNKNOWN_SORT_FIELD
```

- `ErrorCode` est un **enum unique**. Chaque code porte son statut HTTP et un **message français par défaut**, affiché tel quel par le front. Exemple : `STOCK_INSUFFICIENT(422, "Stock insuffisant.")`.
- Les messages par défaut reprennent ceux du mock quand ils existent (« Stock insuffisant. », « Limite de crédit dépassée. »…), pour ne pas changer l'expérience utilisateur.
- Les détails techniques (requête SQL, stack trace) ne partent **jamais** au client.

### 10.2 Statuts HTTP

| Statut | Cas |
|---|---|
| 400 | Validation Bean, JSON illisible, paramètre invalide |
| 401 | Non authentifié, token expiré ou invalide (déclenche le refresh côté front) |
| 403 | Permission ou dépôt non autorisé |
| 404 | Ressource absente (ou désactivée, selon le cas) |
| 409 | Unicité, état incompatible, conflit de version optimiste |
| 422 | Règle métier violée |
| 500 | Inattendu (message générique + `traceId`) |

Le front ne distingue aucun statut hormis 401 : le passage de 400 (mock) à 409/422 est donc sans risque.

---

## 11. Gestion globale des erreurs

`exception/GlobalExceptionHandler` (`@RestControllerAdvice`) produit **toujours** le même corps, au format RFC 9457 (`application/problem+json`) étendu, **avec le champ `message` exigé par le front** :

```json
{
  "type": "https://geststock/errors/stock-insufficient",
  "title": "Unprocessable Entity",
  "status": 422,
  "code": "STOCK_INSUFFICIENT",
  "message": "Stock insuffisant.",
  "detail": "Stock insuffisant.",
  "errors": [ { "field": "items[0].quantity", "message": "doit être supérieur à 0" } ],
  "traceId": "5f2c…",
  "timestamp": "2026-10-03T21:15:00Z",
  "path": "/api/sales"
}
```

| Exception interceptée | Statut | Remarque |
|---|---|---|
| `ApiException` et sous-classes | Selon le code | — |
| `MethodArgumentNotValidException`, `ConstraintViolationException`, `HandlerMethodValidationException` | 400 | `errors[]` rempli ; `message` = premier message lisible |
| `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException` | 400 | — |
| `ObjectOptimisticLockingFailureException` | 409 | `CONCURRENT_MODIFICATION` |
| `DataIntegrityViolationException` | 409 | Traduite par nom de contrainte (`uk_product_sku` → `SKU_ALREADY_EXISTS`) via une table de correspondance |
| `AccessDeniedException` | 403 | — |
| `AuthenticationException` | 401 | — |
| `Exception` | 500 | Journalisée avec `traceId`, message générique |

Les erreurs levées **dans la chaîne de filtres de sécurité**, avant le DispatcherServlet, passent par `RestAuthenticationEntryPoint` (401) et `RestAccessDeniedHandler` (403). Ceux-ci écrivent **le même format** via un `ApiErrorWriter` partagé.

Chaque requête porte un `traceId` (MDC, en-tête `X-Trace-Id` en réponse), repris dans les logs et le corps d'erreur.

---

## 12. Stratégie transactionnelle

| # | Règle |
|---|---|
| T1 | Frontière transactionnelle = **méthode publique d'un service applicatif**. Jamais dans un contrôleur, jamais dans un repository. |
| T2 | Classe annotée `@Transactional(readOnly = true)` ; méthodes d'écriture `@Transactional`. Isolation PostgreSQL par défaut (READ COMMITTED). |
| T3 | `spring.jpa.open-in-view=false` : aucune requête paresseuse hors transaction. Les DTO sont construits dans le service. |
| T4 | **Une opération métier = une transaction** : la vente (contrôle crédit + écriture au grand livre + mouvements de stock + écriture de caisse + audit) est **atomique**. Un appel inter-module se fait dans la transaction de l'appelant (propagation REQUIRED). |
| T5 | **Stock** : verrou pessimiste `SELECT … FOR UPDATE` sur les `stock_level` concernés, **triés par `product_id`** pour éviter les interblocages. La contrainte `CHECK (quantity >= 0)` sert de filet de sécurité. |
| T6 | **Agrégats modifiables** (commande, session de caisse, client) : `@Version`. Un conflit donne 409 `CONCURRENT_MODIFICATION`. |
| T7 | **Caisse** : une seule session ouverte par dépôt, garantie par un **index unique partiel** (`WHERE status = 'OPEN'`), pas seulement par le code. |
| T8 | Aucun appel externe (email, SMS, HTTP) dans une transaction. On utilise `@TransactionalEventListener(phase = AFTER_COMMIT)`. |
| T9 | **Audit** dans la même transaction que l'action (succès). Les **échecs de connexion** sont audités en `REQUIRES_NEW`, sinon le rollback les effacerait. |
| T10 | Pas d'auto-invocation d'une méthode `@Transactional` (proxy Spring contourné). Si besoin, découper en deux beans. |
| T11 | Numérotation des pièces (`VTE-2026-000123`) par **séquence PostgreSQL** par type, sans `MAX()+1`. |
| T12 | **Idempotence** (V2) : en-tête `Idempotency-Key` sur `POST /sales` et les paiements, table `idempotency_key` (clé, utilisateur, hash du corps, réponse), pour éviter les doubles ventes lors d'un double clic ou d'une relance réseau. |
| T13 | Délai : `@Transactional(timeout = 10)` sur les opérations lourdes (inventaire de nombreuses lignes). |

---

## 13. Pagination

- **Paramètres** : `page` (0-based, défaut 0), `size` (défaut 20, **max 200**), `sort` (voir §15). Configuration : `spring.data.web.pageable.max-page-size=200`.
- **Réponse** : `PageResponse<T>`. Le front ne lit que `items` et `total` ; les autres champs sont ajoutés sans risque.

    ```json
    { "items": [ ... ], "total": 1342, "page": 0, "size": 20, "totalPages": 68 }
    ```

- **Ne jamais exposer `org.springframework.data.domain.Page`** directement : sa forme JSON n'est pas stable.
- **Mode de compatibilité (V1)** : le front charge aujourd'hui certaines listes **sans paramètre** et attend **tout** (`/products`, `/sales`, `/customers`, `/suppliers`, `/stock/movements`, `/purchases/orders`, `/expenses`, `/inventory/sessions`, `/cash-register/sessions`).
  - Si **ni `page` ni `size`** ne sont fournis sur ces endpoints, le serveur renvoie toute la collection, avec un **plafond de sécurité** (5 000) et l'en-tête `X-Result-Truncated: true` s'il est atteint.
  - Ce mode est désactivable par endpoint, et sera retiré quand les facades front passeront à la pagination serveur (lot « Pagination » de l'ordre de développement, §19).
- Listes de référentiels bornées (`/warehouses`, `/categories`, rôles) : non paginées, même enveloppe.
- **Pagination par curseur** (keyset, `?after=<createdAt,id>`) réservée aux journaux volumineux (`stock_movement`, `audit_log`) en V2 si le volume l'exige.

---

## 14. Filtrage

- **Un record `XxxFilter` par ressource**, lié aux query params (`@ParameterObject`). Exemple : `StockMovementFilter(UUID productId, Instant from, Instant to, Set<StockMovementReason> reasons, UUID warehouseId)`.
- **Traduction** en `Specification<Xxx>` dans `XxxSpecifications` (une méthode statique par critère, combinées avec `Specification.where(...).and(...)`). Les critères `null` sont ignorés.
- **Conventions de paramètres** (nouveaux endpoints) :

| Paramètre | Sémantique |
|---|---|
| `q` | Recherche texte (`ILIKE` sur colonnes listées ; index `pg_trgm` en V2) |
| `from` / `to` | Plage temporelle `[from, to[` (Instant ISO) ou dates `YYYY-MM-DD` selon le champ |
| `<champ>Id` | Filtre par référence (`customerId`, `productId`) |
| `status=A,B` | Liste d'énumérations séparées par des virgules |
| `active=true\|false` | Inclure ou non les éléments désactivés (défaut `true`) |

- **Alias legacy conservés** (H5) :
  - `search`, `dateFrom`, `dateTo`, `actions`, `entityTypes`, `userId`, `status` pour `/audit-logs` ;
  - `search`, `status`, `dateFrom`, `dateTo` pour `/appointments` ;
  - `from`, `to`, `productId` pour `/stock/movements`.
- **Portée dépôt** : les ressources rattachées à un dépôt (mouvements, ventes, sessions de caisse, inventaires) sont filtrées par défaut sur le dépôt courant (`X-Warehouse-Id`). Une vue consolidée est accessible via `warehouseId=all`, sous la permission `warehouse:all`.
- Les valeurs invalides (date mal formée, énumération inconnue) donnent 400 avec `errors[]`.

---

## 15. Tri

- **Paramètre** : `sort=champ,asc|desc`, répétable (`sort=createdAt,desc&sort=name,asc`), syntaxe Spring Data.
- **Liste blanche par ressource** (`XxxSort`) : correspondance *nom API → chemin JPA* (`supplierName → supplier.name`). Un champ hors liste donne 400 `UNKNOWN_SORT_FIELD`. Cela évite l'exposition de chemins internes et les tris coûteux non indexés.
- **Tri par défaut** déterminé par ressource :
  - pièces : `createdAt desc` ;
  - référentiels : `name asc` ;
  - paiements : `paymentDate desc`.
- **Tri stable** : `id` ajouté automatiquement en dernier critère, sinon la pagination saute ou duplique des lignes.
- Chaque tri autorisé sur une grosse table doit avoir un **index** correspondant (vérifié en revue de migration).

---

## 16. Audit

Trois niveaux complémentaires.

| Niveau | Mécanisme | Contenu | Usage |
|---|---|---|---|
| **1. Colonnes d'audit** | Spring Data JPA Auditing (`AuditableEntity` + `AuditorAware<UUID>`) | `createdAt/By`, `updatedAt/By` sur chaque table modifiable | « Qui a modifié en dernier ? » |
| **2. Journal métier** | `AuditService.record(AuditEvent)` appelé **explicitement** par les services applicatifs, dans la transaction | Action, entité, libellé, `before`/`after` (DTO sérialisés en `jsonb`), `changes[]` (diff champ à champ calculé), statut, IP, user-agent, dépôt, `traceId` | Écran `/audit-logs`, litiges, fraude |
| **3. Événements de sécurité** | Listeners `AuthenticationSuccessEvent` / `AbstractAuthenticationFailureEvent` + logout + refresh | LOGIN (SUCCESS/FAILURE), LOGOUT, TOKEN_REFRESH, ACCOUNT_LOCKED | Sécurité |

**Règles :**

- L'audit explicite est **préféré à l'AOP générique**. Les `before`/`after` doivent être des vues métier lisibles, pas des dumps d'entités, et il faut tracer des actions qui ne sont pas des CRUD (RECEIVE, PAY, OPEN, CLOSE, TRANSFER, VALIDATE, CANCEL).
- **Couverture** : **toute** écriture d'un service applicatif émet un événement d'audit. Un test d'architecture vérifie que chaque méthode `@Transactional` non `readOnly` d'un `*Service` appelle `AuditService`, ou porte `@NoAudit` avec une justification.
- Énumérations alignées sur le front : `AuditAction` (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, RECEIVE, PAY, TRANSFER, OPEN, CLOSE) et `AuditEntityType`, **étendues** (VALIDATE, CANCEL, RETURN ; STOCK_MOVEMENT, CUSTOMER_PAYMENT, SUPPLIER_PAYMENT, WAREHOUSE, CATEGORY, BRAND, REPORT). Le front accepte des chaînes : l'extension est sans risque.
- **Immuabilité** :
  - pas d'endpoint d'écriture ;
  - entité `@Immutable` ;
  - en base, un trigger `BEFORE UPDATE OR DELETE` lève une exception sur `audit_log` ;
  - en production, le rôle applicatif PostgreSQL n'a que `INSERT/SELECT` sur cette table.
- **Données sensibles** : mots de passe, hash et tokens ne sont **jamais** écrits dans `before/after` (`@AuditIgnore` ou liste d'exclusion).
- **Export CSV** : `GET /audit-logs/export`, `text/csv; charset=UTF-8`, BOM pour Excel, séparateur `;`, en-tête identique au mock. Streaming (`StreamingResponseBody`) pour les gros volumes. L'export est lui-même audité (`EXPORT`).
- **Rétention** : paramétrable (défaut : illimitée). Partitionnement mensuel de `audit_log` envisagé en V3 si le volume le justifie.

---

## 17. Sécurité

### 17.1 Authentification

| Élément | Décision |
|---|---|
| Chaîne | `SecurityFilterChain` **stateless** (`SessionCreationPolicy.STATELESS`), `csrf` désactivé (pas de cookie d'authentification en V1), `httpBasic`/`formLogin` désactivés |
| Mots de passe | `PasswordEncoderFactories.createDelegatingPasswordEncoder()` (bcrypt par défaut, coût 12), migration future vers Argon2 possible sans changement de schéma (préfixe `{bcrypt}`) |
| Login | `POST /api/auth/login {username, password}` : vérifie `active`, `lockedUntil` ; incrémente `failedAttempts` (verrouillage 15 min après 5 échecs) ; réponse `{accessToken, refreshToken, expiresIn, user}` |
| Access token | JWT **HS256** (clé ≥ 256 bits, variable d'environnement `GESTSTOCK_JWT_SECRET`), TTL **15 min**. Claims : `sub` (userId), `username`, `roles`, `iat`, `exp`, `jti`, `iss=geststock`. Émis par `NimbusJwtEncoder`, validé par `oauth2ResourceServer().jwt()` |
| Refresh token | **Opaque** (256 bits aléatoires), stocké **haché** (SHA-256) dans `refresh_token`, TTL 30 j (7 j sans « se souvenir de moi »). **Rotation** à chaque usage ; la réutilisation d'un token déjà consommé **révoque toute la famille** (détection de vol) |
| Transport du refresh | V1 : dans le corps JSON (`{refreshToken}`), exigé par le front actuel. V2 : cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`, et suppression du stockage `localStorage` |
| Logout | `POST /api/auth/logout` : révoque la famille du refresh token courant |
| Mot de passe oublié | V1 : réponse **identique** que l'email existe ou non (pas d'énumération), réinitialisation par un admin. V2 : lien signé par email |

### 17.2 Autorisation

- **Modèle** : utilisateur → rôles → **permissions** `domaine:action`. Le JWT porte les **rôles**. Les permissions sont résolues côté serveur depuis la matrice `role_permission`, en cache mémoire invalidé à la modification. Un `JwtAuthenticationConverter` personnalisé produit les `GrantedAuthority` (`ROLE_ADMIN` + `product:write`…).
- **Contrôle** : `@EnableMethodSecurity` + `@PreAuthorize("hasAuthority('product:write')")` sur chaque méthode de contrôleur.
- **Règle par défaut** : `anyRequest().authenticated()`. Publics : `/api/auth/login`, `/api/auth/refresh`, `/api/auth/forgot-password`, `/actuator/health`, et en dev seulement `/v3/api-docs/**`, `/swagger-ui/**`.
- **Catalogue initial des permissions et matrice** (seed Flyway) :

| Permission | ADMIN | GESTIONNAIRE | CAISSIER |
|---|:-:|:-:|:-:|
| `product:read`, `category:read`, `warehouse:read`, `customer:read`, `stock:read` | ✓ | ✓ | ✓ |
| `product:write`, `category:write`, `brand:write`, `supplier:write` | ✓ | ✓ | |
| `product:delete`, `supplier:delete`, `customer:delete`, `expense:delete` | ✓ | | |
| `warehouse:write`, `stock:transfer`, `stock:adjust` | ✓ | ✓ | |
| `warehouse:all` (vue consolidée) | ✓ | ✓ | |
| `purchase:read`, `purchase:write`, `purchase:receive`, `purchase:pay`, `supplier:read` | ✓ | ✓ | |
| `sale:read`, `sale:create`, `customer:write`, `customer:pay` | ✓ | ✓ | ✓ |
| `sale:cancel`, `return:create` (V2) | ✓ | ✓ | |
| `cash:operate` (open, operations, close) | ✓ | ✓ | ✓ |
| `cash:read-all` (historique) | ✓ | ✓ | |
| `inventory:read`, `inventory:write`, `inventory:validate` | ✓ | ✓ | |
| `expense:read`, `expense:write` | ✓ | ✓ | |
| `appointment:read`, `appointment:write` | ✓ | ✓ | ✓ |
| `report:read` | ✓ | ✓ | |
| `user:manage`, `audit:read` | ✓ | | |

    Points corrigés par rapport au mock : `stock:adjust` est interdit au caissier ; les rendez-vous sont soumis à permission.

- **Portée dépôt** : `CurrentWarehouseResolver` vérifie que l'utilisateur a accès au dépôt demandé (`user_warehouse`, ou `warehouse:all`). Sinon 403 `WAREHOUSE_ACCESS_DENIED`. En-tête absent ou inconnu : dépôt par défaut de l'utilisateur (H3).
- **Garde-fous métier** : impossible de désactiver ou supprimer **le dernier ADMIN actif**, ni de se retirer soi-même le rôle ADMIN.

### 17.3 Durcissement

- **CORS** : origines par profil (`http://localhost:4200` en dev, domaine réel en prod). Méthodes `GET,POST,PUT,PATCH,DELETE`. En-têtes `Authorization, Content-Type, X-Warehouse-Id, Idempotency-Key`. En-têtes exposés : `X-Trace-Id, X-Result-Truncated, Location`.
- **En-têtes de sécurité** Spring Security par défaut (HSTS en prod, `X-Content-Type-Options`, `X-Frame-Options DENY`).
- **Secrets** : uniquement en variables d'environnement (`SPRING_DATASOURCE_PASSWORD`, `GESTSTOCK_JWT_SECRET`). Aucun secret dans `application-*.yml` versionné. Le démarrage en profil `prod` **échoue** si le secret est absent ou trop court.
- **Actuator** : seul `health` exposé publiquement ; `info` et `metrics` derrière authentification ADMIN.
- **Swagger** : actif en `dev`, désactivé en `prod` (`springdoc.api-docs.enabled=false`).
- **Journalisation** : jamais de mot de passe, token ou corps de requête d'auth dans les logs. Masquage via un filtre de log.
- **Limitation de débit** sur `/auth/login` : V1 par le verrouillage de compte ; V2 limitation par IP (filtre maison ou reverse proxy).

---

## 18. Migrations Flyway

### 18.1 Conventions

| Règle | Détail |
|---|---|
| Emplacements | `db/migration` (schéma, tous profils) ; `db/seed/dev` (démo, profil `dev` uniquement via `spring.flyway.locations`) ; `db/seed/test` si nécessaire |
| Nommage | `V{NNN}__{module}_{description}.sql`, numérotation **séquentielle sur 3 chiffres** (`V001__core_extensions.sql`). Un seul développeur : pas besoin d'horodatage |
| Répétables | `R__{description}.sql` pour vues, fonctions et triggers (`R__audit_log_immutable_trigger.sql`, `R__report_views.sql`) |
| Immutabilité | **Ne jamais modifier une migration appliquée** ; toute correction = nouvelle migration. `validate-on-migrate=true`, `clean-disabled=true` (toujours, et absolument en prod) |
| Hibernate | `ddl-auto=validate`. Une divergence entité/schéma fait échouer le démarrage, donc les tests |
| SQL | Explicite et lisible ; une migration = un sujet ; pas de SQL généré par Hibernate |
| Nommage SQL | Tables au **singulier snake_case** (`sale_line`) ; PK `id uuid` ; FK `<ref>_id` ; contraintes nommées : `pk_<table>`, `fk_<table>_<ref>`, `uk_<table>_<cols>`, `ck_<table>_<regle>`, `ix_<table>_<cols>` (les noms `uk_*` alimentent la traduction d'erreurs §11) |
| Types | `uuid`, `numeric(14,2)`, `integer`, `timestamptz`, `date`, `varchar(n)` + `CHECK` pour les énumérations, `jsonb`, `boolean not null default true` pour `active` |
| Données de référence | Rôles, permissions, matrice, dépôt principal, admin initial : **migrations versionnées** (nécessaires en prod) ; mot de passe admin initial imposé à changer (`must_change_password`) ou injecté par variable d'environnement |
| Données de démo | Uniquement `db/seed/dev` (reprise des données du mock : 35 produits, 2 dépôts, clients…) |
| Tests | Chaque test d'intégration démarre un PostgreSQL Testcontainers et **joue toutes les migrations** |

### 18.2 Plan de migrations initial

| Version | Contenu |
|---|---|
| `V001__core_extensions.sql` | Extensions `pgcrypto` (et `pg_trgm` prévu) |
| `V002__security_users_roles_permissions.sql` | `app_user`, `role`, `permission`, `user_role`, `role_permission`, `refresh_token` |
| `V003__security_reference_data.sql` | 3 rôles, catalogue des permissions, matrice |
| `V004__warehouse.sql` | `warehouse`, `user_warehouse` + dépôt principal |
| `V005__admin_bootstrap.sql` | Administrateur initial (hash fourni, changement obligatoire) |
| `V006__audit_log.sql` | `audit_log` + index |
| `R__audit_log_immutable_trigger.sql` | Trigger d'immuabilité |
| `V007__catalog_category_brand.sql` | `category`, `brand` |
| `V008__supplier.sql` | `supplier`, `supplier_ledger_entry` |
| `V009__customer.sql` | `customer`, `customer_ledger_entry`, `customer_payment` |
| `V010__product.sql` | `product` |
| `V011__stock.sql` | `stock_level`, `stock_movement` |
| `V012__purchase.sql` | `purchase_order`, `purchase_order_line`, `goods_receipt`, `goods_receipt_line`, `supplier_invoice`, `supplier_payment` + séquence `seq_purchase_number` |
| `V013__cash.sql` | `cash_session` (+ index unique partiel), `cash_entry` |
| `V014__sale.sql` | `sale`, `sale_line` + séquence `seq_sale_number` |
| `V015__inventory.sql` | `inventory_session`, `inventory_line` |
| `V016__expense_appointment.sql` | `expense`, `appointment` |
| `V017+` | Retours, transferts en workflow, TVA/remises, lots… au fil des lots fonctionnels |
| `R__report_views.sql` | Vues de reporting (au lot Reporting) |

L'ordre des versions suit l'ordre de développement (§19). Une migration n'est créée qu'au moment où le module correspondant est développé.

### 18.3 Stratégie de migration du front (mock → API réelle)

1. Le mock laisse passer toute route qu'il ne gère pas (MBI:1975). On peut donc **retirer les handlers du mock domaine par domaine**, au rythme des modules livrés (*strangler pattern*), en gardant `useMocks=true` le temps de la transition.
2. Prérequis front, en une fois, avant la première bascule :
    - ordre des intercepteurs (`jwt` avant `mockBackend`) ;
    - `apiUrl` → `:8080/api` ;
    - suppression du défaut `wh_1`.
3. À la fin : `useMocks=false` par défaut. Le mock ne subsiste qu'en environnement `demo`, chargé par import dynamique, absent du bundle de production.

---

## 19. Conventions

### 19.1 Nommage Java

| Élément | Convention | Exemple |
|---|---|---|
| Packages | minuscules, singulier, nom du domaine | `com.geststock.purchase` |
| Entité | Nom métier singulier, sans suffixe | `PurchaseOrder`, `StockMovement` |
| Repository | `<Entité>Repository` | `StockLevelRepository` |
| Service applicatif | `<Agrégat>Service` | `PurchaseOrderService` |
| Service de domaine | `<Concept>Policy` / `Calculator` | `PricingPolicy`, `AverageCostCalculator` |
| Contrôleur | `<Ressource>Controller` | `CashRegisterController` |
| Mapper | `<Module>Mapper` | `PurchaseMapper` |
| DTO | §5.1 | `CreatePurchaseOrderRequest` |
| Exceptions | `<Nature>Exception` ; codes `UPPER_SNAKE` | `ConflictException`, `SKU_ALREADY_EXISTS` |
| Énumérations | `PascalCase` type, `UPPER_SNAKE` valeurs | `SaleType.WHOLESALE` |
| Constantes de permission | `Permissions.PRODUCT_WRITE = "product:write"` | — |
| Tests | `<Classe>Test` (unitaire), `<Classe>IT` (intégration), méthodes `should<Résultat>When<Condition>` | `shouldRejectSaleWhenStockInsufficient` |
| Langue | Code en **anglais** ; messages utilisateur et documentation OpenAPI en **français** | — |

### 19.2 Conventions API REST (nouveaux endpoints)

| Sujet | Convention |
|---|---|
| Base | `/api/...` ; pas de version dans l'URL en V1. Un changement incompatible futur donnera `/api/v2/...` pour la ressource concernée |
| Ressources | Noms **pluriels**, **kebab-case** : `/api/purchase-orders`, `/api/stock-movements`, `/api/cash-sessions` |
| Identifiant | `/api/products/{id}` (UUID) |
| Sous-ressources | Appartenance forte : `/api/purchase-orders/{id}/receipts`, `/api/customers/{id}/payments` |
| Actions métier | `POST` sur un **sous-chemin verbe** pour les transitions d'état : `/receive`, `/cancel`, `/validate`, `/close` (ou création d'une sous-ressource, préférée : `POST /receipts`) |
| Verbes | `GET` lecture ; `POST` création ou action ; `PUT` remplacement complet ; `PATCH` modification partielle (JSON Merge Patch) ; `DELETE` désactivation ou suppression |
| Codes | 200, 201 (+ `Location`), 204 (suppression ou action sans corps), 400, 401, 403, 404, 409, 422 |
| JSON | `camelCase` ; dates §5.1 ; énumérations en `UPPER_SNAKE` ; montants en nombres |
| Collections | Enveloppe `PageResponse` (§13) ; filtres §14 ; tri §15 |
| En-têtes | `Authorization`, `X-Warehouse-Id`, `Idempotency-Key` (V2) ; réponse `X-Trace-Id` |
| Documentation | Tout endpoint décrit dans OpenAPI (résumé FR, erreurs possibles, permission requise dans la description) |
| Legacy | Chemins actuels conservés (H5) et listés dans `LEGACY_ENDPOINTS.md` avec leur cible (ex. `/purchases/orders` → `/purchase-orders`). Migration par alias puis dépréciation (`Deprecation`/`Sunset` en en-tête) |

---

## 20. Tests

| Niveau | Outil | Portée | Règle |
|---|---|---|---|
| Unitaire domaine | JUnit 5 + AssertJ | `PricingPolicy`, `AverageCostCalculator`, `CashReconciliation`, diff d'audit | Sans Spring ; rapides |
| Unitaire service | JUnit 5 + **Mockito** | Services applicatifs avec repositories et services d'autres modules mockés | Chaque règle RG-* a au moins un test positif et un négatif |
| Mapper | JUnit 5 | Champs calculés et non triviaux | — |
| Repository | `@DataJpaTest` + Testcontainers | Requêtes personnalisées, `Specification`, verrous, contraintes SQL | Jamais H2 |
| Web / contrat | `@WebMvcTest` + MockMvc + `spring-security-test` | Forme JSON (comparaison à des fixtures dérivées des interfaces TS), codes HTTP, format d'erreur `{message}`, validation | Un test de contrat par endpoint legacy |
| Sécurité | MockMvc | Matrice endpoint × rôle (§17.2), 401 sans token, 403 hors permission ou dépôt | Test paramétré généré depuis la matrice |
| Intégration | `@SpringBootTest` + Testcontainers | Scénarios transverses : vente complète, réception, inventaire, clôture de caisse ; **concurrence** (N threads vendent le dernier article : une seule réussit) | Base partagée par classe, données isolées par test |
| Migrations | Démarrage Spring + `ddl-auto=validate` | Toutes les migrations s'appliquent ; les entités correspondent au schéma | Implicite dans chaque IT |
| Architecture | ArchUnit | Pas de cycle ; repositories privés au module ; contrôleurs sans repository ; entités non retournées par les contrôleurs ; services d'écriture audités | Échec = build cassé |

**Socle de test** (`test/support`) :

- `AbstractIntegrationTest` (conteneur PostgreSQL **réutilisé** via un `static` container + `@ServiceConnection`) ;
- `TestDataBuilders` (`aProduct().withSku("X").build()`) ;
- `JwtTestTokens` (token par rôle) ;
- `@WithMockUser` ou équivalent JWT.

**Objectifs** :

- ≥ 80 % de couverture des lignes sur `*Service` et `*Policy` des modules `stock`, `sale`, `purchase`, `cash`, `customer` ;
- 100 % des endpoints couverts par un test de contrat et un test de sécurité ;
- CI (GitHub Actions) : `./mvnw verify` (tests unitaires + IT + ArchUnit) à chaque push. Rapport JaCoCo.

---

## 21. Ordre exact de développement

Chaque étape se termine par : migrations, code, tests verts (unitaires + contrat + sécurité + IT), OpenAPI à jour, commit. Les étapes 0 à 4 sont **purement techniques** : aucune fonctionnalité métier.

| # | Étape | Contenu | Livrable / critère de fin |
|---|---|---|---|
| 0 | Décisions | Valider H1 à H7 et les bibliothèques ajoutées (MapStruct, Testcontainers, ArchUnit) | Hypothèses confirmées |
| 1 | Squelette | `backend/` Maven + wrapper, `GestStockApplication`, profils `dev/test/prod`, `docker-compose.yml` (PostgreSQL 16), Flyway `V001`, Actuator `health`, CI GitHub Actions | `./mvnw verify` vert ; l'application démarre sur PostgreSQL |
| 2 | Socle technique | `config/` (Jackson, CORS, OpenAPI, `Clock`, JPA auditing), `common/` (`BaseEntity`, `AuditableEntity`, `PageResponse`, `OkResponse`, outils de pagination, tri et filtres), `exception/` (hiérarchie, `ErrorCode`, `GlobalExceptionHandler`, `ApiErrorWriter`), `traceId` | Tests : format d'erreur `{message, code, errors[]}`, pagination, tri refusé hors liste blanche |
| 3 | Architecture verrouillée | Tests ArchUnit (règles §3.2), `support/` de tests (Testcontainers, builders) | Règles actives dès le premier module |
| 4 | Identité | `V002`–`V005` ; entités `AppUser`, `Role`, `Permission`, `RefreshToken` ; cache de la matrice | Migrations jouées, repositories testés |
| 5 | Sécurité | `SecurityFilterChain`, émission et validation JWT, refresh avec rotation, `/auth/login|refresh|logout|me|forgot-password`, verrouillage de compte, entry point et access denied au format commun, résolveur `CurrentUser` | Login → token → 401 et refresh fonctionnels ; tests de sécurité |
| 6 | Audit | `V006` + trigger ; `AuditService`, événements de sécurité, `/audit-logs` (liste filtrée et paginée, détail, stats, export CSV) | LOGIN/LOGOUT tracés ; écran Audit compatible |
| 7 | Utilisateurs | `/users` (CRUD, `/active`), garde-fou du dernier admin, dépôts autorisés | Écran Utilisateurs compatible |
| 8 | Dépôts + contexte | `V004` exploité ; `/warehouses` (GET, POST), `CurrentWarehouseResolver` (`X-Warehouse-Id`, repli, contrôle d'accès) | Sélecteur de dépôt du front compatible |
| 9 | Référentiels | `category` (`V007`, GET + CRUD), `brand`, `supplier` (`V008`, CRUD + grand livre vide), `customer` (`V009`, CRUD) | Écrans Fournisseurs et Clients (listes et fiches) compatibles |
| 10 | Produits | `V010` ; `/products` (CRUD, `stockQuantity` calculé, SKU unique, désactivation) | Écran Produits compatible (stock à 0 tant que l'étape 11 n'est pas faite) |
| 11 | **Stock (cœur)** | `V011` ; `StockService.applyMovements` (verrous, contrôles, mouvements) ; `/stock/movements` (GET, POST), `/warehouses/transfer` ; mouvement `INITIAL` à la création produit | Test de concurrence vert ; Σ mouvements = niveau |
| 12 | Caisse | `V013` ; `/cash-register/*` (une session par dépôt, `CashEntry`) | Écrans Caisse compatibles |
| 13 | Achats | `V012` ; commandes, réception (stock par dépôt + CUMP + grand livre fournisseur), facture, paiements (deux routes legacy servies par le même service) ; `/suppliers/{id}/purchases|payments` | Réception visible dans le stock du dépôt |
| 14 | Ventes et créances | `V014` ; `/sales` (prix serveur, plafond, client obligatoire si crédit, mouvements, encaissement en caisse) ; `/customers/{id}/sales|payments` (contrôle de surpaiement, encaissement) | POS et fiche client compatibles |
| 15 | Inventaire | `V015` ; `/inventory/sessions` (contrat actuel, dépôt enregistré, ajustements via `StockService`) | Écrans Inventaire compatibles |
| 16 | Dépenses et RDV | `V016` ; `/expenses`, `/appointments` (y compris `PATCH /status` corrigé) | Écrans compatibles |
| 17 | Reporting | `R__report_views` ; `/reports/daily|monthly|yearly` **corrects**, `/dashboard/summary` | Chiffres vérifiés contre un recalcul SQL de référence |
| 18 | Bascule et recette | Prérequis front (§18.3) ; retrait progressif des handlers du mock ; `useMocks=false` ; recette écran par écran ; seed `dev` | Application complète sur l'API réelle |
| 19 | Évolutions de contrat (lots coordonnés) | Pagination serveur dans les facades → annulation de vente et **retours** (`returns`, V017+) → réceptions partielles → workflow d'inventaire → transferts en workflow → TVA et remises → idempotence → refresh en cookie HttpOnly | Selon la feuille de route de l'audit |

**Dépendances critiques entre étapes :** 2 → tout ; 5 → 6 (utilisateur courant) ; 8 → 11 ; 10 → 11 ; 11 → 13, 14, 15 ; 12 → 14 ; 9 (customer) → 14 ; 9 (supplier) → 13. L'étape 12 (caisse) est placée **avant** la vente, parce que la vente écrit dans la caisse.

---

## 22. Récapitulatif des décisions structurantes

1. **Monolithe modulaire**, package par fonctionnalité, frontières vérifiées par ArchUnit.
2. **`StockService.applyMovements`** = unique écriture du stock, verrou pessimiste ordonné, `CHECK ≥ 0`.
3. **Grands livres** client et fournisseur : suppriment les cycles et fiabilisent créances et dettes.
4. **Caisse alimentée par écritures** (`CashEntry`), plus par fenêtre horaire.
5. **Prix, coûts, totaux calculés serveur** ; champs équivalents envoyés par le front ignorés.
6. **Erreurs** : `ProblemDetail` + `message` + `code` stable, messages français.
7. **JWT** court (15 min) + refresh opaque haché avec rotation ; permissions `domaine:action` ; portée par dépôt.
8. **Flyway** source unique du schéma (`ddl-auto=validate`), seeds de démo isolés.
9. **Audit** explicite, transactionnel, immuable, couverture vérifiée.
10. **V1 iso-contrat**, puis évolutions par lots coordonnés.
