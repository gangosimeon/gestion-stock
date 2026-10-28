# Intégration GestStock ↔ JeCréeMaBoutique — audit et plan d'implémentation

| | |
|---|---|
| Version | 9 — décisions v9-D1 (`410 CURSOR_EXPIRED`), v9-D2 (`pageToken` ≤ 512), v9-D3 (portes du lot 1) (§ 21) ; **C3 : approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1** ; entrée dans le lot 1 satisfaite sur le plan documentaire, **démarrage non autorisé** ; C1 et C8 ouvertes. Historique : v8 conception détaillée C3/C7, décisions P0 à P8 (§ 20), point bloquant C7 résolu sur le plan documentaire (P7) ; v7 décisions de contrat C2 à C7 (§ 19) ; v6 contrat corrigé (E3) et documents indexés (E5) ; plan A–E (§ 18) ; constat Atlas (§ 5.5) |
| Statut | **Proposition soumise à approbation.** Aucun lot d'implémentation n'est commencé. |
| Code, bases, déploiements | **Aucune modification** du code, des migrations, de la production ni de l'hébergement. Documents : ce fichier et `integration-v1.openapi.yaml` (nouveau). Seule base créée : `geststock_restore_lot0`, sur le PostgreSQL **local** d'essai (§ 17). |
| Périmètre audité | `gestionStock/backend`, `gestionStock/gestion-stock`, `burkina-shop-angular20/backend-gestion-boutique`, `burkina-shop-angular20/gestion-boutique` |
| Secrets | Aucun fichier `.env*` lu ; aucune valeur sensible copiée. Les variables citées le sont par leur **nom**, relevé dans le code. |

Conventions : **[Validé]** décision métier approuvée ; **[Proposé]** choix technique soumis à approbation ;
**[Ouvert]** décision à prendre ; *(à créer)* fichier ou classe qui n'existe pas encore.

---

## 0. Références et URL candidates (D8)

URL de référence fournies : GestStock `https://geststock-frontend.onrender.com/`, JeCréeMaBoutique `https://www.jecreemaboutique.com/`.

URL relevées dans le code et la documentation audités (aucun fichier `.env` ouvert, aucune requête réseau émise). **Aucune n'est validée.**

Vérification sûre commune (à faire par une personne autorisée, hors de cet audit) : `GET <origine>/api/health` en lecture seule depuis un navigateur ou `curl`, sans jeton ni en-tête particulier ; comparer la réponse au format attendu (GestStock : `common/health/HealthController` ; JCMB : route `GET /api/health`). Aucune configuration, aucun callback, aucun compte touché.

| # | URL candidate | Provenance | Éléments de confirmation | Confiance | Vérification sûre |
|---|---|---|---|---|---|
| U1 | `https://geststock-frontend.onrender.com/api` (API GestStock vue du navigateur) | URL fournie + `gestion-stock/src/environments/environment.prod.ts` (`apiUrl: '/api'`) | `gestion-stock/deploy/nginx.conf.template` relaie `/api` vers `${BACKEND_URL}` | Moyenne | `GET …/api/health` → réponse du backend GestStock (et non la page Angular) |
| U2 | Origine du **backend GestStock** : inconnue (`BACKEND_URL`, défaut documenté `http://backend:8080`) | `docs/production.md` | `backend/vercel.json` (service `api`, runtime conteneur) + `backend/Dockerfile.vercel` (« runtime Container, bêta ») → hébergement Vercel probable ; aucun workflow de déploiement | Faible | Lire la valeur de `BACKEND_URL` dans le tableau de bord Render (lecture seule), puis `GET <origine>/api/health` |
| U3 | `https://www.jecreemaboutique.com/api` | `gestion-boutique/src/environments/environment.prod.ts` (`apiUrl: '/api'`) | Domaine public fourni | Moyenne | `GET …/api/health` → format santé JCMB |
| U4 | `https://api.jecreemaboutique.com/api` | Même fichier, ligne **commentée** | Aucun autre élément | Faible | Résolution DNS puis `GET …/api/health` |
| U5 | `https://easyorder-mzaka.duckdns.org` (backend JCMB sur VPS) | `.github/workflows/deploy.yml` (`NEXT_PUBLIC_BASE_URL`) | Déploiement GHCR + SSH vers ce VPS | Moyenne (URL technique, pas pour les partenaires) | `GET …/api/health` |
| U6 | `https://easyorder-backend-wnku.onrender.com` | `environment*.ts` JCMB (`shareBaseUrl`) | Aucun ; semble héritée | Faible | `GET …/api/health` ; si absente, à retirer |
| U7 | `https://easy-order.duckdns.org` | Configuration JCMB | Aucun | Faible | `GET …/api/health` |

Base GestStock : PostgreSQL chez **Neon** (`backend/scripts/backup/README.md`), confiance moyenne.

Callbacks / retours OAuth **[Proposé, non configuré]** :
- écran d'autorisation GestStock : `https://geststock-frontend.onrender.com/integrations/jecreemaboutique/authorize` (route Angular *à créer*) ;
- retour vers JCMB : une route **backend** `…/api/integrations/geststock/callback` *(à créer)* sur l'origine API JCMB retenue ci-dessus ;
- liste blanche à comparaison exacte, une entrée par environnement (essai, production).

Aucun callback n'est configuré ; aucun paramètre Render, Vercel, DNS, OAuth ou de sécurité n'est modifié. **D8 reste ouverte** jusqu'à confirmation des origines backend.

---

## 1. Architecture réelle (livrable 1)

### GestStock

| Élément | Constat (vérifié dans le code) |
|---|---|
| Backend | Spring Boot 4, Spring Security 7, Hibernate 7, Flyway |
| Front | Angular 21 standalone, Angular Material |
| Base | PostgreSQL. **Une base par entreprise** (`platform.company_database`, mode `DEDICATED` ou `LEGACY`) et un schéma `platform` (registre des entreprises, provisionnement, Super Admin, journal plateforme) — `db/platform/V001__platform.sql` |
| Multi-entreprise | `tenancy/TenantContext` (ThreadLocal) posé depuis le claim JWT d'entreprise (`security/JwtTokenService`) ; `tenancy/TenantRoutingDataSource` route vers la base de l'entreprise ; `tenancy/TenantContextFilter` vide le contexte avant et après chaque requête ; `TenantContext.runAs(...)` / `callAs(...)` permettent une tâche de fond au nom d'une entreprise |
| Authentification | JWT émis par le backend (`iss: geststock`, accès 15 min, refresh 7 j) ; jeton plateforme distinct (Super Admin) |
| Autorisation | Permissions fines (`@RequiresPermission`, `security/PermissionPreCheck`), rôles ADMIN / GESTIONNAIRE / CAISSIER ; multi-dépôts (`WarehouseAccess`, en-tête `X-Warehouse-Id`, permission `warehouse:all`, table `user_warehouse`) |
| Stock | `stock/StockService.applyMovements` : verrou `SELECT … FOR UPDATE` sur `stock_level`, contrainte `quantity >= 0` en base |
| Ventes | `sale/SaleService.create` : prix relus par le serveur (tarif du produit), **caisse ouverte obligatoire** pour un paiement, aucun prix envoyé par le client accepté |
| Devis | Module `quote` : vente préparée au POS puis rattachée (mécanisme réutilisable pour les commandes en ligne) |
| Chiffrement | `platform/CredentialCipher` (AES-256-GCM) pour les mots de passe des bases d'entreprise |
| Tâches planifiées | **Aucune** (`@Scheduled` absent) |
| Idempotence | Seulement à la création d'entreprise (`platform.company.idempotency_key`) |

### JeCréeMaBoutique

| Élément | Constat |
|---|---|
| Backend | Next.js 14 (`app/api/**/route.ts`), `services/`, `validators/` (Zod), Mongoose 8 |
| Base | **MongoDB 7, instance Docker unique** (`docker-compose.yml`, commentaire « remplacer par Atlas en production ») ; pas de jeu de réplicas configuré ⇒ **pas de transactions multi-documents** |
| Front | Angular 20 standalone |
| Déploiement | Image Docker (GHCR) déployée par SSH sur un VPS (`.github/workflows/deploy.yml`) ; `vercel.json` présent mais apparemment hérité |
| Authentification | `lib/auth.ts` : JWT HS256 (`JWT_SECRET`, 30 min) + refresh token opaque haché (30 j, rotation) ; `tokenVersion` relu à chaque requête (révocation immédiate) |
| Jetons dans le navigateur | `localStorage` (`bs_token`, `bs_refresh`) — `core/services/auth.service.ts` |
| Rôles | `admin` (plateforme, voit toutes les commandes) ; `user` = une boutique |
| Anti-abus | `lib/tracking-guard.ts` : limite de débit en base (`models/rate-limit.model.ts`, TTL), détection de robots |
| Paiement | **Aucun paiement en ligne** dans le code audité (commande, puis envoi WhatsApp) |
| Tests | Vitest + mongodb-memory-server (`tests/tenant-isolation.test.ts`, `tests/orders.test.ts`…) |

---

## 2. Modèles (livrable 2)

### GestStock (base de chaque entreprise, sauf mention)

- **Entreprise** : `platform.company` (`id` UUID immuable, `code` public, statut). Aucune colonne « entreprise » dans les tables métier : isolation **physique**.
- **Utilisateurs** : `app_user`, `user_role`, `user_warehouse`.
- **Catégories** : `category` (nom unique insensible à la casse, `active`).
- **Produits** : `product` (`sku` unique, `barcode`, `name` ≤ 200, `description` ≤ 1000, `unit` ∈ UNIT/PAIR/BOX/BOTTLE, `retail_price`, `wholesale_price`, `purchase_price`, `active`, `version`) ; photo `product_image` (JPEG ≤ 512 Ko, ≤ 1024 px, `sha256`).
- **Dépôts / stock** : `warehouse`, `stock_level (warehouse_id, product_id, quantity ≥ 0)`, `stock_movement`, `stock_transfer`.
- **Ventes et devis** : `sale`, `sale_line`, `quote`, `quote_line`.

### JeCréeMaBoutique (MongoDB)

- **Boutique = compte** : `models/user.model.ts` (`_id`, `slug` unique, `name`, `phone`, `logo`, `coverColor`, `role`, `banned`, `tokenVersion`).
- **Catégorie** : `models/category.model.ts` (`shopId`, `name`, `normalizedName` unique par boutique, `icon`, `color`, `description`).
- **Produit** : `models/product.model.ts` (`shopId`, `categoryId` obligatoire, `name`, `price`, `originalPrice`, `promotion`, `image` URL, `description` ≤ 500, `unit` libre, `stock`, `inStock`) ; **aucun champ de version métier**.
- **Commande** : `models/order.model.ts` (`shopId`, client non authentifié, `items[]` avec prix recopié, `total` recalculé serveur, statut `pending/confirmed/delivered/cancelled`).

---

## 3. API existantes (livrable 3)

| GestStock | Rôle |
|---|---|
| `GET/POST/PUT/PATCH/DELETE /api/categories` (`category/CategoryController`) | Catégories |
| `GET/POST/PUT/PATCH/DELETE /api/products`, `/api/products/{id}/image` (`product/ProductController`, `ProductImageController`) | Produits, photo |
| `GET /api/stock/levels`, `POST /api/stock/movements` (`stock/StockController`) | Niveaux et mouvements par dépôt |
| `POST /api/sales`, `/api/quotes/*` | Vente au POS, devis rattachable |

| JeCréeMaBoutique | Rôle |
|---|---|
| `/api/auth/*` | Compte boutique |
| `/api/categories`, `/api/products` | CRUD de la boutique connectée (filtre `shopId`) |
| `POST /api/orders?shopSlug=` (`app/api/orders/route.ts`) | Commande **publique**, limitée par IP et par boutique |
| `GET /api/orders`, `/api/orders/[id]` | Commandes du commerçant |
| `/api/public/*` | Vitrine |
| `/api/upload` | Images (Cloudinary) |

Aucune API de service à service n'existe aujourd'hui.

---

## 4. Mécanismes d'authentification et d'autorisation (livrable 4)

Voir § 1. Points à retenir pour l'intégration :
- GestStock relit rôles et permissions en base à chaque requête ; l'entreprise vient du jeton, jamais d'un paramètre.
- JCMB relit `banned` et `tokenVersion` à chaque requête ; le rôle `admin` voit toutes les commandes.
- Aucun des deux ne gère aujourd'hui de client tiers, d'audience dédiée ni de portées.

---

## 5. Décisions métier validées et règles qui en découlent

### 5.1 Prix — D1 et D2 [Validé]

#### Notions

| Notion | Définition | Stockage **[Proposé]** |
|---|---|---|
| Prix de référence | `retail_price` du produit GestStock, versionné par `product.version` | GestStock |
| Prix proposé | Prix de vente demandé par la boutique (portée `price:propose`) | GestStock, table `channel_price` *(à créer)* |
| Prix approuvé | Seul prix **commercialisable** ; recopié dans JCMB avec sa version | GestStock, recopié dans JCMB |

#### D2 — Approbation obligatoire par défaut [Validé]

- Réglage par liaison `price_approval` : `REQUIRED` (**défaut**) ou `NOT_REQUIRED` (activable seulement par un ADMIN, journalisé).
- **Rôle** : un utilisateur GestStock disposant de la nouvelle permission **`integration:price-approve`**, attribuée par défaut au rôle **ADMIN**, attribuable au GESTIONNAIRE par la gestion des rôles existante. Intégration aux permissions existantes : constante dans `common/security/Permissions` (et `Permissions.ALL`), insertion dans `permission` + `role_permission` par migration, comme les permissions déjà ajoutées (`quote:*`, `settings:manage`). Tests impactés : `SchemaConventionsIT`, `RoleApiIT`, `RoleRepositoryIT`, `PermissionCatalogIT`, `RolePermissionMatrixIT` (comptes de permissions).
- **États** : `PROPOSED` → `APPROVED` ou `REJECTED` (motif obligatoire) ; `WITHDRAWN` (retirée par la boutique avant décision) ; `SUPERSEDED` (remplacée par une proposition plus récente). Une seule proposition `PROPOSED` à la fois par (liaison, produit).
- **Concurrence [Décision C6, approuvée le 2026-10-28]** : les propositions concurrentes sont sérialisées sur le couple (liaison, produit) par un verrou en base ; la nouvelle fait passer la précédente à `SUPERSEDED` dans la même transaction ; la proposition retenue est celle qui obtient le verrou en dernier (jamais déduite d'un horodatage applicatif). L'approbation est une mise à jour conditionnée par `status = 'PROPOSED'` : si aucune ligne n'est modifiée, l'approbateur reçoit un conflit. Une proposition dont `basedOnReferenceVersion` n'est plus la version courante du prix de référence est refusée (`422 PRICE_VERSION_MISMATCH`). Mise en œuvre (index unique partiel, verrou) : lot 3, aucune modification à ce stade.
- **Historique** : chaque proposition est une ligne immuable (version, prix, devise, prix de référence et sa version au moment de la proposition, auteur côté boutique, décideur, date, motif) ; journal `audit_log` à chaque décision.
- **Prix en attente** : la boutique affiche le dernier prix approuvé ; si aucun prix n'a jamais été approuvé, le produit est visible mais **non commandable** (« Prix en attente de validation »). Un prix `PROPOSED` ou `REJECTED` n'est jamais vendable.
- **Changement du prix de référence** : n'écrase jamais le prix approuvé. Un avis « Prix de référence modifié : ancien → nouveau » est créé (visible du commerçant et de l'approbateur). Le prix approuvé reste vendable ; le commerçant peut proposer un nouveau prix. **[Ouvert D2b]** : suspendre automatiquement un prix approuvé si le prix de référence varie au-delà d'un seuil (non retenu par défaut).
- Propositions et décisions versionnées et idempotentes (`Idempotency-Key`), une requête rejouée renvoie le résultat enregistré.

#### D1 — Prix appliqué au point de vente : option (a) [Validé sous réserve de compatibilité]

Vérification de compatibilité (code lu) :

| Règle existante | Constat | Compatibilité |
|---|---|---|
| `SaleService.create` relit le tarif du produit (`SalePricing.unitPrice`) et ignore les prix envoyés | Le prix n'est jamais lu depuis la requête | Préservée : nouveau chemin serveur distinct, l'existant inchangé |
| Contraintes `sale_line` (`unit_price > 0`, `line_total = quantity × unit_price − discount_amount`) | Aucune contrainte n'impose le tarif catalogue | Compatible sans modifier `V017` |
| `ck_sale_price_type IN ('RETAIL','WHOLESALE')` | Type de tarif obligatoire | Compatible : la vente reste `RETAIL` ; la source du prix est tracée par la commande d'origine |
| Remise maximale (`GESTSTOCK_SALES_MAX_DISCOUNT_PERCENT`, défaut 20 %) | S'applique aux remises demandées au POS | Le prix boutique n'est pas une remise : il est contrôlé par l'approbation (D2). Une remise portée par la commande reste soumise au plafond |
| Caisse ouverte obligatoire pour un paiement (`CashService.requireOpenSession`) | Vérifiée avant toute écriture | Inchangée, aucun contournement |
| Permission `sale:create`, dépôt courant (`WarehouseAccess`) | Exigés au POS | Inchangés ; s'ajoute la portée de la liaison et le contrôle de la commande |

Comportement retenu **[Proposé]** :
1. Conversion d'une commande : nouveau chemin `SaleService` *(méthode à créer)* qui **ne reçoit que** l'identifiant de commande et les informations de règlement ; il relit côté serveur la commande, sa réservation et l'instantané de prix de chaque ligne.
2. Le prix unitaire de la vente = **prix de l'instantané** de la commande, à condition que ce prix ait été un prix approuvé (version vérifiée dans l'historique `channel_price`) au moment de la commande.
3. **Règle de différence** : si le prix actuellement autorisé diffère du prix de la commande, la vente respecte l'instantané (engagement pris envers le client) ; l'écart est affiché au personnel et journalisé. Si la version de prix de la commande n'a **jamais** été approuvée (anomalie), la conversion est refusée et la commande doit être annulée ou refusée.
4. Traçabilité : `online_order.sale_id` unique (une commande ⇒ au plus une vente par dépôt, D4) ; la vente est retrouvable depuis la commande et inversement.
5. Ventes manuelles : `POST /api/sales` et son comportement restent strictement inchangés (tests de non-régression existants conservés, dont « prix envoyés ignorés »).

Impacts à prévoir (aucun code modifié) :
- **Code** : `sale/SaleService` (nouvelle méthode, réutilisant stock, caisse, crédit et audit existants), `sale/SalePricing` (prix fourni par le serveur), module d'intégration *(à créer)*.
- **Permissions** : `sale:create` + nouvelle permission de traitement des commandes en ligne **[Proposé : `online-order:process`]**.
- **Migrations** : `online_order`, `online_order_line` (instantané : produit, SKU, libellé, prix unitaire, devise, quantité, remise, version de prix), `sale_id` unique ; aucune modification de `sale` ni `sale_line`.
- **Tests** : conversion au prix approuvé ; refus d'un prix non approuvé ; refus sans caisse ouverte pour un paiement ; refus sans `sale:create` ou hors dépôt ; non-régression des ventes manuelles ; double conversion refusée.

### 5.2 Dépôts multiples par boutique — [Validé]

**[Proposé]** table `channel_warehouse` *(à créer)* : liaison, dépôt, `active`, `priority` (entier, plus petit = prioritaire), date d'activation, auteur.

Règles :
1. Seuls les dépôts **actifs, associés et accessibles** à la personne qui a autorisé la liaison (`user_warehouse` ou `warehouse:all`) peuvent être associés ; contrôle répété à chaque opération (un dépôt désactivé côté GestStock est exclu immédiatement).
2. **Disponibilité** d'un produit = calculée sur les seuls dépôts associés actifs :
   - livraison depuis un seul dépôt (par défaut) : `max(dispo d'un dépôt)` ;
   - allocation multi-dépôts autorisée : `somme(dispo des dépôts associés)` ;
   - `dispo d'un dépôt = stock_level.quantity − réservations actives` du dépôt.
   Jamais de somme sur un dépôt non associé ou inactif.
3. **Politique d'approvisionnement [Proposé]** : parcours des dépôts par priorité croissante ; un dépôt prend tout ce qu'il peut si l'allocation multi-dépôts est autorisée, sinon le premier dépôt capable de servir la ligne entière.
4. **Allocation multi-dépôts** : désactivée par défaut, activable par liaison ; la quantité affectée à chaque dépôt est enregistrée ligne par ligne.
5. **Livraison partielle** : désactivée par défaut ; si une ligne n'est pas entièrement servie, la commande entière est refusée (aucune réservation partielle conservée).
6. Allocation et réservation dans **une seule transaction GestStock**, avec verrous `FOR UPDATE` sur les `stock_level` concernés **dans un ordre déterministe** (dépôt puis produit) pour éviter les interblocages.

### 5.3 Produits existant déjà sur JeCréeMaBoutique — [Validé]

1. Ils restent **indépendants** par défaut ; aucune association automatique (ni par nom, ni par SKU, ni par image).
2. **Rapprochement assisté** : un utilisateur autorisé (commerçant JCMB connecté **et** liaison active avec la portée `catalog:match`) recherche un produit GestStock (recherche paginée par l'API d'intégration), voit les **différences** (nom, description, prix, unité, catégorie, image), puis confirme.
3. À la confirmation : les champs détenus par GestStock remplacent ceux de la boutique (après affichage des différences) ; les champs détenus par la boutique (promotion, présentation commerciale, images additionnelles) sont conservés ; si le prix boutique diffère du prix de référence, il devient un **prix proposé** (§ 5.1).
4. **Unicité** : index unique `{shopId, external.source, external.id}` côté JCMB ⇒ un produit GestStock ne peut être associé qu'à un seul produit de la boutique ; une association concurrente échoue proprement (erreur de doublon, aucune donnée modifiée).
5. **Traçabilité** : auteur, date, produit GestStock, résultat (associé / annulé / détaché).
6. **Détachement** : un produit synchronisé peut redevenir indépendant (copie figée, plus de mise à jour).

**Suppressions [Proposé]** :
- `services/category.service.ts › deleteCategory` supprime aujourd'hui les produits de la catégorie (`Product.deleteMany`). Pour une catégorie contenant des produits synchronisés : **refus** (409) avec message explicite ; les produits indépendants gardent le comportement actuel uniquement après confirmation.
- Produit synchronisé : suppression refusée ; actions possibles : **masquer** (boutique), **détacher**. Un produit désactivé dans GestStock est **archivé** dans JCMB (non visible, non commandable, conservé pour l'historique des commandes).
- Catégorie synchronisée : non supprimable dans JCMB ; archivée si désactivée dans GestStock.

### 5.4 Commandes et réservations — V1 [Validé, sous condition de sûreté]

**Faisabilité** : réalisable en V1. Stock et réservations vivent dans **PostgreSQL GestStock** (transactions, verrous de ligne, unicité) ; la réservation ne dépend pas des transactions MongoDB. Côté JCMB, l'état de transmission tient dans **un seul document** de commande. Activation en production **seulement si** les tests de concurrence du lot 6 passent. Aucun report en V2 proposé.

#### Cycle de vie **[Proposé]**

| Étape | Où | État |
|---|---|---|
| 1. Création de la commande | JCMB | `pending`, transmission `TO_SEND`, instantané figé |
| 2. Réception idempotente | GestStock `online_order` *(à créer)* | `RECEIVED` (clé : liaison + identifiant JCMB) |
| 3. Contrôle produits, prix approuvés, dépôts | GestStock | `CHECKED` / `REJECTED` (motif) |
| 4. Réservation (§ 5.2) | GestStock `stock_reservation` *(à créer)* | `RESERVED` / `REJECTED_STOCK` |
| 5. Acceptation ou refus par le personnel | GestStock | `ACCEPTED` / `REFUSED` (libération) |
| 6. Préparation | GestStock | `IN_PREPARATION` |
| 7. Conversion en vente au POS (D1) | GestStock | `CONVERTED` : réservation consommée |
| 8. Paiement | GestStock POS | règles existantes, **caisse ouverte** |
| 9. Annulation / expiration | GestStock | `CANCELLED` / `EXPIRED` |

#### D3 — Expiration des réservations [Validé : 30 minutes]

- **Configuration serveur** *(à créer)* : propriété `geststock.integration.reservation.ttl`, défaut **30 min**, bornes validées au démarrage (**min 5 min, max 24 h [Proposé]**), comme les autres propriétés validées (`@Validated`). Jamais réglable depuis JCMB ni le navigateur.
- **Début du délai** : horodatage serveur PostgreSQL de la transaction GestStock qui crée la réservation (`now()` au moment de l'insertion), **pas** l'heure de la commande JCMB ni de l'envoi. `expires_at = created_at + ttl`, enregistré dans la ligne.
- **Prolongation [Proposé]** : seulement par le personnel GestStock autorisé (acceptation de la commande ou action « prolonger »), une durée fixe configurée, plafond cumulé (ex. 24 h), journalisée. Aucune prolongation automatique ni demandée par la boutique.
- **Réservation logique** : une réservation **ne modifie pas** `stock_level` ; elle est déduite de la disponibilité tant qu'elle est `RESERVED` **et** `expires_at > now()`. Conséquence : l'expiration est **correcte sans tâche planifiée** — une réservation échue cesse immédiatement de compter. Une tâche de fond ne fait que passer les lignes à `EXPIRED` (ménage, notification), sans effet sur le stock.
- **Libération** : `RESERVED → EXPIRED / CANCELLED / RELEASED` par `UPDATE … WHERE id = ? AND status = 'RESERVED'` ; une seule transition réussit ; aucune sortie de stock à annuler.
- **Priorité confirmation / expiration / annulation** : la confirmation (conversion en vente) exige, sous verrou, `status = 'RESERVED' AND expires_at > now()` puis passe à `CONSUMED` dans la **même transaction** que la vente et ses sorties de stock. Une réservation `CONSUMED` ou `CANCELLED` ne peut plus être libérée ni expirée (le filtre `status = 'RESERVED'` échoue). Si la confirmation arrive après l'échéance : refus de consommer ; la vente peut être tentée sur le stock disponible du moment (contrôle normal, sans garantie).
- **Indisponibilité du service** : GestStock indisponible ⇒ pas de réservation, la commande reste `TO_SEND` côté JCMB, le client voit « disponibilité en cours de confirmation », renvois espacés ; le délai commence à la réception effective. Panne de GestStock pendant la vie d'une réservation ⇒ l'échéance est évaluée par horodatage au redémarrage, aucune réservation « immortelle ».
- **Tests de concurrence** : scénarios 14, 15, 16 (§ 10) : N demandes simultanées sur la dernière unité ; rejeu ; expiration, annulation et confirmation simultanées (une seule transition) ; confirmation exactement à l'échéance ; libération rejouée sans double effet.

#### Paiement

Aucun paiement en ligne dans le code audité. S'il est ajouté : notifications authentifiées et vérifiées auprès du prestataire, idempotentes ; un retour navigateur ne prouve jamais un paiement. **La caisse ouverte reste obligatoire** pour toute vente payée ; aucune vente automatique à la réception d'une commande.

### 5.5 Base JeCréeMaBoutique : MongoDB Docker ou Atlas — [Étude ; aucune migration autorisée]

| Critère | Instance Docker unique (actuel) | MongoDB Atlas (cible étudiée) |
|---|---|---|
| Transactions multi-documents | **Non** (exigent un jeu de réplicas ou un cluster partitionné) | Oui (Atlas fonctionne toujours en jeu de réplicas) |
| Cohérence de la réservation | Non concernée : la réservation est dans PostgreSQL GestStock | Idem |
| Concurrence côté JCMB | Mises à jour conditionnelles **par document** (filtre sur version), index uniques | Idem, plus transactions pour regrouper « appliquer événement + avancer le curseur » |
| Sauvegarde / restauration | `mongodump` manuel ou script ; restauration testée à prévoir | Sauvegardes gérées (instantanés ; restauration à un instant donné selon l'offre) |
| Disponibilité | Un seul nœud : panne = indisponibilité | Trois nœuds, bascule automatique (offres dédiées) |
| Sécurité réseau | Port 27017 exposé dans `docker-compose.yml` (à restreindre) | Liste d'IP autorisées, TLS imposé, utilisateurs par rôle |
| Compatibilité Next.js | `lib/db.ts` (Mongoose, `MONGODB_URI`) | Inchangée : changement de chaîne de connexion (`mongodb+srv`) |
| Observabilité | À outiller | Métriques et alertes intégrées |

**Coûts** : estimation non vérifiable à la date de rédaction (2026-10-28) — aucune source tarifaire consultée. Ordres de grandeur connus avant juin 2026, **à revérifier** sur la page tarifaire officielle : une offre gratuite partagée (sans sauvegarde gérée ni garanties, inadaptée à la production), une offre « flexible » facturée à l'usage, et des clusters dédiés à partir de quelques dizaines de dollars US par mois (M10). Frais possibles en plus : transfert de données sortant, sauvegardes continues, région, support. Hypothèses de charge à fournir : volume de données, requêtes par seconde, nombre de boutiques.

**Migration (non autorisée)** : `mongodump` → `mongorestore` vers Atlas en environnement d'essai, double vérification des comptages, bascule de `MONGODB_URI`, retour arrière = rebascule vers l'instance Docker conservée intacte en lecture seule pendant la période d'observation.

**Conclusion [Proposé]** : Atlas améliore disponibilité, sauvegardes et permet les transactions, mais **ne remplace ni** les contraintes d'unicité, **ni** les contrôles de version, **ni** l'idempotence, **ni** les tests de concurrence. Le plan est conçu pour fonctionner sur l'instance actuelle ; Atlas est un prérequis de mise en production recommandé, à décider (§ 11).

**Constat contradictoire (v5, non tranché)** : `backend-gestion-boutique/docker-compose.yml` déclare le service `mongodb` (`mongo:7-jammy`) « dev uniquement » et indique (ligne 14) qu'**en production MongoDB est remplacé par Atlas** (`MONGODB_URI`). Les versions précédentes de ce document supposaient une instance Docker en production. Il s'agit d'un commentaire de configuration, **pas d'une preuve** ; la valeur de `MONGODB_URI` en production n'a pas été lue (fichier `.env` exclu). Conséquences si Atlas est confirmé : D7 porte sur l'offre et non sur la migration ; transactions disponibles si l'offre fournit un jeu de réplicas ; la restauration de production relève des sauvegardes Atlas et le test local (§ 18.3) ne valide que les outils et le format. Vérification sûre : lecture par le responsable de l'hôte de `MONGODB_URI` (sans copier sa valeur) ou de la console Atlas — **autorisation requise**.

### 5.6 Conservation des événements de synchronisation — D5 [Validé : 90 jours minimum]

- **Périmètre** : la règle vise uniquement `integration_outbox` (événements de synchronisation). `audit_log`, ventes, commandes et réservations **ne sont pas** purgés par cette règle ; toute rétention les concernant demande une analyse distincte.
- **Condition de purge** (les deux à la fois) : événement plus ancien que **90 jours** **et** `seq` inférieur au plus petit curseur **acquitté** par toutes les liaisons actives ou suspendues. JCMB acquitte son curseur après application (`POST …/changes/ack`, à créer dans le contrat).
- **Jamais purgés** : événements non acquittés, liaisons en erreur ou suspendues, sauf procédure explicite d'**abandon** (liaison révoquée, décision ADMIN journalisée).
- **Reprise sans les événements purgés** : la réconciliation par instantané (`snapshot`) reconstruit l'état courant du catalogue ; une purge ne rend donc pas la reprise impossible.
- **Données personnelles** : les événements de catalogue n'en contiennent pas ; les événements de commande ne transportent que des identifiants (jamais nom, téléphone ou adresse du client). Durée de conservation des commandes en ligne et de leurs données client : **[Ouvert]**, à aligner sur la politique de données personnelles.
- **Observabilité** : tâche de purge en mode simulation par défaut (comptage sans suppression), puis suppression par lots bornés ; métriques (événements en attente, purgés, plus ancien non acquitté) ; journal de chaque exécution.
- **Réversibilité** : une suppression est définitive ; avant purge, export optionnel des lots (format JSON compressé) vers le stockage des sauvegardes ; sinon, recours à la sauvegarde nocturne et à la réconciliation.
- **Volume (hypothèses à valider)** : ~0,5 Ko par événement avec index ; 2 000 événements/jour/entreprise ⇒ ~180 000 événements et ~90 Mo par entreprise sur 90 jours. Index : clé primaire `write_id`, index unique sur `seq`, index partiel `seq IS NULL`, index sur `created_at` (conception D, § 20 ; *v7 et antérieures : « clé primaire `seq` », incompatible avec un `seq` nul à l'écriture*). Coût de stockage Neon à vérifier selon l'offre.
- **Purge et conception D** : un événement sans `seq` n'est jamais purgé. **Repère de purge [Approuvé, v9-D1]** : GestStock conserve durablement le plus haut `seq` purgé (emplacement : détail d'implémentation du lot 1) ; un `after` strictement inférieur à ce repère reçoit `410 CURSOR_EXPIRED` et le consommateur repart d'un instantané complet (§ 12, § 21). Points **ouverts, rattachés à C8** (§ 20.5) : durée de rétention ; règle de purge, dont l'exclusion des liaisons révoquées et le traitement des liaisons inactives dans le calcul du plus petit curseur acquitté. *v8 : « erreur renvoyée pour un curseur antérieur à la purge » ouverte — tranchée dans son principe par v9-D1.*

---

## 6. Écarts entre modèles (livrable 5)

| Donnée | GestStock | JeCréeMaBoutique | Traitement **[Proposé]** |
|---|---|---|---|
| Identifiant | UUID | ObjectId | Sous-document `external {source, id, version, syncedAt, archived}` + index unique partiel `{shopId, external.source, external.id}` |
| Catégorie | nom, description | + icône, couleur | Nom/description : GestStock ; icône/couleur : boutique |
| Unicité catégorie | `lower(name)` | `normalizedName` par boutique | Compatibles ; collision avec une catégorie indépendante ⇒ rapprochement proposé, jamais automatique |
| Description | ≤ 1000 | ≤ 500 | Limite JCMB portée à 1000 pour les produits synchronisés |
| Unité | énumération | texte | UNIT→pièce, PAIR→paire, BOX→boîte, BOTTLE→bouteille |
| Prix | détail, gros, achat | prix + promotion | § 5.1 ; le prix d'achat ne quitte jamais GestStock |
| Image | binaire | URL Cloudinary | Le backend JCMB lit l'image par l'API d'intégration et la republie ; ré-envoi seulement si `sha256` change |
| Stock | par dépôt | un nombre | § 5.2 |
| Suppression | désactivation | suppression physique, cascade catégorie→produits | § 5.3 |
| Version | `version` (verrou optimiste) | aucune | Version GestStock recopiée dans `external.version` |

---

## 7. Propriété des données (matrice)

| Donnée | Source de vérité | Règle de mise à jour |
|---|---|---|
| Nom, SKU, description, unité d'un produit synchronisé | GestStock | Synchronisation ; lecture seule dans JCMB |
| Catégorie (nom, appartenance d'un produit) | GestStock | Synchronisation ; icône/couleur : boutique |
| Prix de référence | GestStock | Synchronisation ; n'écrase jamais un prix approuvé |
| Prix de vente boutique (proposé / approuvé) | Proposé par la boutique, approuvé dans GestStock | Versionné, idempotent, journalisé (§ 5.1) |
| Promotions, présentation commerciale, images additionnelles | Boutique | Jamais modifiées par la synchronisation |
| Image principale | GestStock | Synchronisation par empreinte |
| Stock, disponibilité | GestStock (dépôts associés) | Lecture seule dans JCMB, horodatée (§ 9, lot 4) |
| Réservations | GestStock | Créées, confirmées, libérées uniquement par GestStock |
| Commandes (création, client, livraison, instantané) | Boutique | Transmises à GestStock ; lignes immuables |
| État de traitement de la commande | GestStock | Renvoyé à JCMB |
| Clients et informations de livraison | Boutique | Transmises pour la commande ; aucune fusion automatique avec les clients GestStock |
| Boutique (slug, logo, couleurs) | Boutique | — |
| États de synchronisation | Chaque côté pour sa part (curseur, erreurs) | Visibles dans les deux interfaces |

---

## 8. Risques (livrables 6, 7, 8)

### Isolation et accès
- Requête d'intégration traitée sans contexte d'entreprise, ou avec un autre : l'entreprise est **toujours** déduite de la liaison authentifiée, jamais d'un identifiant fourni.
- Tâche de fond sans contexte : chaque traitement s'exécute via `TenantContext.runAs(entreprise de la liaison)`.
- Accès direct à un objet d'une autre entreprise (identifiant deviné) : chaque objet est relu dans la base de l'entreprise de la liaison ; introuvable sinon.
- Rôle `admin` JCMB : ne voit jamais les secrets de liaison.
- Liaison usurpée : jamais par e-mail, téléphone, nom ou slug.

### Sécurité
- Jetons JCMB en `localStorage` (XSS) : les secrets de liaison ne quittent jamais les backends.
- Vol / rejeu de jeton : jetons courts, audience dédiée, statut de liaison relu à chaque appel, codes à usage unique.
- Modification de propriétés sensibles : champs détenus par GestStock refusés par l'API JCMB pour les produits synchronisés.
- Injection : validation stricte (Bean Validation / Zod), tailles maximales, identifiants vérifiés.
- Surcharge : limites de débit par liaison et par boutique ; files avec reprise espacée.
- Journaux : aucun en-tête `Authorization`, code, secret ou signature journalisé.
- Contournement multi-dépôts : dépôt vérifié à chaque opération (§ 5.2).

### Synchronisation
- Doublons, désordre, panne JCMB, révocation en cours, changement de catégorie, archivage, image modifiée.
- Instance Mongo sans transactions : application d'un événement et avancée du curseur non atomiques ⇒ application **idempotente** obligatoire (rejouer un événement ne change rien).

### Stock et commandes
- Aujourd'hui une commande JCMB ne vérifie que `inStock` et ne réserve rien : risque de vente du dernier article à plusieurs clients — traité par le lot 6.
- Vente au prix boutique : levé par D1 (prix relu côté serveur depuis l'instantané approuvé, § 5.1) ; risque résiduel = régression des ventes manuelles, couvert par les tests de non-régression.
- Conversion multi-dépôts : une vente GestStock se fait dans le dépôt courant ⇒ une commande allouée sur deux dépôts donne **deux ventes** (une par dépôt) ; à valider.

---

## 9. Plan d'implémentation par lots (livrables 9 à 12)

Règles communes : un lot = une branche dédiée, testé en environnement isolé ; aucun déploiement, aucune migration de production, aucun envoi vers une branche distante sans autorisation explicite ; **arrêt** si un test critique échoue.

### Lot 0 — Décisions et environnement de test

| Rubrique | Contenu |
|---|---|
| Objectif | Arrêter les décisions, préparer des environnements isolés et les stratégies de test |
| Périmètre | Documentation, contrat OpenAPI `integration/v1` *(à créer)*, environnements d'essai |
| Décisions validées | § 5.1 à 5.5 |
| Décisions restantes | § 11 |
| Environnements | GestStock (au moins deux entreprises d'essai, bases distinctes) ; JCMB avec Mongo d'essai ; aucune donnée de production ; aucun accès aux secrets de production |
| Concurrence | Tests d'intégration GestStock sur PostgreSQL réel (exécutions parallèles, barrières de démarrage) ; tests JCMB avec mongodb-memory-server en mode jeu de réplicas pour vérifier aussi le comportement transactionnel |
| Mongo / Atlas | § 5.5 |
| Sauvegarde / restauration | `pg_dump` par base d'entreprise et du schéma `platform` ; `mongodump` ; restauration testée en essai avant le premier déploiement |
| Secrets requis (noms seulement) | Existants relevés : GestStock `GESTSTOCK_TENANT_CREDENTIALS_KEY`, clé de signature JWT (nom à confirmer) ; JCMB `JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Nouveaux *(à définir)* : identifiant et secret du client JCMB chez GestStock ; clé de chiffrement des secrets de liaison côté JCMB ; secret HMAC de notification par liaison |
| Fichiers | Ce document ; aucun fichier applicatif |
| Migrations | Aucune |
| Risques | Décisions incomplètes |
| Critères d'acceptation / sortie | Décisions § 11 tranchées ; contrat OpenAPI approuvé ; environnements d'essai disponibles ; procédure de restauration testée ; stratégie de concurrence approuvée |
| Retour arrière | Sans objet |
| Preuves attendues | Document approuvé, contrat versionné, journal d'essai de restauration |
| Conditions d'arrêt | Décision bloquante non tranchée (prix au POS, durée de réservation) |
| Autorisation avant lot 1 | Approbation explicite écrite |

### Lot 1 — Enregistrement fiable des changements dans GestStock

| Rubrique | Contenu |
|---|---|
| Objectif | Chaque changement de catégorie, produit, prix de référence, image et stock produit un événement durable, dans la transaction métier |
| Périmètre | GestStock uniquement ; aucun appel vers JCMB |
| Fichiers concernés | Existants : `category/CategoryService`, `product/ProductService`, `product/ProductImageService` (P6, P7), `stock/StockService` ; à créer : module `com.geststock.integration` — point d'entrée unique d'écriture (ex. `IntegrationEvents.publish`), composant séquenceur, purge |
| Migrations | `V047__integration_outbox.sql` *(à créer)* : `integration_outbox` (`write_id` identity, clé primaire, jamais exposé ; `seq` **NULL à l'écriture, UNIQUE**, attribué à la lecture ; index partiel `seq IS NULL` ; type, identifiant d'objet, version, opération, charge minimale, `created_at`), `integration_feed_state` (une seule ligne : `id = 1`, `last_seq`), `product_image_generation` (P7) ; permissions `integration:manage`, `integration:price-approve` ; rollback `U047`. *v6 et antérieures : `seq` bigserial attribué à l'écriture — abandonné (risque d'événement sauté, § 19.2)* |
| Versions | Conception D (§ 20.2) : `seq` attribué à la lecture, contigu, dans l'ordre de `write_id`, aux seuls événements validés ; ordre d'application par (`type`, `objectId`) (C7) ; origine de `version` par famille (P3, § 20.3). *v7 : point bloquant « version de `PRODUCT_IMAGE` » — résolu sur le plan documentaire par P7* |
| Exigences d'implémentation (P0) | 1. Attribution dans une transaction **dédiée et courte** (`TransactionTemplate` ou `REQUIRES_NEW`), jamais incluse dans un `@Transactional` englobant la requête, jamais `readOnly = true` ; 2. `lock_timeout` et `statement_timeout` définis pour cette transaction (valeurs à fixer au lot 1) ; 3. attribution isolée dans un **composant séquenceur unique** et réutilisable (flux et instantané) ; 4. **point d'entrée unique** d'écriture d'événement appliquant R1 (flush, lecture de la version, insertion) ; aucun service métier n'insère directement dans l'outbox ; 5. le point de terminaison du flux **écrit en base** : ni réplica en lecture seule, ni cache ; 6. métriques : nombre d'événements sans `seq`, âge du plus ancien d'entre eux |
| Vérification préalable (P8) | Lecture seule, au début du lot : l'URL de connexion de l'application contient-elle `-pooler` ? Sans effet sur la conception D ; déterminant pour tout futur verrou consultatif de session |
| Rétention | § 5.6 (90 jours minimum, acquittement requis) ; purge livrée **désactivée** |
| Reprises | Lecture rejouable depuis tout `seq` (exposée au lot 3) |
| Dépendances | Lot 0 accepté |
| Porte d'entrée (v9-D3) | Conception détaillée C3 approuvée (P0 à P8, v9-D1, v9-D2) : **satisfaite sur le plan documentaire**. **Ne vaut pas autorisation de démarrer** : le démarrage du lot 1 fera l'objet d'une autorisation séparée |
| Porte de sortie (v9-D3) | T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 réussis sur PostgreSQL 17 (Testcontainers) : **non satisfaite**. La validation de C3 est prononcée **uniquement** à cette sortie |
| Risques | Événement écrit hors transaction (perte) ; surcoût d'écriture sur stock et ventes ; croissance de table ; régression des comptes de permissions dans les tests |
| Tests | Un changement ⇒ un événement dans la même transaction ; rollback métier ⇒ aucun événement ; `seq` strictement croissant sous écritures concurrentes ; isolation (deux entreprises d'essai, aucun événement croisé) ; purge en simulation ne supprime rien ; suite complète GestStock (unitaire + intégration) sans régression ; **T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 (§ 20.4)** — aucun n'est écrit ni exécuté |
| Critères d'acceptation (sortie) | Tous les tests verts, dont **T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6** (PostgreSQL 17, Testcontainers) ; temps d'une vente de 10 lignes non dégradé de plus de 10 % [Proposé] (T-C3-8) ; aucune régression ; exigences P0 1 à 6 vérifiées en revue ; vérification P8 consignée ; **C3 démontrée** (revue du mécanisme) — C3 n'est « validée » qu'à ce moment |
| Retour arrière | Publication désactivable par configuration ; `U047` (aucune donnée métier touchée) |
| Preuves | Rapport de tests, revue de code, mesure avant/après |
| Conditions d'arrêt | Régression ventes/stock ; événement hors transaction ; fuite entre entreprises |
| Autorisation | Approbation écrite avant lot 2 |

### Lot 2 — Liaison et autorisation

| Rubrique | Contenu |
|---|---|
| Objectif | Lier explicitement une entreprise GestStock et une boutique JCMB |
| Flux | 1) JCMB crée `state` (256 bits, haché, 10 min, lié à la boutique) et un vérificateur PKCE, puis redirige vers l'écran d'autorisation GestStock ; 2) personne GestStock connectée, permission `integration:manage`, voit la boutique, choisit les dépôts (accessibles par elle) et les portées, confirme ; 3) GestStock émet un **code** (256 bits, seul le haché est stocké, 5 min, usage unique, lié à l'entreprise, au client, à l'URL de retour exacte et au défi PKCE) et redirige vers l'URL préenregistrée ; 4) le backend JCMB vérifie `state` (usage unique) et échange le code serveur à serveur (secret client + vérificateur PKCE) ; 5) GestStock renvoie la liaison et un secret (montré une fois ; haché côté GestStock, chiffré AES-GCM côté JCMB) |
| États de liaison | `PENDING` → `ACTIVE` → `SUSPENDED` (temporaire, réactivable) / `REVOKED` (définitif) ; réautorisation = nouveau flux complet |
| Appels de service | Jeton court (5 min) par `client_credentials` ; `iss=geststock`, `aud` dédiée, `sub` = liaison, portées ; statut de liaison relu à chaque appel |
| Portées | `catalog:read`, `catalog:match`, `price:propose`, `stock:read`, `orders:read`, `orders:write` ; `orders:write` implique `orders:read` [Décision C5, approuvée]. `reservations:write` retirée : fusionnée dans `orders:write` (la réservation est créée avec la commande, § 12) |
| Révocation par la boutique | `POST /link/revoke` [Décision C2, approuvée] : définitive, motif facultatif, `REVOKED` + `revokedAt` + secret invalidé + audit ; ancienne liaison ⇒ `401 LINK_REVOKED` (traité par le client comme succès idempotent) ; réservations et commandes engagées conservées jusqu'à expiration ou conversion ; nouvelle connexion = nouvelle autorisation, nouvelle liaison |
| URL de retour | **Non définies** ; liste blanche stricte, comparaison exacte |
| Fichiers concernés | Existants : `security/JwtTokenService`, `security/SecurityConfig`, `tenancy/TenantContext`, `platform/CredentialCipher`, `platform/audit/PlatformAudit` ; JCMB `lib/auth.ts`, `middleware.ts`. À créer : contrôleurs et services d'intégration, collection `geststocklinks`, écrans des deux fronts |
| Migrations | `platform/V002__integration_link.sql` *(à créer)* : `integration_client`, `integration_link`, `integration_authorization_code` ; rollback `U002`. JCMB : script `scripts/migrate-geststock-link.mjs` *(à créer)* |
| Angular | GestStock : écran de consentement, « Paramètres → Boutique en ligne » (dépôts, suspension, révocation). JCMB : « Connecter GestStock », statut |
| Dépendances | Lot 0 (URL de retour, secrets d'essai) |
| Risques | Erreur de flux = liaison usurpée : tests négatifs obligatoires |
| Tests | Scénarios 1, 2, 3 (§ 10) + jeton d'audience/émetteur incorrect, expiré, liaison suspendue ; aucun secret dans réponses Angular ni journaux ; critères C2 et C5 (§ 19.3) |
| Critères d'acceptation | Tous les scénarios négatifs refusés sans effet de bord |
| Retour arrière | Toutes les liaisons à `REVOKED`, routes désactivées, `U002`, collection supprimée |
| Preuves | Rapport de tests de sécurité, journal plateforme |
| Conditions d'arrêt | Un seul scénario de rejeu ou d'usurpation qui réussit |
| Autorisation | Approbation avant lot 3 |

### Lot 3 — Synchronisation des catégories, produits et prix

| Rubrique | Contenu |
|---|---|
| Objectif | Copier le catalogue autorisé vers la boutique, sans perte ni écrasement |
| GestStock | API paginée `changes?after=<seq>&limit=`, `snapshot` (réconciliation), recherche pour le rapprochement, image, propositions et approbations de prix ; notification signée (HMAC, horodatage, identifiant, fenêtre 5 min) envoyée par une tâche planifiée par entreprise (`TenantContext.runAs`) |
| JCMB, instance actuelle | Consommateur : catégories avant produits ; `updateOne` conditionné `external.version < version reçue` ; registre des événements appliqués (index unique liaison + `seq`) ; curseur avancé **après** application ; rejouer un événement ne change rien |
| JCMB, si Atlas | Application de l'événement et avancée du curseur dans une transaction ; les règles d'idempotence restent |
| Propriété des champs | § 7 ; champs GestStock en lecture seule (API et Angular JCMB) |
| Suppressions | § 5.3 ; modification de `services/category.service.ts › deleteCategory` et `services/product.service.ts › deleteProduct` |
| Rapprochement | § 5.3 |
| Délais attendus **[Proposé]** | Notification ≤ 1 min après le changement ; réconciliation quotidienne ; une synchronisation non reçue apparaît « en retard » au-delà de 15 min |
| Fichiers concernés | JCMB existants : `models/product.model.ts`, `models/category.model.ts`, `services/product.service.ts`, `services/category.service.ts`, `validators/product.validator.ts` ; à créer : consommateur, modèles `syncstates`, écrans de statut et de rapprochement |
| Migrations | GestStock `V048__sales_channel.sql` *(à créer)* : `channel_warehouse`, `channel_price` ; JCMB `scripts/migrate-external-ids.mjs`, `scripts/migrate-sync-cursor.mjs` *(à créer)* ; rollbacks associés |
| Dépendances | Lots 1 et 2 ; **consommateur direct du flux** (`/catalog/changes`, instantané) : bloqué tant que C3 n'est pas validée en sortie du lot 1 (v9-D3) |
| Risques | Écrasement de données boutique ; doublons |
| Tests | Scénarios 4 à 9, 19 ; critères C3 côté instantané (T-C3-3 à T-C3-6), C6 et C7 (§ 19.3) |
| Critères d'acceptation | Catalogue identique après synchronisation et après réconciliation ; aucun champ boutique modifié |
| Retour arrière | Arrêt du consommateur ; produits synchronisés marqués « déconnectés » et conservés ; scripts Mongo inverses ; `U048` |
| Preuves | Comparaison catalogue avant/après sur données d'essai |
| Conditions d'arrêt | Toute perte ou tout écrasement constaté |
| Autorisation | Approbation avant lot 4 |

### Lot 4 — Disponibilité indicative

| Rubrique | Contenu |
|---|---|
| Objectif | Afficher une disponibilité fiable sans promettre une réservation |
| Calcul | § 5.2, uniquement sur dépôts associés actifs, réservations actives déduites |
| Fréquence | Événement à chaque mouvement de stock, réservation ou libération ; réconciliation périodique |
| Données périmées | Horodatage de la dernière disponibilité reçue ; au-delà d'un seuil **[Ouvert, ex. 15 min]** : « disponibilité à confirmer » |
| Différence avec la réservation | Indicative = information ; seule la réservation (lot 6) garantit la quantité |
| JCMB | `stock`/`inStock` en lecture seule ; contrôle `quantité ≤ disponibilité connue` à la commande (`services/order.service.ts`) |
| Migrations | Aucune nouvelle |
| Dépendances | Lot 3 ; **consommateur direct du flux** (événements `AVAILABILITY`) : bloqué tant que C3 n'est pas validée (v9-D3) |
| Tests | Scénarios 11, 12, 17 |
| Retour arrière | Retour à `inStock` manuel |
| Conditions d'arrêt | Disponibilité calculée sur un dépôt non associé |
| Autorisation | Approbation avant lot 5 |

### Lot 5 — Transfert et traitement des commandes

| Rubrique | Contenu |
|---|---|
| Objectif | Transmettre chaque commande à GestStock une seule fois et la faire traiter par le personnel |
| JCMB | État de transmission dans le document de commande (`TO_SEND`, `SENT`, `FAILED`, tentatives, prochaine tentative) ; envoi avec `Idempotency-Key` = identifiant de commande ; reprise espacée |
| GestStock | Réception idempotente ; boîte « Commandes en ligne » ; acceptation/refus ; conversion en vente au POS pré-remplie (mécanisme des devis : `sales/data/sales.facade.ts › loadQuote` comme modèle) ; paiement selon les règles de caisse existantes |
| États | § 5.4 |
| Fichiers concernés | JCMB : `app/api/orders/route.ts`, `services/order.service.ts`, `models/order.model.ts` ; GestStock : `sale/SaleService` (si option (a) § 5.1), module d'intégration *(à créer)*, front POS |
| Migrations | GestStock `V049__online_order.sql` *(à créer)*, avec unicité (liaison, `externalOrderId`) [Décision C4] ; JCMB : champs d'instantané et de transmission sur `orders` |
| Dépendances | Lots 2 et 3 ; décision prix au POS (§ 5.1). Pas de lecture du flux prévue dans ce lot ; **bloqué indirectement** par sa dépendance au lot 3 (v9-D3) |
| Tests | Scénarios 10, 18, 20 ; critères C4 (§ 19.3) |
| Retour arrière | Arrêt de la transmission ; les commandes restent dans JCMB comme aujourd'hui |
| Conditions d'arrêt | Vente payée créée sans caisse ouverte ; commande dupliquée |
| Autorisation | Approbation avant lot 6 |

### Lot 6 — Réservation de stock (visée V1)

| Rubrique | Contenu |
|---|---|
| Objectif | Garantir la quantité commandée jusqu'à la vente, l'annulation ou l'expiration |
| Allocation | § 5.2 (priorités, multi-dépôts si autorisé, pas de partiel par défaut) |
| Atomicité | Une transaction PostgreSQL : verrous ordonnés, recalcul, insertion de la réservation et de ses lignes |
| Idempotence | Unicité (liaison, commande externe) ; rejouer renvoie la réservation existante |
| Expiration | 30 min configurable côté serveur (D3) ; échéance évaluée par horodatage, correcte sans tâche planifiée ; ménage différé ; transitions gardées (§ 5.4) |
| Annulation / confirmation | Transitions gardées en base ; une seule réussit |
| Migrations | `V050__stock_reservation.sql` *(à créer)* ; rollback `U050` après libération de toutes les réservations |
| Tests obligatoires | Scénarios 12 à 17, plus charge : N demandes simultanées sur la dernière unité ⇒ une seule réussit ; aucun stock disponible négatif |
| Critères d'activation | Tous les tests de concurrence verts sur PostgreSQL réel, 100 exécutions sans écart ; revue de code ; aucune régression POS |
| Si non sûr | Analyse argumentée de report (blocage exact, risques, mesures temporaires, impact, travail restant, critères) soumise à approbation — **aucun report appliqué d'office** |
| Retour arrière | Désactivation de la réservation par liaison (retour à la disponibilité indicative) ; libération de toutes les réservations ; `U050` |
| Conditions d'arrêt | Une seule survente ou double libération observée |
| Autorisation | Approbation avant lot 7 |

### Lot 7 — Durcissement et exploitation

| Rubrique | Contenu |
|---|---|
| Alertes | Retard de synchronisation, erreurs répétées, réservations expirées en masse, échecs de transmission |
| Métriques | Événements en attente par liaison, délai de bout en bout, taux d'échec, réservations actives |
| Journaux | Sans secrets, codes, signatures ; identifiant de corrélation |
| Exploitation | Réconciliation, reprise après incident, sauvegardes et restauration testées, procédure de révocation d'urgence, rotation des secrets |
| Critères de mise en production | Lots 1 à 6 acceptés ; décision Atlas ; restauration testée ; procédure de révocation exercée ; validation écrite |
| Retour arrière | Suspension de toutes les liaisons ; boutiques en mode indépendant |

---

## 10. Tests d'acceptation

| # | Scénario | Résultat attendu | Doit rester inchangé en cas d'échec |
|---|---|---|---|
| 1 | Liaison de l'entreprise A utilisée pour lire un produit de l'entreprise B | 404, aucune donnée de B | Bases A et B |
| 2 | Liaison sans `integration:manage` ; code rejoué ; code d'une autre entreprise ; URL de retour modifiée ; PKCE invalide | Refus, aucune liaison créée | Registre des liaisons |
| 3 | Révocation pendant une synchronisation | Appels suivants 401 ; aucune écriture après révocation | Catalogue boutique au dernier état valide |
| 4 | Même événement reçu deux fois | Appliqué une fois | Produit, curseur |
| 5 | Événements reçus dans le désordre | La version la plus récente gagne | Donnée plus récente |
| 6 | JCMB indisponible puis reprise | Tous les événements appliqués, aucun perdu | Outbox GestStock |
| 7 | Suppression d'une catégorie contenant des produits synchronisés | Refus 409 | Catégorie et produits |
| 8 | Deux rapprochements simultanés vers le même produit GestStock ; rapprochement erroné | Un seul réussit ; le mauvais est détachable | Produits non concernés |
| 9 | Prix de référence modifié après approbation d'un prix boutique | Prix approuvé conservé ; avis affiché | Prix approuvé |
| 10 | Commande puis changement de prix | Commande garde son instantané | Lignes de commande |
| 11 | Boutique tente un dépôt non associé ou inactif | Refus | Stock, réservations |
| 12 | Produit absent du premier dépôt, présent dans un autre associé | Allocation sur le second | Stock du premier |
| 13 | Allocation impossible en totalité | Refus complet (partiel désactivé) | Aucun stock réservé |
| 14 | Deux commandes concurrentes pour la dernière unité | Une réservée, une refusée | Stock jamais négatif |
| 15 | Demande de réservation répétée | Même réservation renvoyée | Une seule réservation |
| 16 | Expiration, annulation et confirmation simultanées | Une seule transition réussit | Stock libéré ou consommé une seule fois |
| 17 | Dépôt désactivé pendant une commande en cours | Plus d'allocation sur ce dépôt ; réservations existantes traitées selon procédure | Autres dépôts |
| 18 | Commande reçue deux fois par GestStock | Une seule commande | Boîte « Commandes en ligne » |
| 19 | Échec de synchronisation puis réconciliation | Écarts corrigés | Données boutique propres |
| 20 | Conversion en vente payée sans caisse ouverte | Refus (règle existante) | Aucune vente, aucun mouvement |

---

## 11. Décisions : état

| # | Décision | État | Bloque |
|---|---|---|---|
| D1 | Prix au POS : option (a), prix relu côté serveur depuis l'instantané approuvé | **Validé** (compatibilité vérifiée § 5.1) | — |
| D2 | Approbation obligatoire par défaut, permission `integration:price-approve` (ADMIN) | **Validé** | — |
| D2b | Suspension automatique d'un prix approuvé si le prix de référence varie au-delà d'un seuil | Ouvert (non retenu par défaut) | Lot 3 |
| D3 | Réservation : 30 min, configurable serveur, bornes 5 min – 24 h | **Validé** (bornes proposées) | — |
| D4 | Commande multi-dépôts : une vente par dépôt | Ouvert | Lots 5-6 |
| D5 | Rétention outbox : 90 jours minimum, acquittement requis | **Validé** sous réserve de validation technique | — |
| D6 | Seuil de disponibilité « périmée » | Ouvert | Lot 4 |
| D7 | MongoDB Atlas avant production ; offre | Ouvert | Lot 7 |
| D8 | URL backends et callbacks | **Ouvert** : candidates U1-U7 § 0 | Lot 2 |
| D9 | Hébergement du backend GestStock et tâches planifiées | Ouvert : options § 13 | Lots 3, 6 |
| D10 | Permission de traitement des commandes en ligne (`online-order:process`) | Ouvert (proposé) | Lot 5 |
| D11 | Conservation des commandes en ligne et des données client | Ouvert | Lot 5 |

### 11.1 Décisions ouvertes — détail [aucune n'est considérée comme validée]

| # | Conséquences métier | Risques | Dépendances | À trancher avant |
|---|---|---|---|---|
| **D2b** | Si oui : une hausse forte du prix de référence (ex. coût d'achat) retire le produit de la vente en ligne jusqu'à nouvelle approbation. Si non : la boutique continue au prix approuvé, alerte seulement (`referenceChangedSinceApproval`) | Oui : ventes interrompues sans action humaine. Non : vente sous le prix souhaité, marge réduite | D1, D2 (validées) ; format de `ChannelPrice` (OpenAPI) | Début du lot 3 |
| **D4** | Une commande servie par plusieurs dépôts produit une vente par dépôt (stock et caisse cohérents par dépôt) ; le client voit une seule commande, la comptabilité plusieurs tickets | Sans décision, le lot 5 ne sait pas convertir ; une vente unique multi-dépôts est **incompatible** avec le modèle actuel (`sale.warehouse_id` unique) | Option multi-dépôts (§ 5.2, désactivée par défaut) ; D10 | Début du lot 5 (seulement si l'allocation multi-dépôts est activée) |
| **D6** | Au-delà du seuil, la boutique affiche « disponibilité à confirmer » au lieu d'une quantité | Seuil trop long : promesse de stock fausse ; trop court : affichage dégradé à chaque latence | D9 (fréquence réelle de synchronisation) ; `computedAt` (OpenAPI) | Début du lot 4 |
| **D7** | Atlas : sauvegardes gérées, jeu de réplicas (transactions), coût mensuel. Docker : gratuit, pas de transaction multi-documents, sauvegarde à construire. **Hébergement actuel incertain** : le `docker-compose.yml` JCMB annonce Atlas en production (§ 5.5) | Docker sans réplica : écritures commande + réservation non atomiques côté JCMB ; aucune restauration testée (§ 17.3) ; hypothèse d'hébergement possiblement fausse | Confirmation de l'hébergement Mongo réel ; tarifs non vérifiés (§ 5.5) ; essai de restauration Mongo | Début du lot 7 (au plus tard avant toute mise en production des commandes) ; la confirmation de l'hébergement dès le lot 0 |
| **D10** | Qui peut accepter, refuser, préparer, convertir une commande en ligne. Proposé : `online-order:process` aux rôles ADMIN et GESTIONNAIRE, conversion en vente aussi au CAISSIER avec caisse ouverte | Permission trop large : réservations bloquées ou annulées à tort ; trop étroite : commandes non traitées et expirées | Modèle de permissions existant ; D4 | Début du lot 5 |
| **D11** | Durée de conservation du nom, téléphone, adresse de livraison des clients en ligne dans GestStock ; anonymisation ensuite | Conservation illimitée de données personnelles ; ou au contraire perte de la preuve de vente | Obligations légales locales (à confirmer par le responsable) ; D5 | Début du lot 5 (schéma de `online_order`) |

## 12. Contrat `integration/v1` — ébauche [Proposé, non approuvé]

**Contrat détaillé : [`integration-v1.openapi.yaml`](integration-v1.openapi.yaml)** (OpenAPI 3.1, même dossier) — schémas, erreurs, idempotence, pagination et reprise par curseur, commandes et réservations, révocation, notification signée. Hypothèses marquées « [Hypothèse] » ; origine du serveur laissée en variable (D8). Aucun code généré ; aucun endpoint existant modifié. Ajouts par rapport au tableau ci-dessous : `GET /prices` (état des prix par produit) ; la portée `reservations:write` est fusionnée dans `orders:write` (la réservation est créée avec la commande).

Base : `/api/integration/v1` (GestStock). Authentification : jeton de liaison (`aud` dédiée), portée vérifiée par route ; entreprise déduite de la liaison. Erreurs au format `ApiError` existant.

| Méthode et chemin | Portée | Idempotence | Rôle |
|---|---|---|---|
| `POST /oauth/token` | client JCMB | — | Échange de code (PKCE) ; `client_credentials` |
| `GET /link` | toute | — | Statut, dépôts associés, réglages |
| `POST /link/revoke` | toute | oui (déjà révoquée ⇒ `401 LINK_REVOKED`, traité comme succès) | Révocation définitive par la boutique (C2) |
| `GET /catalog/changes?after=&limit=` | `catalog:read` | lecture | Événements ordonnés par `seq` attribué à la lecture (C3) |
| `POST /catalog/changes/ack` | `catalog:read` | oui (`seq`) | Acquittement du curseur (D5) |
| `GET /catalog/snapshot?pageToken=` | `catalog:read` | lecture | Réconciliation paginée ; `asOfSeq` fixé à la première page ; `pageToken` opaque, lié à la liaison, 24 h (C3). *v6 et antérieures : `?cursor=` — remplacé par `pageToken`* |
| `GET /catalog/products/search?q=` | `catalog:match` | lecture | Rapprochement assisté |
| `GET /catalog/products/{id}/image` | `catalog:read` | lecture | Image (ETag `sha256`) |
| `POST /prices/proposals` | `price:propose` | `Idempotency-Key` | Proposition de prix, sérialisée par (liaison, produit) (C6) |
| `GET /availability?productIds=` | `stock:read` | lecture | Disponibilité indicative (dépôts associés) |
| `POST /online-orders` | `orders:write` | `Idempotency-Key` = commande JCMB | Transmission (instantané) |
| `POST /online-orders/{id}/cancel` | `orders:write` | oui | Annulation client |
| `GET /online-orders/{id}` | `orders:read` (C5) | lecture | État |
| `GET /online-orders/external/{externalOrderId}` | `orders:read` (C4, C5) | lecture | Commande retrouvée par l'identifiant JCMB ; 404 identique si inexistante ou d'une autre liaison |
| Notification GestStock → JCMB | HMAC | identifiant d'événement | « Changements disponibles » |

Événements (C7) : `CATEGORY`, `PRODUCT` (inclut le prix de référence), `PRODUCT_IMAGE` (`ProductImageState`), `CHANNEL_PRICE`, `AVAILABILITY`, `ONLINE_ORDER_STATUS` ; schéma propre à chaque type, discriminé par `type` ; type inconnu ignoré, curseur avancé.

Flux et instantané (conception détaillée P0–P8, § 20) :
- `after` = dernier `seq` consommé ; **`lastSeq` = dernier `seq` examiné**, événements filtrés pour la liaison compris, `after` si rien n'a été examiné ; invariants `after ≤ lastSeq ≤` dernier `seq` attribué ; une page vide avec `lastSeq > after` est normale ; le consommateur enregistre toujours `lastSeq` comme nouvel `after` (P1). *v7 : « `seq` du dernier événement de la page » — remplacé.*
- **`hasMore` = il existe un `seq > lastSeq` ou un événement validé sans `seq`**, évalué après l'attribution ; vrai ⇒ rappel immédiat ; faux ⇒ reprise ultérieure, pas une fin définitive (P2). *v7 : « événements déjà séquencés » — remplacé.*
- `limit` de `/catalog/changes` : 100 par défaut, 500 au plus ; au-delà, **400** (borne du schéma) ; lot d'attribution : 1 000 ; valeurs configurables, à confirmer par T-C3-8 (P5). `limit` de l'instantané : inchangé (200 par défaut, 500 au plus).
- `pageToken` : opaque pour le client, **signé** (HMAC, clé dédiée par environnement), non chiffré ; porte `kid` et un numéro de format ; rotation : clé précédente acceptée 24 h ; `kid` inconnu ⇒ 400 `INVALID_PAGE_TOKEN` (P4). Longueur maximale **512** ; le client ne suppose ni la longueur, ni le format, ni le contenu ; encodage interne décidé au lot 1 (v9-D2). *v8 : `maxLength` 200.*
- **`410 CURSOR_EXPIRED`** sur `/catalog/changes` (v9-D1) : `after` strictement inférieur au repère de purge (plus haut `seq` purgé, conservé durablement) ; `after` égal au repère accepté ; le consommateur abandonne ce curseur, relance un instantané complet, puis reprend avec `after=asOfSeq`. **Distinct** de `410 SNAPSHOT_EXPIRED` (jeton d'instantané expiré, sur `/catalog/snapshot`) : les deux se distinguent par le champ `code` d'`ApiError`. Durée de rétention et règle de purge : ouvertes (C8).
- Origine de `version` (P3) : `CATEGORY`, `PRODUCT` ⇒ `@Version` lu après flush ; `PRODUCT_IMAGE` ⇒ génération `product_image_generation` (P7) ; `AVAILABILITY` ⇒ `seq` de l'événement, événement mince recalculé au service de la page ; `CHANNEL_PRICE`, `ONLINE_ORDER_STATUS` ⇒ **à confirmer** (lots 3-4).

Points tranchés (2026-10-28) : liste des portées (C5), format des événements (C7), pagination (C3), révocation (C2), recherche externe (C4), concurrence des prix (C6). Points **encore ouverts** : codes d'erreur non couverts par une décision, limitation de débit et 429 (C1), durée des jetons (5 min), `aud`, fenêtre HMAC (5 min), route JCMB de notification et autres hypothèses (C8).

## 13. Hébergement et tâches planifiées (D9)

| Constat | Source | Conséquence |
|---|---|---|
| Aucune tâche `@Scheduled` dans GestStock | code | À introduire (notification, ménage des réservations, purge) |
| Backend GestStock possiblement en conteneur Vercel | `backend/vercel.json`, `Dockerfile.vercel` | Instances pouvant s'arrêter : tâches planifiées internes **non garanties** |
| Front GestStock sur Render | URL fournie | Sans effet sur le backend |
| Sauvegardes GestStock par GitHub Actions planifié | `backend/scripts/backup/README.md` | Un ordonnanceur externe est déjà utilisé |

Conception qui ne dépend pas d'une tâche planifiée pour la **correction** :
- expiration des réservations évaluée par horodatage (§ 5.4) ;
- synchronisation **tirée** par JCMB (curseur) : la notification n'est qu'un accélérateur ;
- réconciliation déclenchée côté JCMB (son conteneur VPS est permanent) ;
- purge, ménage et notifications : tâche interne si l'hébergement la garantit, sinon point d'entrée protégé appelé par un ordonnanceur externe (même principe que les sauvegardes). **Décision D9 requise.**

### 13.1 Hébergement réel : ce qui est prouvé et ce qui ne l'est pas

| Élément | Preuve | Statut |
|---|---|---|
| Backend préparé pour Vercel (runtime conteneur, bêta) | `backend/vercel.json`, `backend/Dockerfile.vercel` (Temurin 21, port `PORT`) | Prouvé dans le dépôt ; **déploiement effectif non prouvé** |
| Aucun déploiement automatisé du backend | `backend/.github/workflows` : `backup.yml`, `ci.yml` seulement | Prouvé |
| Base sur Neon | `backend/scripts/backup/README.md` | Documenté, non vérifié sur le compte |
| Version PostgreSQL de production | Non trouvée ; la procédure de sauvegarde vise PostgreSQL 18 | **Inconnue** |
| Front sur Render, `BACKEND_URL` vers le backend | URL fournie, `deploy/nginx.conf.template` | Origine du backend inconnue (U2) |

### 13.2 Correction sans tâche planifiée (principe retenu dans la conception)

| Mécanisme | Si la tâche est retardée ou interrompue |
|---|---|
| Réservation | Valide seulement si `status = 'RESERVED' AND expires_at > now()` (heure du serveur PostgreSQL) : une réservation échue **ne compte plus** dans la disponibilité, même si personne ne l'a marquée `EXPIRED`. Le passage à `EXPIRED` est fait paresseusement à la lecture/écriture suivante (`UPDATE … WHERE status = 'RESERVED' AND expires_at <= now()`) |
| Conversion ou annulation tardive | Transition gardée : une réservation échue ne peut plus être consommée ; la conversion revérifie le stock |
| Synchronisation | Tirée par JCMB depuis son curseur ; une notification perdue retarde seulement |
| Purge de l'outbox (D5) | Retardée = la table grossit ; jamais de perte (purge seulement après 90 jours **et** acquittement) |
| Notification | Accélérateur ; aucune donnée dans le signal |

### 13.3 Options pour les tâches d'entretien [Ouvert — D9]

| Option | Coût | Limites | Prérequis |
|---|---|---|---|
| A. Tâche interne `@Scheduled` + verrou en base (une seule instance exécute) | 0 € supplémentaire | Ne s'exécute que si une instance tourne ; sur conteneur Vercel, instances arrêtées au repos → **non garanti** | Hébergement permanent |
| B. GitHub Actions `schedule` appelant un point d'entrée interne protégé (secret dédié) | Inclus dans le quota Actions (dépôt privé : minutes facturées au-delà du quota — **tarif non vérifié**) | Exécution différée possible de plusieurs minutes, non garantie à l'heure ; réveil d'une instance froide | Nouveau secret ; point d'entrée à créer (lot 7) |
| C. Cron du VPS JCMB (déjà permanent) déclenchant les tirages et la réconciliation | 0 € supplémentaire | Ne couvre pas la purge côté GestStock ; dépend de la disponibilité du VPS | Accès VPS (autorisation séparée) |
| D. Tâche planifiée d'un hébergeur (ex. cron job Render) | Payant — **tarif non vérifié** | Nouveau service à administrer | Autorisation et abonnement |

Recommandation : **B + C** (aucun nouveau service, correction indépendante des tâches). A seulement si le backend est confirmé permanent. Aucun service modifié, aucun abonnement pris.

## 14. Lot 0 — état de sortie

| # | Critère | Preuve disponible | État |
|---|---|---|---|
| 1 | D1, D2, D3, D5, D8 documentées | § 0, 5.1, 5.4, 5.6, 11 ; D1-D3, D5 validées par écrit (2026-10-28) ; D8 : 7 URL candidates avec vérification sûre (§ 0) | **Partiel** : D8 non confirmée |
| 2 | Contrat `integration/v1` | `integration-v1.openapi.yaml` (§ 12) ; décisions C2 à C7 appliquées (§ 19) ; YAML **valide**, 36 `$ref` résolues, discriminateur cohérent | **Partiel** : C3 en attente de validation technique ; C1 et C8 ouvertes ; validation complète OpenAPI 3.1 non exécutée (E2 non autorisé) ; contrat dans son ensemble **non approuvé** |
| 2c | Séquencement du flux sûr sous concurrence (C3) | C3 **approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1** (P0 à P8, v9-D1, v9-D2, § 20-21) ; aucun mécanisme dans le code (§ 19.2) ; tests T-C3 / T-C7 **non écrits, non exécutés**. Portes (v9-D3) : entrée dans le lot 1 satisfaite sur le plan documentaire (**ne vaut pas autorisation de démarrer**) ; sortie du lot 1 non satisfaite ; lots consommateurs du flux (3, 4 ; 5 indirectement) bloqués jusqu'à la validation de C3 | **Non satisfait** tant que T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 n'ont pas réussi |
| 2b | Versionnement du plan et du contrat | `git add -f` des deux fichiers dans `gestion-stock` (branche `main`) ; v7 modifiée **après** l'indexation : l'index contient la v6, les modifications v7 ne sont pas indexées (`AM`) | **Partiel** : non commités ; réindexation de la v7 non autorisée à ce stade |
| 3 | Environnements isolés + données synthétiques | Spécification et scripts § 16 ; **non créés** | **Non satisfait** : création à autoriser |
| 4 | Stratégie de concurrence et de réservation | § 5.4, § 9 lot 6, § 10, § 13.2 ; précédent `CrossModuleConcurrencyIT.java` | **Partiel** : documentée, non approuvée |
| 5 | Sauvegarde / restauration testée en isolé | § 17 : restauration **GestStock exécutée en local**, cohérence vérifiée (outils et format). MongoDB : **bloqué** (Docker arrêté, outils Mongo absents). Chaîne officielle : non exécutée ; historique du workflow **non consultable** (GitHub CLI absent, § 18.4) | **Partiel** |
| 6 | Inventaire des noms de secrets | § 15 | **Satisfait** (noms seulement, sous réserve de revue) |
| 7 | Tâches planifiées et hébergement | § 13.1-13.3 : preuves, options, coûts (non vérifiés) | **Partiel** : D9 ouverte |
| 8 | Risques et critères du lot 1 | § 9 (lot 1) | **Satisfait** (documenté, à approuver) |

Pour lever les critères restants : approbation du contrat (2) ; autorisation de créer les environnements locaux (3) et de démarrer Docker / installer les outils Mongo (5) ; vérification par l'utilisateur de `BACKEND_URL` et des `GET /api/health` (D8) ; choix D9 (7).

## 15. Inventaire des secrets (noms uniquement)

| Application | Existants (relevés dans la configuration, valeurs non lues) |
|---|---|
| GestStock | `GESTSTOCK_JWT_SECRET`, `GESTSTOCK_DB_PASSWORD`, `GESTSTOCK_PLATFORM_DB_PASSWORD`, `GESTSTOCK_PROVISIONER_DB_PASSWORD`, `GESTSTOCK_TENANT_CREDENTIALS_KEY`, `GESTSTOCK_ADMIN_PASSWORD`, `GESTSTOCK_PLATFORM_ADMIN_PASSWORD` ; sauvegarde : `GESTSTOCK_BACKUP_ADMIN_URL`, `GESTSTOCK_BACKUP_PROVISIONER_URL`, `GESTSTOCK_BACKUP_PASSPHRASE` |
| JeCréeMaBoutique | `JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`, `CACHE_INVALIDATION_SECRET`, `SWAGGER_ACCESS_KEY` |

Nouveaux **[Proposé, noms à définir]** : secret du client JCMB chez GestStock (stocké haché côté GestStock) ; clé de chiffrement des secrets de liaison côté JCMB ; secret HMAC des notifications par liaison (chiffré par `platform/CredentialCipher` côté GestStock) ; un jeu distinct par environnement.

**À créer au lot 1 [Décision P4, nom à définir]** : clé HMAC de signature des `pageToken` — aléatoire, 32 octets au moins, une par environnement, distincte des secrets JWT, jamais journalisée ; identifiée par un `kid` ; rotation avec acceptation de la clé précédente pendant 24 h. **Aucun secret créé à ce stade.** Aucun secret partagé avec l'authentification existante (`JWT_SECRET`, `GESTSTOCK_JWT_SECRET`).

## 16. Environnements d'essai (spécification ; **rien n'est créé**)

| Rubrique | Contenu |
|---|---|
| Ressources | GestStock : PostgreSQL 18 local, 3 bases préfixées `lot0_` (`lot0_geststock_platform`, `lot0_geststock_acme`, `lot0_geststock_beta`) — ou `backend/deploy/docker-compose.local.yml`. JCMB : backend Next.js local + MongoDB 7 en conteneur `lot0-mongo` (volume `lot0-mongo-data`) ou mongodb-memory-server |
| Coût | 0 € (poste local). Option cloud d'essai (Neon branche, Atlas M0) : non retenue, autorisation séparée |
| Emplacement | Poste du développeur, `localhost` uniquement ; ports 5432 (existant), 27018 (Mongo d'essai), 8080 et 3000 |
| Comptes et permissions | Rôle PostgreSQL local dédié `lot0_app` (pas de superutilisateur pour l'application) ; Mongo sans exposition réseau ; secrets d'essai générés localement (`openssl rand -hex 32`), jamais copiés de la production |
| Isolation | Aucune URI de production ; noms de base distincts et préfixés ; deux entreprises = deux bases distinctes ; profil Spring dédié *(à créer au lot concerné)* ; aucun accès aux dépôts de secrets |
| Données synthétiques | 2 entreprises (« Acme Essai », « Beta Essai »), 3 dépôts, ≈ 50 produits (`ESSAI-001`…), 1 boutique JCMB « boutique-essai », clients fictifs (`Client Essai n`, téléphone `+000…`) ; aucune donnée réelle, aucun secret |
| Suppression | Bases : `DROP DATABASE lot0_…` (une par une, après vérification du nom) ; Mongo : `docker rm -f lot0-mongo` puis `docker volume rm lot0-mongo-data` — **chaque suppression soumise à autorisation** |
| Production utilisée | **Non** |

Script préparé, **non exécuté** :

```sh
# Prérequis : PGHOST=localhost vérifié ; aucune variable d'environnement de production chargée
for db in lot0_geststock_platform lot0_geststock_acme lot0_geststock_beta; do
  exists=$(psql -h localhost -U postgres -tAc "select count(*) from pg_database where datname='$db'")
  [ "$exists" = "0" ] || { echo "ARRÊT : $db existe déjà"; exit 1; }
  createdb -h localhost -U postgres "$db"
done
# Mongo d'essai (nécessite Docker démarré ; image mongo:7 téléchargée)
docker run -d --name lot0-mongo -p 127.0.0.1:27018:27017 -v lot0-mongo-data:/data/db mongo:7 --replSet rs0
docker exec lot0-mongo mongosh --quiet --eval 'rs.initiate()'
```

## 17. Sauvegarde et restauration — essais du lot 0

### 17.1 Procédures existantes inspectées

- GestStock : `backend/scripts/backup/backup-databases.sh` (`pg_dump` format custom de la base historique, du schéma `platform` et de chaque base d'entreprise lue dans `platform.company_database` ; archive GPG AES-256 + manifeste SHA-256), `verify-backup.sh` (restauration dans un PostgreSQL 18 jetable), workflow `backup.yml` quotidien 02:30 UTC, artefact conservé 30 jours.
- JCMB : **aucune procédure** de sauvegarde trouvée dans le dépôt.

### 17.2 GestStock — essai exécuté (local, isolé)

| Étape | Détail | Résultat |
|---|---|---|
| Source | Base locale `geststock_test` (données d'essai, Flyway 042, 40 tables). `geststock_prod_local` **écartée** (nom évoquant une copie de production) | — |
| Destination | `geststock_restore_lot0`, absence vérifiée avant création (0 base de ce nom) | Nouvelle base, aucune remplacée |
| Versions | `pg_dump` / `pg_restore` / serveur 18.4 | Compatibles |
| Sauvegarde | `pg_dump --format=custom --no-owner --no-acl` | OK — 1 638 478 octets, SHA-256 `7a40a9ac412043c9…` |
| Restauration | `pg_restore --no-owner --no-acl --exit-on-error` | OK, sans erreur |
| Cohérence | Comptages par table (39 tables de base) et métadonnées | **Identiques** : 14 298 lignes de part et d'autre ; Flyway 42/042 ; 696 contraintes, 67 déclencheurs, 29 fonctions, 168 index |

Limites : base unique de type historique (pas de schéma `platform`, pas de base d'entreprise dédiée) ; l'essai valide les outils et le format, **pas** la chaîne officielle chiffrée multi-bases ni la version PostgreSQL de Neon. Aucune donnée personnelle ni secret dans les preuves (comptages seulement). La base `geststock_restore_lot0` est **conservée** ; sa suppression demande une autorisation.

### 17.3 MongoDB — bloqué

Docker Desktop arrêté (moteur Linux indisponible) et `mongodump` / `mongorestore` absents du poste. Aucune démarche entreprise (démarrer Docker, télécharger `mongo:7` ou installer les outils = action à autoriser). Procédure préparée, **non exécutée** :

```sh
docker exec lot0-mongo mongodump --db boutique_essai --archive=/tmp/essai.archive
docker exec lot0-mongo mongorestore --archive=/tmp/essai.archive --nsFrom='boutique_essai.*' --nsTo='boutique_restore_lot0.*'
# Comparer countDocuments() par collection entre boutique_essai et boutique_restore_lot0
```

Remplacé par la procédure détaillée § 18.3 (noms `lot0_boutique_source` / `lot0_boutique_restore`, empreintes et index).

## 18. Suite du lot 0 — plan d'exécution A à E et autorisations

Statut : **plan**. Exécuté à ce jour : contrôle de syntaxe YAML (E1) et tentative de lecture de l'historique du workflow (D2, bloquée). Aucune requête réseau, aucune base ni rôle créé, Docker non démarré, rien téléchargé, rien supprimé (`geststock_restore_lot0` conservée).

### 18.1 A — Vérification des URL (lecture seule, **non exécutée**)

Piège : le nginx du front GestStock répond `index.html` (200) à tout chemin inconnu et possède son propre `/healthz` ; **un code 200 ne prouve rien**. Seul le corps attendu compte : GestStock `/api/health` → JSON `status` `UP`/`DOWN` + `database` (`HealthController`) ; JCMB `/api/health` → JSON `status` `ok`/`degraded` + contrôles.

| # | URL | Preuve et origine | Risque de confusion avec un front | Traitement |
|---|---|---|---|---|
| U1 | `https://geststock-frontend.onrender.com/api/health` | URL fournie + `apiUrl: '/api'` + `proxy_pass ${BACKEND_URL}` | **Élevé** (front qui relaie) | GET ; prouve le relais, pas l'adresse du backend |
| U2 | Origine du backend : inconnue | `vercel.json`, `Dockerfile.vercel` (configuration seulement) | — | Lire `BACKEND_URL` dans Render (A1), puis GET |
| U3 | `https://www.jecreemaboutique.com/api/health` | Domaine fourni + `apiUrl: '/api'` | **Élevé** (site Angular sur le même domaine) | GET ; JSON JCMB exigé |
| U4 | `api.jecreemaboutique.com` | Ligne commentée uniquement | — | **Écartée** |
| U5 | `https://easyorder-mzaka.duckdns.org/api/health` | Workflow `deploy.yml` | Faible | GET |
| U6, U7 | `easyorder-backend-wnku.onrender.com`, `easy-order.duckdns.org` | Configuration seulement | — | **Écartées** sauf décision contraire |

Commande unique autorisable (GET, sans en-tête, cookie ni jeton, sans redirection, HTTPS seul) :
`curl -sS -m 10 --max-redirs 0 --proto =https -o <dossier temporaire>/u1.json -w '%{http_code} %{content_type}\n' <URL>`.
Risques : réveil d'une instance en veille ; la réponse santé peut indiquer l'état de la base. Aucune méthode POST, PUT, PATCH ou DELETE.

### 18.2 B — Environnements locaux `lot0_` (**non exécuté**)

| Ressource | Nom |
|---|---|
| Base historique + schéma plateforme (URL plateforme vide ⇒ schéma `platform` de la base historique) | `lot0_geststock` |
| Entreprises (créées par l'application, `POST /api/platform/companies` en local) | `lot0_geststock_company_0001`, `_0002` + rôles `…_app` (`ProvisioningService:222-223`, préfixe `GESTSTOCK_TENANT_DATABASE_PREFIX=lot0_geststock_company_`) |
| Rôle d'approvisionnement | `lot0_provisioner` (CREATEDB CREATEROLE, non superutilisateur) |
| JCMB | conteneur `lot0-mongo`, image `mongo:7-jammy` (identique au compose JCMB), `127.0.0.1:27018`, jeu de réplicas `rs0`, volume `lot0-mongo-data`, base `lot0_boutique_source` |

Garde-fous du script (arrêt avant toute création) : aucune variable `GESTSTOCK_*`, `MONGODB_URI`, `DATABASE_URL`, `PGHOST`, `PGDATABASE` présente ; `PGHOST=127.0.0.1` ; `select inet_server_addr()` = `127.0.0.1` ; zéro base et zéro rôle `lot0_%` existants ; mot de passe local saisi dans la session, jamais écrit ; secrets d'essai générés par `openssl rand`.

Points signalés : Flyway applique les migrations **existantes** aux bases `lot0_` neuves (aucune migration écrite) ; le serveur Next.js JCMB **n'est pas démarré** (il charge automatiquement les fichiers `.env*` du projet, qui pourraient activer Cloudinary ou Resend réels) — la boutique d'essai est amorcée par `mongosh` dans le conteneur, index recopiés des définitions `models/*.ts`. Données : 2 entreprises (« Acme Essai », « Beta Essai »), 3 dépôts, 50 produits `ESSAI-001…050`, 1 boutique, 5 catégories, 10 commandes fictives.

Suppression : script séparé limité aux noms `lot0_` (`DROP DATABASE`, `DROP ROLE`, `docker rm`, `docker volume rm`), **jamais exécuté sans autorisation**.

### 18.3 C — Restauration MongoDB (**non exécutée**, après B2)

1. Versions : `mongod --version`, `mongodump --version` dans le conteneur (outils inclus dans l'image officielle). Version de production : inconnue (Atlas ou VPS, § 5.5).
2. Empreinte de référence par collection : `countDocuments`, `getIndexes()` (clé, unique, partiel, TTL), SHA-256 des documents triés par `_id`, `validate`.
3. Destination `lot0_boutique_restore` absente de `listDatabases`, sinon arrêt.
4. `mongodump --db=lot0_boutique_source --archive=/data/backup/essai.archive --gzip`.
5. `mongorestore --archive=… --gzip --nsFrom='lot0_boutique_source.*' --nsTo='lot0_boutique_restore.*' --stopOnError` (**sans `--drop`**).
6. Empreinte du point 2 sur la base restaurée ; réussite = comptages, index et empreintes identiques.

À documenter : la validation Mongoose n'est pas stockée dans MongoDB (seuls les index le sont) ; `--oplog` exige un jeu de réplicas ; si la production est sur Atlas, la restauration de production relève d'Atlas.

### 18.4 D — Chaîne officielle de sauvegarde GestStock (analyse)

| Rubrique | Constat (`backend/.github/workflows/backup.yml`, `scripts/backup/*`) |
|---|---|
| Ressources lues | Bases Neon `geststock` (historique), `geststock_platform`, chaque entreprise `DEDICATED` de `platform.company_database` |
| Comptes | `GESTSTOCK_BACKUP_ADMIN_URL` = rôle propriétaire `neondb_owner` (privilège excessif pour une sauvegarde) ; `GESTSTOCK_BACKUP_PROVISIONER_URL` = `geststock_provisioner` (CREATEDB/CREATEROLE). Un rôle en lecture seule suffirait |
| Chiffrement | GPG symétrique AES-256 (`GESTSTOCK_BACKUP_PASSPHRASE`, à conserver aussi hors de GitHub) ; manifeste et empreinte SHA-256 |
| Destination / rétention | Artefact GitHub Actions privé, **30 jours**, lisible par tout lecteur du dépôt (chiffré) |
| Permissions | `contents: read` ; `concurrency: backup` ; délai maximal 30 min ; déclenchement quotidien 02:30 UTC et manuel |
| Impact production | Lecture seule ; verrous `ACCESS SHARE` (bloquent un DDL / une migration pendant le dump) ; réveil et consommation du calcul Neon ; aucune écriture |
| Test en CI | Service jetable `postgres:18` ; bases `verify_<nom>_<pid>` créées puis supprimées par le script lui-même |
| Non prouvé | Qu'une exécution ait réussi ; version PostgreSQL de Neon (≤ 18 requise) |
| Historique (D2) | **Bloqué** : GitHub CLI (`gh`) non installé ; aucune autre voie sans téléchargement ou requête réseau |

Recommandation : valider la chaîne complète **sans la production** en exécutant les deux scripts officiels en local contre l'environnement `lot0_` (`GESTSTOCK_BACKUP_LEGACY_DB=lot0_geststock`, `GESTSTOCK_BACKUP_PLATFORM_DB` adaptée, `GESTSTOCK_BACKUP_SSLMODE=disable`, phrase secrète générée, sortie dans le dossier temporaire ; vérification via `GESTSTOCK_VERIFY_URL` local). Réserve : `verify-backup.sh` exécute `drop database` sur les seules bases `verify_…_<pid>` qu'il a créées — commande de suppression signalée. Plateforme hébergée dans la base historique : vérifier que le script gère ce cas, sinon base `lot0_geststock_platform` distincte.

### 18.5 E — Contrat OpenAPI

**Historique des contrôles de syntaxe** — `js-yaml` 4.3.2 déjà présent (`gestion-boutique/node_modules`), rien installé :

| Contrôle | Résultat |
|---|---|
| E1 (avant correction) | YAML **invalide** : « missed comma between flow collection entries » ligne 707 ; valeurs `description` non citées contenant une virgule dans `{ … }`, lignes 453, 570, 607, 707 |
| **Après E3 (état actuel)** | **YAML valide** ; OpenAPI 3.1.0 déclaré ; 13 chemins, 13 opérations, 1 webhook, 18 schémas ; **28 `$ref` distinctes, toutes résolues** ; toutes les opérations à jeton de liaison déclarent 401 et 403 ; `INSUFFICIENT_STOCK` absent |
| **Validation complète OpenAPI 3.1** | **Non exécutée** : nécessiterait `@redocly/cli` (téléchargement, **E2 non autorisé**). La validité YAML et la résolution des `$ref` ne prouvent pas la conformité à la spécification OpenAPI 3.1 |

**Corrections E3 appliquées** (fichier : 820 → 839 lignes) — uniquement syntaxe et comportements déjà validés dans ce rapport :

| Correction | Fondement |
|---|---|
| Quatre valeurs `description` mises entre guillemets (sens inchangé) | Syntaxe |
| `ChangeEvent.data` : `oneOf` remplacé par `anyOf` (note explicative ajoutée) | Correction de schéma : `oneOf` rejetait des événements valides ; comportement de l'API inchangé |
| `INSUFFICIENT_STOCK` retiré des erreurs métier ; un stock insuffisant enregistre la commande à l'état `REJECTED_STOCK`, entièrement refusée, sans réservation conservée | § 5.2 règle 5, § 5.4 (validés) |
| Réponses 401 et 403 ajoutées aux 9 opérations à jeton de liaison qui ne les déclaraient pas (`changes/ack` : 403 seul) | Révocation ⇒ 401 (test 3) ; portée vérifiée par route (déjà déclarée par `x-required-scopes`) |
| Une seule proposition `PROPOSED` à la fois par (liaison, produit) | § 5.1 (D2 validée) |

**Points restés ouverts en v6 — comportement inchangé dans le contrat, aucune décision prise** (historique ; **état v7 : § 19** — C2 à C7 approuvées et appliquées, C1 et C8 toujours ouvertes) :

| Point | Proposition (non appliquée) | Conséquences |
|---|---|---|
| 429 absent sur 9 opérations | Ajouter si une limite de débit par liaison est adoptée | Limite non chiffrée (§ 8) ; l'ajouter engagerait le comportement |
| Déconnexion à l'initiative de la boutique | `POST /link/revoke` | La boutique pourrait couper seule ; sinon seule la suspension côté GestStock existe |
| `asOfSeq` / `pageToken` / `cursor` | `asOfSeq` figé à la première page ; un seul nom de paramètre ; aligner § 12 | Sans cela, risque d'événements manqués ou rejoués pendant la pagination |
| Recherche par `externalOrderId` | `GET /online-orders?externalOrderId=` | Reprise après réponse perdue sans rejouer la clé d'idempotence |
| Lecture des commandes | Portée `orders:read` distincte | Moindre privilège ; modifie la liste des portées (lot 2) |
| Concurrence des propositions de prix | Dernière selon l'heure PostgreSQL + contrainte d'unicité | Seule la règle « une seule `PROPOSED` » est validée |
| Correspondance `type` → schéma | `CATEGORY`→Category, `PRODUCT`→Product, prix→ChannelPrice, `AVAILABILITY`→Availability, `ONLINE_ORDER_STATUS`→OnlineOrderStatus | `PRODUCT_IMAGE` sans schéma défini |
| Hypothèses | Durée du jeton (5 min), `aud`, fenêtre HMAC (5 min), devise, remise en ligne, conservation des clés d'idempotence 90 jours, limites de débit, origine du serveur (D8) | Maintenues marquées « [Hypothèse] » |

Vérifié : `application/problem+json` conforme à l'`ApiError` existant (`ApiErrorController:39`).

**Versionnement (E5, option 1)** : `/docs` est ignoré par `gestion-stock/.gitignore:8` (deux fichiers y sont déjà suivis par ajout forcé : `docs/production.md`, `docs/migration-api.md`). Les deux documents ont été ajoutés à l'index par `git add -f`, sans modification de `.gitignore`, sur `main` ; **aucun commit**. Tout nouveau fichier de ce dossier demandera aussi `git add -f`.

### 18.6 Autorisations restantes (aucune n'est accordée)

| Code | Action | Effet externe |
|---|---|---|
| A1 | Lire le tableau de bord Render (`BACKEND_URL`) | Lecture d'un compte externe |
| A2 | GET sur U1, U3, U5 | Requêtes réseau en lecture |
| B1 | Créer `lot0_provisioner` et les bases `lot0_` en local, démarrer le backend (Flyway sur `lot0_`), amorcer les données | Local |
| B2 | Démarrer Docker, télécharger `mongo:7-jammy`, créer `lot0-mongo` | Téléchargement, local |
| C | Test de restauration MongoDB (après B2) | Local |
| D1 | Scripts officiels de sauvegarde et de vérification en local sur `lot0_` | Local ; supprime ses propres bases `verify_…` |
| D2-bis | Installer GitHub CLI **ou** consulter l'onglet Actions dans le navigateur (par vous) | Installation ou lecture externe |
| E2 | Télécharger `@redocly/cli` pour la validation OpenAPI | Téléchargement |
| E3 | ~~Corriger le contrat OpenAPI~~ — **accordée et exécutée** (§ 18.5) | Document |
| E5 | ~~Indexer le plan et le contrat~~ — **accordée (option 1) et exécutée** ; commit **non autorisé** | Index Git local |
| E6 | Commit des deux fichiers indexés (sans push) | Historique Git local |
| E7 | Trancher les points ouverts du contrat (§ 18.5) — **C2 à C7 approuvées et appliquées** (§ 19) ; C1 et C8 restent à trancher | Document |
| E8 | Réindexer les deux documents en v7 (`git add -f`) | Index Git local |
| M1 | Confirmer l'hébergement MongoDB de production (Atlas ou VPS) sans copier `MONGODB_URI` | Lecture externe |

## 19. Relevé de décisions du contrat `integration/v1` — 2026-10-28

### 19.1 Décisions

| # | Objet | Statut | Effet dans le contrat | Effet dans le plan |
|---|---|---|---|---|
| **C2** | Révocation par la boutique | **Approuvée, appliquée** | `POST /link/revoke` | Lot 2 (route, tests) |
| **C3** | Séquencement et pagination | **Décision approuvée — validation technique en attente** *(v9 : « approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1 », § 21)* | Description de `/catalog/changes`, `/catalog/snapshot`, `pageToken`, 400 `INVALID_PAGE_TOKEN`, 410 `SNAPSHOT_EXPIRED`, `ChangePage`, `SnapshotPage` | Lot 1 (migration, tests T-C3) ; § 12 aligné sur `pageToken` ; **lot 1 bloqué** |
| **C4** | Recherche par `externalOrderId` | **Approuvée, appliquée** | `GET /online-orders/external/{externalOrderId}` | Lot 5 (unicité (liaison, `externalOrderId`), tests) |
| **C5** | Portée `orders:read` | **Approuvée, appliquée** | `Scope` ; `x-required-scopes` des deux lectures ; implication dans `linkToken` | Lot 2 (portées ; `reservations:write` retirée) |
| **C6** | Concurrence des propositions de prix | **Approuvée, appliquée** | Description de `/prices/proposals` ; sens de `PRICE_VERSION_MISMATCH` | § 5.1 ; lot 3 (tests) |
| **C7** | Schémas des événements | **Approuvée, appliquée** — un point bloquant pour le lot 1 (§ 19.3) | `ChangeEventBase`, `ChangeEvent` (`oneOf` + discriminateur), 6 variantes, `ProductImageState` ; `REFERENCE_PRICE` supprimé | Lots 1 et 3 |
| C1 | Limitation de débit, 429 | **Ouverte** | Inchangé : 429 sur 3 opérations, marqué « [Hypothèse] » | Valeurs, stockage des compteurs, calendrier : non décidés |
| C8 | Hypothèses restantes | **Ouverte** | Inchangé : durée du jeton, `aud`, fenêtre HMAC et déduplication, conservation des clés d'idempotence, limites de lignes et de quantités, `discountPercent`, `perWarehouse`, devise, origine serveur, webhook, données client | Non décidés ; dépendent aussi de D8, D11 |

### 19.2 C3 — séparation des constats

| Rubrique | Contenu |
|---|---|
| **Décision approuvée** | `seq` attribué à la lecture du flux, sous verrou à lecteur unique, aux seuls événements dont la transaction métier est validée ; `after` = dernier `seq` consommé ; `asOfSeq` fixé à la première page ; `pageToken` opaque, lié à la liaison, 24 h ; 400 si invalide ou d'une autre liaison ; 410 `SNAPSHOT_EXPIRED` si expiré |
| **Mécanisme observé dans le code** (lecture seule, 2026-10-28) | **Aucun.** Pas de module d'intégration, pas de table d'outbox, pas de `seq`, pas de curseur ni d'instantané (recherche `outbox`, `integration_`, `pg_advisory`, `pg_current_xact_id`, `pg_snapshot`, `asOfSeq`, `pageToken`, `cursor` dans `backend/src` : aucun résultat pertinent). Dernière migration : `V046__product_image.sql`. Verrous existants : `SELECT … FOR UPDATE` / `PESSIMISTIC_WRITE` sur des objets métier (caisse, client, produit, inventaire…), sans rapport avec un flux. Le plan v6 prévoyait un `seq bigserial` attribué à l'écriture : c'est précisément la conception exposée au risque (T2 obtient 9, T1 obtient 10, T1 valide, le consommateur passe à 10, T2 valide : 9 est sauté). |
| **Validation technique** | **En attente.** Rien à démontrer à partir du code existant ; la sûreté devra être prouvée par l'implémentation du lot 1 et les tests ci-dessous. C3 ne doit pas être déclarée « validée » avant. |
| **Infrastructure de test disponible** | Tests d'intégration sur PostgreSQL réel avec barrières de démarrage (`CrossModuleConcurrencyIT`, `SaleTransactionIT`, `StockServiceIT`… : `CountDownLatch` / `CyclicBarrier` / `ExecutorService`) ; aucun test ne couvre l'ordre de validation de transactions concurrentes ni un flux d'événements |
| **Tests restants (critères du lot 1 et du lot 3)** | **T-C3-1** deux connexions PostgreSQL validant dans l'ordre inverse de leur démarrage : le consommateur reçoit les deux événements, dans un ordre `seq` cohérent, aucun sauté ; **T-C3-2** reprise après un curseur avancé : aucun événement perdu ; un événement non validé n'est jamais servi ; deux lecteurs concurrents n'attribuent pas de `seq` en conflit ; interruption pendant l'attribution : aucun événement perdu ni curseur avancé à tort ; **T-C3-3** `asOfSeq` identique sur toutes les pages d'un instantané ; **T-C3-4** instantané complet + rejeu depuis `asOfSeq` = état source, y compris avec modifications pendant la pagination ; **T-C3-5** `pageToken` d'une autre liaison ⇒ 400 ; **T-C3-6** `pageToken` de plus de 24 h ⇒ 410 `SNAPSHOT_EXPIRED` |
| **Conséquence** | *(v7 — formulation remplacée en v9 par les portes de v9-D3, § 21 : elle était circulaire, les tests ne pouvant exister qu'au lot 1.)* **Le lot 1 reste bloqué** tant que la conception détaillée du mécanisme (verrou, transaction d'attribution, reprise) n'est pas approuvée. Les tests T-C3 sont inscrits comme critères de sortie du lot 1 (§ 9) ; C3 ne sera « validée » qu'après leur passage. |

### 19.3 Critères d'acceptation des autres décisions et point bloquant C7

| # | Critères vérifiables (à exécuter dans le lot indiqué) |
|---|---|
| C2 (lot 2) | Après révocation, tout appel (y compris `client_credentials`) ⇒ 401 `LINK_REVOKED` ; second appel de révocation ⇒ 401 `LINK_REVOKED`, liaison toujours `REVOKED` ; `revokedAt` et entrée d'audit présents ; réservations et commandes engagées inchangées ; autres liaisons de la même entreprise non affectées |
| C4 (lot 5) | Réponse identique à `GET /online-orders/{id}` ; commande d'une autre liaison ⇒ 404 ; commande inconnue ⇒ 404 (même corps) ; doublon (liaison, `externalOrderId`) refusé par la base |
| C5 (lot 2) | Jeton `orders:read` seul : lectures 200, `POST /online-orders` et annulation 403 `INSUFFICIENT_SCOPE` ; jeton `orders:write` : lectures 200 |
| C6 (lot 3) | Deux propositions concurrentes ⇒ exactement une `PROPOSED`, l'autre `SUPERSEDED` ; approbation concurrente d'une proposition remplacée ⇒ conflit, aucun prix approuvé à tort ; `basedOnReferenceVersion` obsolète ⇒ 422 `PRICE_VERSION_MISMATCH`, aucune proposition créée |
| C7 (lots 1 et 3) | Chaque exemple d'événement valide exactement une variante ; `UPSERT` sans `data` invalide ; type inconnu ignoré, curseur avancé ; changement du prix de référence ⇒ événement `PRODUCT` ; changement d'image ⇒ `PRODUCT_IMAGE` appliqué par la boutique |
| **C7 — point bloquant** *(v8 : **résolu sur le plan documentaire** par P7, § 20.3 ; implémentation et tests T-C7 au lot 1)* | `ProductImageState.version` doit croître strictement pour un même produit. Le modèle actuel ne le garantit pas : `product_image.version` (`@Version` de `BaseEntity`) est porté par la ligne, et `ProductImageService.delete` supprime la ligne ; une nouvelle image repart de 0, et la boutique ignorerait l'événement. **Source de `version` à définir et à approuver au lot 1** ; aucune règle n'est fixée ici |

### 19.4 Ce qui n'a pas été fait
Aucun code applicatif, aucune migration, aucun test, aucune configuration modifiés ; aucune contrainte ni aucun index créé ; aucun commit, push ou déploiement ; lot 1 non démarré ; validation complète OpenAPI 3.1 non exécutée (E2 non autorisé).

## 20. Relevé de décisions — conception détaillée C3 et C7 (P0 à P8) — 2026-10-28

Source : étude technique C3/C7 en lecture seule (même date). Légende : **[Approuvé]** décision écrite ; **[Observé]** constat dans le code ; **[Hypothèse]** non vérifié ; **[En attente]** validation technique à apporter au lot 1.

### 20.1 Décisions

| # | Objet | Statut |
|---|---|---|
| **P0** | Conception D = conception détaillée de C3 (§ 20.2) | **[Approuvé]** ; C3 reste « décision approuvée — validation technique en attente » ; lot 1 bloqué *(v9 : statut et portes reformulés par v9-D3, § 21)* |
| **P1** | `lastSeq` = dernier `seq` examiné (changement de contrat) | **[Approuvé]**, appliqué (OpenAPI, § 12) |
| **P2** | `hasMore` = `EXISTS(seq > lastSeq) OR EXISTS(seq IS NULL)` après attribution (changement de contrat) | **[Approuvé]**, appliqué ; remplace la règle « limite de 1 000 atteinte » de l'étude, inopérante pour un lecteur passé par `SKIP LOCKED` |
| **P3** | Origine de `version` par famille (§ 20.3) | **[Approuvé]** pour le principe ; `CHANNEL_PRICE` et `ONLINE_ORDER_STATUS` **à confirmer** (lots 3-4) |
| **P4** | Clé HMAC dédiée pour `pageToken` (`kid`, format, rotation 24 h, signé non chiffré) | **[Approuvé]** ; secret à créer au lot 1 (§ 15) |
| **P5** | Lot d'attribution 1 000 ; `limit` 100 par défaut, 500 au plus | **[Approuvé]**, valeurs configurables, à confirmer par T-C3-8 |
| **P6** | Image identique ou suppression à vide : ni incrément, ni événement | **[Approuvé]** |
| **P7** | Table `product_image_generation` | **[Approuvé]** ; lève le point bloquant C7 sur le plan documentaire |
| **P8** | Présence de `-pooler` dans l'URL de connexion de l'application | **Vérification à faire** en lecture seule au début du lot 1 [Hypothèse : inconnu à ce jour] |

### 20.2 Conception D (P0)

**Constats [Observé]** : aucun outbox, `seq`, curseur ni instantané ; isolation PostgreSQL par défaut (READ COMMITTED, aucune configuration contraire) ; verrous métier `SELECT … FOR UPDATE` pris dans l'ordre des identifiants (`StockService`, `ProductService`) ; SQL natif déjà utilisé avec JPA ; tests d'intégration sur PostgreSQL 17 (Testcontainers) avec barrières.

**Structures (par base d'entreprise, à créer au lot 1)** : `integration_outbox` (`write_id` identity, clé primaire, jamais exposé ; `seq` NULL UNIQUE ; index partiel `seq IS NULL` ; type, `object_id`, `version`, opération, charge minimale, `created_at`) ; `integration_feed_state` (une ligne : `id = 1`, `last_seq`). Curseur consommateur : tenu par JCMB ; acquittement par liaison (D5) pour la purge seulement.

**Déroulement**

```
Transaction métier                                      [aucun verrou de flux]
  1. modifications métier (verrous existants inchangés)
  2. flush JPA, lecture de la version  ─┐ point d'entrée unique (R1)
  3. INSERT integration_outbox (seq NULL) ┘
  4. COMMIT

Lecture du flux / première page d'instantané — séquenceur, transaction dédiée et courte
  a. SELECT last_seq FROM integration_feed_state WHERE id = 1 FOR UPDATE SKIP LOCKED
       ligne obtenue → b, c, d ; aucune ligne (autre attribution en cours) → e
  b. événements validés sans seq, par write_id croissant, 1 000 au plus
  c. seq = last_seq + rang ; last_seq += nombre attribué
  d. COMMIT (attribution et last_seq visibles ensemble ou pas du tout)
  e. lecture seq > after, filtrage par liaison, calcul de lastSeq (P1) et hasMore (P2)
```

**Pourquoi c'est sûr** : en READ COMMITTED, l'instruction b ne voit que des lignes validées, donc un événement non validé ne reçoit jamais de `seq` ; le compteur est monotone sous verrou, donc un événement validé plus tard reçoit un `seq` supérieur à tout `seq` déjà attribué, et les `seq` sont contigus. **Règles d'implémentation** : **R1** — l'événement est écrit après la modification et le verrouillage de la ligne métier (flush explicite), si bien que, pour deux transactions en conflit sur un même objet, le second événement reçoit un `write_id` et un `seq` supérieurs ; **R2** — toute famille porte une `version` strictement croissante par objet, de sorte que la règle du consommateur (ignorer `version` ≤ appliquée par (`type`, `objectId`)) donne l'état final juste même si deux événements indépendants sont inversés.

**Options écartées** : `bigserial` attribué à l'écriture (événement sauté en cas de validation dans l'ordre inverse ; trous indiscernables d'une transaction en cours) ; verrou pris à l'écriture (sérialise toutes les transactions productrices d'événements jusqu'à leur validation : ventes, stocks, inventaires) ; filtre par horizon `pg_snapshot_xmin` (insuffisant avec un `seq` attribué à l'écriture : contre-exemple dans l'étude).

**Courses critiques et reprise**

| Situation | Résultat attendu |
|---|---|
| T2 démarre avant T1 mais valide après | T1 reçoit `n` à la lecture, T2 reçoit `n+1` à la lecture suivante ; aucun événement sauté |
| Transaction métier très longue | Ses événements restent sans `seq` et ne bloquent rien ; `seq` élevé après validation |
| Annulation métier | L'événement n'a jamais existé : ni trou, ni `seq` consommé |
| Deux lecteurs concurrents | L'un attribue, l'autre (`SKIP LOCKED`) sert les `seq` déjà attribués ; attribution visible d'un bloc à la validation |
| Panne ou délai dépassé pendant a–d | Annulation PostgreSQL : rien d'attribué, `last_seq` inchangé ; l'appel suivant recommence |
| Panne après d, avant la réponse ; réponse HTTP perdue | Même `after` ⇒ mêmes événements ; l'attribution ne fait jamais avancer le curseur du consommateur |
| Panne JCMB après application, avant enregistrement de `after` | Rejeu idempotent par la règle de version |
| Modification pendant la pagination d'un instantané | `asOfSeq` = `last_seq` validé **après** une attribution et **avant** toute lecture de données ; tout événement validé ensuite, ou validé mais non encore séquencé, reçoit `seq > asOfSeq` ; rejeu + règle de version |
| Contention avec les ventes | Aucune due à la conception : les transactions métier ne touchent pas `integration_feed_state` ; coût d'une insertion par événement |

**Limites acceptées** : latence d'un appel (un événement validé juste après l'attribution n'est séquencé qu'à l'appel suivant) ; ordre entre objets **indépendants** fondé sur `write_id`, non sur l'ordre de validation ; sûreté subordonnée au respect de R1 et R2 et aux tests ci-dessous.

**Exigences d'implémentation (lot 1)** : les six conditions P0 inscrites au tableau du lot 1 (§ 9).

### 20.3 Origine de `version` (P3) et images (P6, P7)

| Famille | Types | `version` | Contenu de l'événement |
|---|---|---|---|
| Entités jamais supprimées physiquement | `CATEGORY`, `PRODUCT` | `@Version` lu après flush (R1) | État écrit dans la transaction |
| Objets supprimables | `PRODUCT_IMAGE` | Génération durable (P7) | État écrit dans la transaction |
| Agrégats calculés | `AVAILABILITY` | `seq` de l'événement | Événement **mince** : valeur recalculée depuis les données validées au service de la page ; plusieurs événements du même objet dans une page peuvent être fusionnés |
| **À confirmer** (lots 3-4) | `CHANNEL_PRICE`, `ONLINE_ORDER_STATUS` | Non décidé | Non décidé |

Justification de l'événement mince : deux transactions concurrentes tenant des verrous différents (deux ventes du même produit dans deux dépôts) peuvent chacune calculer un agrégat qui ignore l'autre ; un contenu figé à l'écriture peut être faux. Le schéma OpenAPI n'est pas modifié ; seules les descriptions précisent ces règles.

**Images [Observé]** : `product_image.version` est porté par la ligne, supprimée par `ProductImageService.delete` ; une nouvelle image repart de 0 ; `upload` fait `findByProductId` puis insertion sans verrou (deux premiers envois concurrents : l'un échoue sur l'index unique) ; changer l'image ne modifie pas le produit (intention documentée dans le service) ; `Product` sans `@DynamicUpdate`.

**P7 [Approuvé]** : `product_image_generation (product_id` clé primaire, référence `product ON DELETE CASCADE`, `generation bigint`, `sha256` nullable, `updated_at)` ; jamais supprimée avec l'image ; `INSERT … ON CONFLICT (product_id) DO UPDATE SET generation = generation + 1 … RETURNING generation` = **première instruction** de la transaction d'image ; compteur, image et événement dans la même transaction ; retrait d'image ⇒ événement `UPSERT` avec `imageSha256 = null`. **P6 [Approuvé]** : empreinte inchangée, ou suppression d'une image inexistante ⇒ ni incrément, ni événement.

### 20.4 Tests d'acceptation du lot 1 — **aucun n'est écrit ni exécuté**

| # | Objet | Critère |
|---|---|---|
| T-C3-1 | Deux connexions validant dans l'ordre inverse de leur démarrage | Les deux événements reçus, aucun sauté, `seq` contigus |
| T-C3-2 | a) événement non validé ; b) deux lecteurs sous barrière ; c) échec forcé pendant l'attribution ; d) même `after` deux fois ; e) R1 sur un même produit | a) non servi ; b) mêmes ensembles, ni doublon ni trou ; c) rien d'attribué, `last_seq` inchangé ; d) pages identiques ; e) second événement : `seq` et version supérieurs |
| T-C3-3 | Instantané de trois pages avec écritures intercalées | `asOfSeq` identique sur toutes les pages |
| T-C3-4 | Instantané complet + rejeu depuis `asOfSeq`, avec modifications et archivage pendant la pagination | État final = état source |
| T-C3-5 | `pageToken` d'une autre liaison ; jeton altéré | 400 `INVALID_PAGE_TOKEN` |
| T-C3-6 | `pageToken` émis il y a plus de 24 h | 410 `SNAPSHOT_EXPIRED` |
| T-C3-7 | Événements filtrés pour la liaison | `lastSeq` avance même si la page est vide |
| T-C3-8 | Débit des ventes avec l'outbox actif | Dégradation ≤ 10 % [Proposé] ; confirme les valeurs P5 |
| T-C3-9 | `hasMore` (P2) | Vrai s'il reste des événements validés sans `seq` ; vrai pour un lecteur passé par `SKIP LOCKED` pendant une attribution concurrente ; faux seulement si les deux conditions sont fausses |
| T-C3-10 | `limit` | 100 par défaut ; valeur > 500 ⇒ 400 |
| T-C3-11 | Rotation HMAC | Jeton signé par la clé précédente accepté pendant 24 h ; `kid` inconnu ⇒ 400 `INVALID_PAGE_TOKEN` |
| T-C3-12 | R1 par construction | Aucune insertion dans l'outbox hors du point d'entrée unique (test d'architecture ou revue documentée) |
| T-C3-13 | `AVAILABILITY` | Deux ventes concurrentes du même produit dans deux dépôts : état final côté consommateur = stock réel |
| T-C3-14 | Curseur antérieur à la purge (v9-D1) | `after` < repère de purge ⇒ 410 `CURSOR_EXPIRED` ; instantané puis rejeu depuis `asOfSeq` ⇒ état source ; `after` = repère ⇒ accepté (200) |
| T-C7-1 | Ajout → suppression → ajout | Versions 1, 2, 3 ; la 2 porte `imageSha256 = null` |
| T-C7-2 | Deux premiers envois concurrents | Pas d'erreur d'index unique ; générations 1 et 2 ; état final cohérent |
| T-C7-3 | Envoi d'image pendant une modification de fiche | Pas de 409 sur la fiche ; `@Version` du produit inchangé |
| T-C7-4 | Annulation d'une modification d'image | Génération et événement absents |
| T-C7-5 | Image identique renvoyée | Génération inchangée, aucun événement |
| T-C7-6 | Suppression sans image | Génération inchangée, aucun événement |

### 20.5 Nouveaux points ouverts, rattachés à C8 (non décidés)

- **Curseur antérieur à la purge** : **principe approuvé (v9-D1, § 21)** — `410 CURSOR_EXPIRED`, repère de purge durable, instantané complet puis reprise depuis `asOfSeq`. **Restent ouvertes (C8)** : durée de rétention et règle de purge. *v8 : « [Hypothèse non approuvée] — à lire comme non approuvée jusqu'à décision » (réponse présente dans l'OpenAPI depuis la v1).*
- **Calcul de la purge** : exclusion des liaisons révoquées et traitement des liaisons inactives, pour qu'une liaison qui n'acquitte plus ne bloque pas la purge.

### 20.6 Ce qui n'a pas été fait
Aucun code, migration, test, configuration ni secret créé ou modifié ; aucune table ni aucun index créé ; index Git inchangé (la v6 reste indexée) ; aucun commit, push ou déploiement ; lot 1 non démarré ; **C3 non validée** ; validation complète OpenAPI 3.1 non exécutée (E2 non autorisé).

## 21. Relevé de décisions v9 — `CURSOR_EXPIRED`, `pageToken`, portes du lot 1 — 2026-10-28

Nommage : **v9-D1, v9-D2, v9-D3**, pour éviter la confusion avec les décisions métier D1 à D11 (§ 11).

### 21.1 Décisions

| # | Objet | Statut | Contenu approuvé | Reste ouvert |
|---|---|---|---|---|
| **v9-D1** | `410 CURSOR_EXPIRED` sur `/catalog/changes` | **[Approuvé] dans son principe** | Existence du code ; détection : `after` strictement inférieur au repère de purge (plus haut `seq` purgé, conservé durablement — emplacement : détail d'implémentation du lot 1, aucune colonne nommée ici) ; `after` égal au repère accepté ; le consommateur abandonne le curseur, relance un instantané complet, reprend avec `after=asOfSeq` ; **distinct** de `410 SNAPSHOT_EXPIRED` (instantané), les deux se distinguant par le champ `code` | Durée de rétention ; règle de purge, liaisons révoquées ou inactives comprises (C8) |
| **v9-D2** | Longueur de `pageToken` | **[Approuvé]** | `maxLength` 512 (paramètre et `nextPageToken`) ; le client ne suppose ni la longueur, ni le format, ni le contenu | Encodage interne (binaire ou JSON) : lot 1 |
| **v9-D3** | Portes du lot 1 | **[Approuvé]** | Tableau 21.2 ; remplace la formulation circulaire « lot 1 bloqué tant que les tests T-C3 ne passent pas » (§ 19.2, conservée en historique) | — |

### 21.2 Portes (v9-D3)

| Porte | Condition | État au 2026-10-28 |
|---|---|---|
| **Entrée dans le lot 1** | Conception détaillée C3 approuvée (P0 à P8, v9-D1, v9-D2) | **Satisfaite sur le plan documentaire.** **Ne vaut pas autorisation de démarrer** : le démarrage fera l'objet d'une autorisation séparée |
| **Sortie du lot 1** | T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 réussis sur PostgreSQL 17 (Testcontainers) | **Non satisfaite** (aucun test écrit ni exécuté) |
| **Validation de C3** | Prononcée **uniquement** à la sortie du lot 1 | Non prononcée |
| **Lots consommateurs du flux** | Bloqués tant que C3 n'est pas validée | Bloqués |

**Statut de C3** : « **approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1** ».

### 21.3 Lots consommateurs du flux (identifiés dans le § 9 réel)

| Lot | Lit le flux ? | Justification (§ 9) | Effet de v9-D3 |
|---|---|---|---|
| Lot 2 — Liaison | Non | Autorisation et liaison ; aucun événement lu | Non bloqué par C3 |
| **Lot 3 — Catalogue et prix** | **Oui, directement** | Rubrique « GestStock » : API `changes?after=<seq>&limit=`, `snapshot` ; rubrique « JCMB » : consommateur, curseur ; tests C3 côté instantané | **Bloqué** jusqu'à la validation de C3 |
| **Lot 4 — Disponibilité** | **Oui, directement** | « Événement à chaque mouvement de stock, réservation ou libération » : événements `AVAILABILITY` reçus par le flux | **Bloqué** |
| Lot 5 — Commandes | Non prévu dans ce lot | Transmission `POST /online-orders` et états ; dépendance déclarée « Lots 2 et 3 » | **Bloqué indirectement** (via le lot 3). *À surveiller* : le contrat prévoit des événements `ONLINE_ORDER_STATUS` ; si le lot 5 les consomme, il deviendra consommateur direct |
| Lot 6 — Réservation | Non | Écrit des réservations (qui produisent des événements) ; n'en lit pas | Non bloqué par C3 en propre ; suit l'ordre des approbations de lots |
| Lot 7 — Exploitation | Non directement | Métriques et réconciliation ; mise en production après acceptation des lots 1 à 6 | Bloqué de fait par ses propres critères |

### 21.4 Tests ajoutés
T-C3-14 (§ 20.4) : `after` < repère ⇒ 410 `CURSOR_EXPIRED` ; instantané puis rejeu depuis `asOfSeq` ⇒ état source ; `after` = repère ⇒ accepté. Critère de sortie du lot 1. **Non écrit, non exécuté.**

### 21.5 Ce qui n'a pas été fait
Aucun code, migration, test, configuration ni secret ; aucune colonne ni table nommée pour le repère de purge ; index Git inchangé (v6) ; aucun commit, push ou déploiement ; **lot 1 non démarré** ; **C3 non validée** ; validation complète OpenAPI 3.1 non exécutée (E2 non autorisé).
