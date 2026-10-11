# Migration du mock HTTP vers l'API Spring Boot

Ce document couvre l'étape 1 de la migration : la cartographie. Il compare le mock Angular (`core/interceptors/mock-backend.interceptor.ts`) et l'API GestStock (`gestionStock-backend`, contrat `docs/openapi.json`).

Architecture conservée : **Feature → Facade → ApiService**. Seuls les ApiServices et les facades sont modifiés ; les composants ne changent pas, sauf si un écran affiche un calcul que le backend fournit désormais.

## 0. Règles transverses

| Sujet | Mock actuel | Backend Spring | Conséquence côté front |
|---|---|---|---|
| URL de base | `http://localhost:3000/api` (interceptée) | `http://localhost:8080/api` | Pointer `environment.apiUrl` vers `:8080`. Les routes encore mockées sont désignées par une liste de préfixes. |
| Listes | `{items, total}` | `PageResponse {items, total, page, size, totalPages}` | Compatible. Sans `page`/`size`, le backend renvoie jusqu'à 5 000 lignes et ajoute l'en-tête `X-Result-Truncated` au-delà. |
| Erreurs | `{message}` | `ApiError {status, code, message, details[], traceId}` | `toApiError` lit déjà `error.message` : compatible. |
| Dépôt courant | En-tête `X-Warehouse-Id: wh_1` | En-tête UUID. Une valeur invalide ou absente fait retomber sur le dépôt par défaut de l'utilisateur. | Ne bloque pas. Remplacer `wh_1` par l'UUID réel (`GET /warehouses/current`). |
| Identifiants | `p_1`, `u_01`… | UUID | Aucun identifiant n'est écrit en dur dans les écrans (vérifié). |
| Droits | Rôles (`hasAnyRole(['ADMIN'])`, `roleGuard`) | Permissions (`/auth/me` → `permissions[]`) | Ajouter `hasPermission()` et migrer `roleGuard` et `users.facade`. |
| CORS | – | `allowed-origins: http://localhost:4200` (profil dev). En-têtes autorisés : `Authorization`, `X-Warehouse-Id`. | OK |
| Statuts | 200 partout | 201 sur les créations, 204 sur logout et reset password, 202 sur forgot-password | Transparent pour `HttpClient`. |

## 1. Matrice MOCK → API SPRING

Statuts :
- ✅ **compatible** : le mock peut être retiré après validation ;
- ⚠️ **adapter** : un ajustement front est nécessaire ;
- ❌ **absent** : pas d'endpoint backend, le mock est conservé.

### 1. Auth (`auth/services/auth.service.ts`, `core/services/auth.service.ts`) — ✅ migré

Servi par Spring Boot depuis l'étape 2 (`/api/auth` retiré de `environment.mockedPrefixes`). Le code mock auth est conservé pour un éventuel retour arrière.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/auth/login` | `/api/auth/login` | POST | `{username, password}` | `AuthResponse {accessToken, refreshToken, expiresIn, tokenType, user}` | ✅ | public |
| `/auth/refresh` | `/api/auth/refresh` | POST | `{refreshToken}` | `AuthResponse` (rotation du refresh token) | ✅ | public |
| `/auth/forgot-password` | `/api/auth/forgot-password` | POST | `{email}` | 202 `{message}` | ✅ | public |
| `/auth/me` | `/api/auth/me` | GET | – | `Me` = `User` + `permissions[]` | ✅ Appelé seulement si les permissions manquent ; login et refresh renvoient déjà `Me`. | authentifié |
| `/auth/logout` (204) | `/api/auth/logout` | POST | `{refreshToken}` | 204 | ✅ Session locale effacée d'abord, puis révocation demandée au serveur. | public |
| *(aucun écran)* | `/api/auth/change-password` | POST | `{currentPassword, newPassword}` | `AuthResponse` | ❌ Pas d'écran front (lié à `mustChangePassword`). | authentifié |

### 2. Users (`users-api.service.ts`, `users.facade.ts`) — ✅ migré

Servi par Spring Boot depuis l'étape 3 (`/api/users` retiré de `environment.mockedPrefixes`). Le code mock users est conservé jusqu'à validation.
- Mot de passe provisoire à la création, et `PUT /api/users/{id}/password` pour le remplacer (ferme les sessions de l'utilisateur).
- `DELETE` désactive le compte : il reste listé comme inactif, son historique est conservé.
- Refus métier du backend affichés tels quels (ex. `LAST_ADMIN_REQUIRED`, `USERNAME_ALREADY_USED`, `PASSWORD_POLICY_VIOLATION`).

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/users` | `/api/users` | GET | `?q,active,role,page,size` | `PageResponse<User>` | ✅ | `user:manage` |
| `/users` | `/api/users` | POST | `CreateUserRequest` | 201 `User` | ✅ | `user:manage` |
| `/users/{id}` | `/api/users/{id}` | PUT | `UpdateUserRequest` | `User` | ✅ | `user:manage` |
| `/users/{id}/active` | `/api/users/{id}/active` | PATCH | `{isActive}` | `User` | ✅ | `user:manage` |
| `/users/{id}` | `/api/users/{id}` | DELETE | – | `{ok}` | ✅ | `user:manage` |
| – | `/api/users/{id}/password` | PUT | `{password, temporary}` | 204 | ✅ Champ « nouveau mot de passe » du formulaire | `user:manage` |
| – | `/api/users/{id}/roles` | PUT | `{roles}` | `User` | Non utilisé (les rôles passent par le PUT principal) | `user:manage` |

`canManage$` utilise `hasPermission$('user:manage')` (fait à l'étape Auth).

### 3. Catalogue (`products-api.service.ts`, `products.facade.ts`) — ✅ migré pour l'écran Produits

**Bascule par écran** : l'écran Produits appelle Spring Boot grâce au marqueur `USE_BACKEND` (`backendContext()`, `core/mocks/mock-routing.ts`). `/api/products` et `/api/categories` restent dans `mockedPrefixes` : ventes, stock, achats, inventaire, rapports et transferts lisent encore le catalogue simulé, cohérent avec leurs données simulées (identifiants `p_*`). Le marqueur et ces préfixes disparaissent quand le dernier de ces écrans est migré.
- Le stock n'est plus saisi : il est affiché en lecture seule (le backend ignore `stockQuantity`, qui change seulement par des mouvements).
- Le PUT remplace tout : le formulaire renvoie les champs qu'il n'affiche pas (code-barres, description, marque, unité, surstock, fournisseur), sinon le backend les efface.
- Badges « Rupture » / « Stock faible » lus dans `GET /api/alerts?type=OUT_OF_STOCK&type=BELOW_MINIMUM&type=LOW_STOCK` : seuil par défaut et marge configurable côté serveur. Plus de calcul `stock <= seuil` côté front.
- Fournisseur habituel en lecture seule jusqu'à la migration des Fournisseurs (les identifiants simulés ne sont pas valides pour le backend).
- `DELETE` désactive le produit (il disparaît de la liste par défaut, son historique est conservé).
- Boutons selon `product:create` / `product:update` / `product:delete`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/products` | `/api/products` | GET | `?q,categoryId,status,page,size` | `PageResponse<Product>` | ✅ | `product:read` |
| `/products/{id}` | `/api/products/{id}` | GET | – | `Product` | ✅ | `product:read` |
| `/products` | `/api/products` | POST | `ProductRequest` | 201 `Product` | ✅ | `product:create` |
| `/products/{id}` | `/api/products/{id}` | PUT | `ProductRequest` | `Product` | ✅ | `product:update` |
| `/products/{id}` | `/api/products/{id}` | DELETE | – | `{ok}` | ✅ | `product:delete` |
| `/categories` | `/api/categories` | GET | – | `PageResponse<Category>` | ✅ | `category:read` |

Écart : `stockQuantity` est calculé par le backend (dépôt courant). Le front ne doit ni l'écrire ni le recalculer.

### 4. Warehouses (`warehouses-api.service.ts`) — ✅ migré (sélecteur de magasin et liste des dépôts)

`/api/warehouses` entièrement sur Spring Boot depuis l'étape Stock (sélecteur, page Dépôts, Transfert).
- Le magasin choisi est un dépôt réel (`current_warehouse` = `{id, name}` en localStorage). Choix invalide (autre utilisateur, dépôt non autorisé) : oublié, puis `GET /api/warehouses/current` (dépôt appliqué par le backend).
- `X-Warehouse-Id` : UUID réel vers Spring Boot (aucun en-tête sans choix) ; vers le mock, dépôt simulé de même nom (`wh_1`, `wh_2`). Avant : `wh_*` envoyé partout, le backend appliquait toujours le magasin principal.
- Magasin oublié à la connexion et à la déconnexion, conservé au renouvellement de jeton.
- Création réservée à `warehouse:manage` (formulaire masqué sinon) ; code généré par le backend.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/warehouses` | `/api/warehouses` | GET | – | `PageResponse<Warehouse>` | ✅ | `warehouse:read` |
| `/warehouses` | `/api/warehouses` | POST | `WarehouseRequest` | 201 `Warehouse` | ✅ | `warehouse:manage` |
| `/warehouses/transfer` | `/api/warehouses/transfer` | POST | `{fromWarehouseId, toWarehouseId, productId, quantity, note}` | `{ok, transferId, out, in}` (sur-ensemble de `{ok}`) | ✅ | `stock:transfer` |
| – | `/api/warehouses/current` | GET | – | `Warehouse` | ⚠️ À utiliser pour initialiser `WarehouseContextService`. | `warehouse:read` |

### 5. Stock (`stock-api.service.ts`, `stock.facade.ts`) — ✅ migré (écran Stock et Transfert)

`/api/stock` retiré de `mockedPrefixes`. Catalogue lu sur Spring Boot par les écrans Stock et Transfert (`backendContext()`).
- Historique : nom, référence, solde après mouvement (`balanceAfter`), auteur (`createdByUsername`), origine détaillée (`type` : réception, vente, transfert, inventaire…) et pièce source fournis par le backend ; plus de jointure avec le catalogue.
- Filtre « Au » : fin de journée incluse (avant : minuit, la journée choisie était exclue).
- Ajustement manuel dans les deux sens (avant : uniquement +). Sens, stock insuffisant et quantité nulle contrôlés par le backend (`STOCK_INSUFFICIENT`, `INVALID_STOCK_QUANTITY`).
- Bouton « Mouvement » selon `stock:adjust` ; transfert selon `stock:transfer`, dépôt source par défaut = magasin choisi, réponse `{ok, transferId, out, in}`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/stock/movements` | `/api/stock/movements` | GET | `?productId,type,from,to,page,size` | `PageResponse<StockMovement>` | ✅ | `stock:read` |
| `/stock/movements` | `/api/stock/movements` | POST | `{productId, quantity (signée), reason, note, unitCost}` | 201 `StockMovement` (avec `balanceAfter`) | ✅ | `stock:adjust` |
| – | `/api/stock/levels` | GET | – | `PageResponse<StockLevel>` | Disponible | `stock:read` |

Écarts :
- `stock.facade.enrich()` joint les noms de produits côté front. Le backend renvoie déjà `productSku` et `productName` : la jointure devient inutile.
- Le solde affiché doit venir de `balanceAfter`.

### 6. Fournisseurs (`suppliers-api.service.ts`) — ✅ migré (écrans Fournisseurs et Produits)

Bascule par écran (`backendContext()`) : liste, fiche, formulaire et paiements sur Spring Boot ; la sélection du fournisseur de l'écran Produits est réactivée. `/api/suppliers` reste simulé pour l'écran Achats (commandes simulées).
- **Paiements fournisseurs développés côté backend** (V025, `gestionStock-backend/docs/supplier-payments.md`) : `GET/POST /api/suppliers/{id}/payments`, `GET /api/suppliers/{id}/account`, `POST /api/purchases/orders/{id}/pay`, permission `purchase:pay`.
- Fiche : commandé, reçu, payé, acomptes, reste à payer lus dans `/account` (plus de somme côté front). Paiement : mode (virement, mobile money, espèces depuis ma caisse), référence, date non future ; plafond = reste dû, réparti sur les commandes les plus anciennes.
- Historique : une ligne par réception, avec le numéro de commande ; tous les dépôts avec `warehouse:all`.
- Sans `purchase:read` (caissier) : fiche seule, ni achats, ni paiements, ni dette.
- `DELETE` désactive le fournisseur. Boutons selon `supplier:create` / `update` / `delete`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/suppliers` | `/api/suppliers` | GET | – | `PageResponse<Supplier>` | ✅ | `supplier:read` |
| `/suppliers/{id}` | `/api/suppliers/{id}` | GET | – | `Supplier` | ✅ | `supplier:read` |
| `/suppliers` | `/api/suppliers` | POST | `SupplierRequest` | 201 `Supplier` | ✅ | `supplier:create` |
| `/suppliers/{id}` | `/api/suppliers/{id}` | PUT | `SupplierRequest` | `Supplier` | ✅ | `supplier:update` |
| `/suppliers/{id}` | `/api/suppliers/{id}` | DELETE | – | `{ok}` | ✅ | `supplier:delete` |
| `/suppliers/{id}/purchases` | `/api/suppliers/{id}/purchases` | GET | – | `PageResponse<SupplierPurchaseHistory>` | ✅ | `purchase:read` |
| `/suppliers/{id}/payments` | `/api/suppliers/{id}/payments` | GET / POST | `{amount, paymentDateIso, paymentMethod, orderId?, externalReference?, note?}` | `SupplierPayment` (+ `allocations`) | ✅ (V025) | `purchase:read` / `purchase:pay` |

Écart : `supplier-detail-page` additionne achats et paiements côté front. Ce calcul reste en mock tant que les paiements fournisseurs n'existent pas côté backend.

### 7. Achats (`purchases-api.service.ts`) — ✅ migré

`/api/purchases` et `/api/suppliers` retirés de `mockedPrefixes`. L'écran lit fournisseurs et catalogue réels (`backendContext()` pour le catalogue).
- **Factures fournisseurs développées côté backend** (V026, `gestionStock-backend/docs/supplier-invoices.md`) : `POST /api/purchases/orders/{id}/invoice` (`purchase:pay`), une facture par commande reçue ou soldée, montant = valeur reçue, numéro unique par fournisseur, figée ; renvoyée dans `PurchaseOrder.invoice`.
- `PurchaseOrder.remainingToPay` ajouté au backend : « Payer » ne calcule plus `total − payé` (faux pour une commande soldée, dont le dû est la valeur reçue).
- Liste : numéro `CMD-…`, statut détaillé (commandée, reçue en partie, reçue, soldée, annulée), reste à payer ; boutons selon `purchase:create` / `receive` / `pay`.
- Détail : libellés, quantités reçues et totaux de la commande du backend (plus de jointure avec le catalogue) ; facture saisissable seulement quand le backend l'accepte (auparavant le formulaire était désactivé en détail : la facture ne pouvait pas être saisie).
- Paiement : même dialogue que la fiche fournisseur (mode, référence, date non future).

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/purchases/orders` | `/api/purchases/orders` | GET | – | `PageResponse<PurchaseOrder>` | ✅ | `purchase:read` |
| `/purchases/orders/{id}` | `/api/purchases/orders/{id}` | GET | – | `PurchaseOrder` | ✅ | `purchase:read` |
| `/purchases/orders` | `/api/purchases/orders` | POST | `{supplierId, expectedDeliveryDate, lines[{productId, quantity, unitCost}]}` | 201 `PurchaseOrder` (`totalAmount` calculé par le serveur) | ✅ | `purchase:create` |
| `/purchases/orders/{id}/receive` | `/api/purchases/orders/{id}/receive` | POST | `{deliveredAt (alias deliveredAtIso), lines?}` | `PurchaseOrder` | ✅ | `purchase:receive` |
| `/purchases/orders/{id}/invoice` | `/api/purchases/orders/{id}/invoice` | POST | `{invoiceNumber, invoiceDateIso}` | 201 `SupplierInvoice` | ✅ (V026) | `purchase:pay` |
| `/purchases/orders/{id}/pay` | `/api/purchases/orders/{id}/pay` | POST | `{amount, paymentDate, paymentMethod, …}` | `PurchaseOrder` | ✅ (V025) | `purchase:pay` |

Écarts :
- `PurchaseOrder.invoice` n'existe pas côté backend.
- `purchase-drawer.total` n'est qu'un aperçu de saisie ; le total officiel est `totalAmount`, renvoyé par le serveur.

### 8. Clients (`customers-api.service.ts`, `clients.facade.ts`) — ✅ migré (écrans Clients)

`/api/customers` entièrement sur Spring Boot depuis l'étape Ventes (écrans Clients et Ventes).
- Dette (`balance`) et crédit disponible (`availableCredit`) lus dans le client renvoyé par le backend : plus de calcul `acheté − payé − règlements` (qui ignorait annulations et avoirs). Part à crédit de chaque vente = `creditAmount` du backend.
- Règlement : encaissé maintenant dans la caisse ouverte de l'utilisateur (le champ date, ignoré par le backend, est remplacé par le mode de paiement) ; plafond = dette ; référence `OPC-…` affichée.
- Plafond de crédit : saisissable seulement avec `customer:credit` ; sinon absent de la requête PATCH (conservé par le backend).
- `DELETE` désactive le client (ventes et dette conservées). Boutons selon `customer:create` / `update` / `delete` / `pay`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/customers` | `/api/customers` | GET | – | `PageResponse<Customer>` | ✅ | `customer:read` |
| `/customers/{id}` | `/api/customers/{id}` | GET | – | `Customer` (`balance`, `availableCredit`) | ✅ | `customer:read` |
| `/customers` | `/api/customers` | POST | `CustomerRequest` | 201 `Customer` | ✅ | `customer:create` |
| `/customers/{id}` | `/api/customers/{id}` | PATCH | `CustomerRequest` | `Customer` | ✅ (modifier `creditLimit` exige aussi `customer:credit`) | `customer:update` |
| `/customers/{id}` | `/api/customers/{id}` | DELETE | – | `{ok}` | ✅ | `customer:delete` |
| `/customers/{id}/sales` | `/api/customers/{id}/sales` | GET | – | `PageResponse<Sale>` | ✅ | `sale:read` |
| `/customers/{id}/payments` | `/api/customers/{id}/payments` | GET | – | `PageResponse<CustomerPayment>` | ✅ | `customer:read` |
| `/customers/{id}/payments` | `/api/customers/{id}/payments` | POST | `{amount, paymentMethod, note}` | 201 `CustomerPayment` | ⚠️ `paymentDateIso` est ignoré (date imposée par le serveur). | `customer:pay` |
| – | `/api/customers/{id}/account` | GET | – | `CustomerAccount` | Disponible | `customer:read` |

Écart : `client-detail-page` recalcule le total acheté, le total payé et le solde. Il faut lire `balance` et `availableCredit` (ou `/account`).

### 9. Ventes (`sales-api.service.ts`, `sales.facade.ts`) — ✅ migré avec la Caisse

`/api/sales` et `/api/customers` retirés de `mockedPrefixes` ; catalogue réel via `backendContext()`.
- Corps de vente : `{type, customerId?, paymentMethod, paidAmount?, items:[{productId, quantity}]}` — plus aucun prix ni coût envoyé. Paiement de la totalité : `paidAmount` absent, le backend encaisse son propre total ; paiement partiel (case « à crédit », client obligatoire) : montant saisi.
- Panier = aperçu (« Total estimé ») ; la vente renvoyée fait foi (numéro `VTE-…`, prix, remises, payé, part à crédit) et alimente la facture (écran et PDF). Marge retirée de l'écran de caisse.
- Refus du backend affichés : `NO_OPEN_CASH_SESSION`, `CUSTOMER_REQUIRED_FOR_CREDIT`, `STOCK_INSUFFICIENT`, plafond de crédit. Bouton « Encaisser » selon `sale:create`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/sales` | `/api/sales` | GET | – | `PageResponse<Sale>` | ✅ | `sale:read` |
| `/sales` | `/api/sales` | POST | `{type, customerId, paymentMethod, paidAmount, items[{productId, quantity, discountPercent?}]}` | 201 `Sale` (`subtotal`, `total`, `profit`, `creditAmount`) | ⚠️ voir ci-dessous | `sale:create` |
| – | `/api/sales/{id}/cancel` | POST | `{reason}` | `Sale` | Pas d'écran | `sale:cancel` |
| – | `/api/sales/{id}/returns` | POST | `CreateCustomerReturnRequest` | 201 | Pas d'écran | `return:create` |

Écart sur la création de vente : le front envoie `unitPrice` et `purchasePrice`, mais **le backend les ignore** et applique le prix autorisé.
- Le total du panier (`computeTotals`) n'est qu'un aperçu.
- Le montant et la marge affichés après validation doivent venir de la `Sale` renvoyée, ce qui est déjà le cas avec `setPaidAmount(sale.total)`.
- Ne plus envoyer `purchasePrice`.

### 10. Caisse (`cash-register-api.service.ts`) — ✅ migré (avec les Ventes)

`/api/cash-register` retiré de `mockedPrefixes` : une vente payée exige une caisse ouverte côté backend, les deux modules migrent ensemble.
- Récapitulatif (ventes espèces, entrées, sorties, attendu, écart) calculé par le backend ; l'écart affiché pendant la saisie du comptage n'est qu'un aperçu.
- Détail d'une session : nature de chaque écriture (vente, règlement client, paiement fournisseur, apport, sortie, correction), référence `OPC-…` et pièce d'origine.
- Erreur sur « ma caisse » : message affiché, écran utilisable.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/cash-register/current` | `/api/cash-register/current` | GET | – | `CashRegisterSession \| null` | ✅ | `cash:operate` |
| `/cash-register/sessions` | `/api/cash-register/sessions` | GET | – | `PageResponse<CashRegisterSession>` | ✅ | `cash:operate` ou `cash:read` |
| `/cash-register/open` | `/api/cash-register/open` | POST | `{openingBalance, note}` | 201 `CashRegisterSession` | ✅ | `cash:operate` |
| `/cash-register/operations` | `/api/cash-register/operations` | POST | `{type, amount, note}` | 201 `CashOperation` | ✅ | `cash:operate` |
| `/cash-register/sessions/{id}/operations` | idem | GET | – | `PageResponse<CashOperation>` | ✅ | `cash:operate` ou `cash:read` |
| `/cash-register/close` | `/api/cash-register/close` | POST | `{countedCash, note}` | `CashRegisterSession` (`expectedCash`, `difference`) | ✅ | `cash:operate` |

### 11. Inventaires (`inventory-api.service.ts`) — ✅ migré

`/api/inventory` retiré de `mockedPrefixes` ; catalogue réel via `backendContext()` (seuls les rapports lisent encore le catalogue simulé).
- Contrat historique `POST /api/inventory/sessions` : le backend saisit le stock système, calcule les écarts et, avec `inventory:validate`, ajuste le stock (statut `COMPLETED`) ; sinon l'inventaire attend un valideur (`VALIDATION`). Message adapté après enregistrement.
- Écart affiché pendant la saisie = aperçu. Historique : numéro `INV-…` et statut.
- Route et menu protégés par `inventory:read` (caissier : 403 côté backend).
- Non couvert par l'écran : workflow complet `/api/inventories` (brouillon, comptage, soumission, validation d'un inventaire en attente, annulation).

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/inventory/sessions` | `/api/inventory/sessions` (compatibilité) | GET | – | `PageResponse<InventorySession>` | ✅ | `inventory:read` |
| `/inventory/sessions/{id}` | `/api/inventory/sessions/{id}` | GET | – | `InventorySession` | ✅ | `inventory:read` |
| `/inventory/sessions` | `/api/inventory/sessions` | POST | `{note, lines[{productId, physicalQuantity}]}` | 201 `InventorySession` (validé immédiatement ; `systemQuantity` et `difference` calculés par le serveur) | ✅ | `inventory:create` + `inventory:validate` |
| – | `/api/inventories/**` (brouillon → comptage → soumission → validation) | – | – | – | Cycle complet disponible, sans écran front | `inventory:*` |

### 12. Rapports et dashboard (`reports-api.service.ts`, `dashboard-api.service.ts`) — ✅ migré

`/api/reports`, `/api/dashboard`, `/api/products`, `/api/categories` retirés de `mockedPrefixes` ; plus aucun écran ne lit le catalogue simulé : le marqueur `USE_BACKEND` / `backendContext()` est supprimé.
- Rapports : totaux de la période = une ligne `GET /api/reports/sales/by-period` regroupée sur la période (`DAY` / `MONTH` / `YEAR`) ; graphiques = même endpoint par jour (7 derniers jours ou jours du mois) ou par mois (année) ; top 10 = `GET /api/reports/sales/by-product?sort=netRevenue,desc`. CA net (retours déduits), ventes annulées exclues, marge du backend. Plus aucune somme de ventes côté front (auparavant : toute la liste des ventes additionnée dans le navigateur).
- Ancienne page `reports-page` (non routée, appels `/reports/daily|monthly|yearly` inexistants) supprimée.
- Route et menu Rapports protégés par `report:read` ; dashboard sans `report:read` (caissier, `sale:create`) : vue vendeur alimentée par `GET /api/dashboard/me` (ses ventes du jour + courbe `last7Days` de ses ventes des 7 derniers jours, sans marge), `GET /api/cash-register/current` et `GET /api/alerts/summary` ; aucun appel au tableau de bord du magasin (page d'accueil, donc pas de garde de route pour éviter une boucle).

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/dashboard` | `/api/dashboard` | GET | `?allWarehouses` | `Dashboard` | ✅ (déjà aligné à l'étape dashboard) | `report:read` |
| `/reports/daily` | `/api/reports/sales/by-period?groupBy=DAY` + `/api/reports/sales` | GET | `from, to` | `[SalesPeriodReportRow]` | ⚠️ Contrat différent : nouvel adaptateur dans le facade. | `report:read` |
| `/reports/monthly` | `/api/reports/sales/by-period?groupBy=MONTH` | GET | `from, to` | idem | ⚠️ idem | `report:read` |
| `/reports/yearly` | `/api/reports/sales/by-period?groupBy=YEAR` | GET | `from, to` | idem | ⚠️ idem | `report:read` |

Écart : `reports-vm.model` additionne CA et marge à partir des ventes brutes. Il faut lire les agrégats du backend.

### 13. Audit (`audit-logs-api.service.ts`) — ✅ migré

`/api/audit-logs` retiré de `mockedPrefixes` (route et menu déjà protégés par `audit:read`). Le journal est écrit uniquement par le backend ; l'écran est en lecture seule.
- Filtres alignés sur les valeurs réellement tracées : actions du backend (`CANCEL`, `DEACTIVATE`, `PASSWORD_RESET`…), filtre « Domaine » (`modules`) à la place des types d'entité simulés (`EXPENSE`, `CASH_REGISTER_SESSION` n'existent pas côté backend). Libellés français, code brut affiché pour une action inconnue.
- Tri des colonnes demandé au backend (`sort=createdAt|username|action|module|status,asc|desc`) : auparavant, il ne triait que la page affichée.
- Export CSV : mêmes critères que la recherche, recherche texte comprise (oubliée auparavant).
- Détail : domaine, navigateur, code d'erreur (`meta.errorCode`), trace ; valeurs du diff lisibles même quand ce sont des objets ; utilisateur absent (connexion refusée) affiché « — ».

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/audit-logs` | `/api/audit-logs` | GET | `?search,modules,actions,entityTypes,status,userId,dateFrom,dateTo,page,size` | `PageResponse<AuditLogEntry>` | ✅ | `audit:read` |
| `/audit-logs/{id}` | `/api/audit-logs/{id}` | GET | – | `AuditLogEntry` | ✅ | `audit:read` |
| `/audit-logs/stats` | `/api/audit-logs/stats` | GET | – | `AuditLogStats` | ✅ | `audit:read` |
| `/audit-logs/export` | `/api/audit-logs/export` | GET | mêmes filtres | CSV | ✅ | `audit:read` |

### 14. Dépenses (`expenses-api.service.ts`, `expenses.facade.ts`) — ✅ migré (backend développé : V027)

Module backend créé pour l'occasion : règles détaillées dans `gestionStock-backend/docs/expenses.md`.
- Catégories fermées (`TRANSPORT`, `SALARY`, `RENT`, `UTILITIES`, `SUPPLIES`, `MAINTENANCE`, `TAXES`, `OTHER`) au lieu du texte libre.
- Mode de paiement : en espèces (défaut), la dépense sort de la caisse ouverte de l'auteur, dans le dépôt courant (refus sans caisse ouverte ou si les espèces manquent). Mobile money, virement et chèque ne passent pas par la caisse.
- Plus de suppression : annulation motivée (`expense:delete`). La dépense annulée reste visible, hors totaux ; en espèces, l'argent revient dans la caisse ouverte de la personne qui annule.
- Totaux : `GET /api/expenses/summary` (payées seulement, part en espèces, par catégorie) ; le facade n'additionne plus rien. Liste paginée, filtrée par période (mois en cours par défaut), catégorie, statut, recherche.
- Route et menu protégés par `expense:read` ; formulaire affiché avec `expense:create`, bouton « Annuler » avec `expense:delete`.
- Détail de caisse : nouveaux types d'écriture `EXPENSE` (sortie) et `EXPENSE_CANCELLATION` (entrée).

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/expenses` | `/api/expenses` | GET | `?dateFrom,dateTo,category,paymentMethod,status,search,page,size` | `PageResponse<Expense>` | ✅ | `expense:read` |
| – | `/api/expenses/summary` | GET | mêmes filtres | `ExpenseSummary` | ✅ nouveau | `expense:read` |
| `/expenses` | `/api/expenses` | POST | `{category, label, amount, expenseDateIso, paymentMethod, externalReference?, note?}` | `Expense` (201) | ✅ | `expense:create` |
| `DELETE /expenses/{id}` | `POST /api/expenses/{id}/cancel` | POST | `{reason}` | `Expense` | ⚠️ suppression remplacée par l'annulation | `expense:delete` |

### 15. Rendez-vous (`appointments-api.service.ts`) — ✅ migré (backend développé : V028)

Module backend créé pour l'occasion : règles détaillées dans `gestionStock-backend/docs/appointments.md`.
- Client du fichier (recherche serveur `GET /api/customers?q=`, nom repris de la fiche) ou prospect (nom + téléphone).
- `dateTime` = heure locale du dépôt envoyée telle quelle (auparavant convertie en UTC par `toISOString()`, ce qui décalait l'heure).
- Statuts : Planifié → Honoré / Absent (à partir du jour du rendez-vous) / Annulé (motif obligatoire). Le statut n'est plus un champ du formulaire ; un rendez-vous clos ne se modifie plus.
- Un seul rendez-vous planifié par dépôt et par horaire (refus `APPOINTMENT_SLOT_TAKEN`).
- Plus de suppression : annulation motivée. Agenda à partir d'aujourd'hui par défaut, filtres Du / Au (jours locaux, auparavant décalés par `toISOString()`).
- Route et menu protégés par `appointment:read` ; création, modification et clôture avec `appointment:manage`.
- Composants morts supprimés : `appointment-form-dialog` (non utilisé), `confirm-delete-dialog`.

| Mock | API Spring | Méthode | Request | Response | Statut | Permission |
|---|---|---|---|---|---|---|
| `/appointments` | `/api/appointments` | GET | `?search,status,dateFrom,dateTo,customerId,page,size` | `PageResponse<Appointment>` | ✅ | `appointment:read` |
| `/appointments/{id}` | `/api/appointments/{id}` | GET | – | `Appointment` | ✅ | `appointment:read` |
| `/appointments` | `/api/appointments` | POST | `{customerId?, customerName?, phone?, dateTime, note?}` | `Appointment` (201) | ✅ | `appointment:manage` |
| `/appointments/{id}` | `/api/appointments/{id}` | PUT | idem | `Appointment` | ✅ | `appointment:manage` |
| `/appointments/{id}/status` | `/api/appointments/{id}/status` | PATCH | `{status, reason?}` | `Appointment` | ✅ (+ `NO_SHOW`, motif) | `appointment:manage` |
| `DELETE /appointments/{id}` | – | – | – | – | ⚠️ remplacé par l'annulation | – |

`environment.mockedPrefixes` est désormais vide : plus aucun écran ne lit le backend simulé. Le code du mock (intercepteur, données, `core/mocks/legacy-mock-models.ts`) sera supprimé après validation.

## 2. Calculs métier encore faits par le front

| Emplacement | Calcul | Source de vérité backend | Action |
|---|---|---|---|
| `sales.facade.computeTotals` / `recomputeLine` | Total, marge et lignes du panier | `Sale.total`, `profit`, `subtotal` | Garder comme aperçu ; afficher la `Sale` renvoyée ; ne plus envoyer les prix. |
| `client-detail-page` l. 85-87 | Total acheté, payé, solde | `Customer.balance`, `/customers/{id}/account` | Remplacer. |
| `supplier-detail-page` l. 83-84 | Total achats et paiements | `PurchaseOrder.totalAmount` / `paidAmount` | Remplacer après l'ajout des paiements fournisseurs. |
| `reports-vm.model` l. 58-73 | CA, marge, top produits | `/api/reports/sales/**` | Remplacer. |
| `expenses.facade` | Total des dépenses | `/api/expenses/summary` | ✅ Remplacé. |
| `users.facade` l. 29, `role.guard.ts` | Droits par rôle | `permissions[]` de `/auth/me` | Remplacer. |
| `stock.facade.enrich` | Jointure avec les noms de produits | `StockMovement.productName` | Simplifier. |

## 3. Mécanisme de bascule progressive

- `environment.mockedPrefixes: string[]` liste les préfixes d'URL encore servis par le mock.
- `mockBackendInterceptor` ne traite une requête que si son chemin commence par l'un de ces préfixes. Sinon, la requête part vers `environment.apiUrl`, qui vaut `http://localhost:8080/api`.
- Pour migrer un module, on retire son préfixe de la liste ; le code mock n'est supprimé qu'après validation.
