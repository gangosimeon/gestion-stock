# Intégration GestStock ↔ JeCréeMaBoutique — audit et plan d'implémentation

| | |
|---|---|
| Version | 17 — 2026-11-02, complétée le 2026-11-03 (G17 réalisée, § 30.10 ; G18 réalisée, § 31 ; G19 réalisée, § 32) — **acquittement du flux et purge, conception G17** (§ 30) : décisions de la revue G16 (disponibilité réservée à `stock:read`, paramètre refusé par le pare-feu), décisions G17 v17-D3 à v17-D16 (acquittements dans la base de l'entreprise, liaison sans acquittement bloquante, `409 CURSOR_AHEAD`, 60 appels par minute avant la lecture du corps, `seq` strict, plafond `last_seq` lu avant la liste des liaisons, lots autonomes et durée bornée), démonstration de l'activation pendant une purge corrigée après revue contradictoire et test de concurrence exigé avant toute purge réelle ; notes datées aux § 5.6, § 11 et § 20.5. Historique : v16 — 2026-11-02 — **hébergement sur Render, préparation du lot 3** (§ 29) : backend GestStock sur Render (v16-D1), tâches de fond par route interne et cron externe (v16-D2), D2b non retenue (v16-D3), critères d'entrée du lot 3 constatés, points ouverts Q1 à Q6, ordre des étapes, backlog et checklist corrigés. Historique : v15 — 2026-10-31 — **lot 2 réalisé, plan et contrat alignés sur le code** (§ 28) : étapes G1 à G15, GA1, GA2, J1 à J5, JA0 et JA1 telles qu'implémentées (le code fait foi), écarts avec v14 relevés, décisions v15-D1 à v15-D6, backlog du lot 3 et checklist de déploiement complétés. Historique : v14 — 2026-10-29 — **décisions du lot 2** (§ 27) : parcours de liaison par demande déposée de serveur à serveur (PAR) et retour par une page Angular JCMB protégée, unicité côté boutique, deux niveaux d'identifiants, jeton `iss`/`typ`, secret SHA-256 et rotation, `integration:manage` pour ADMIN seulement, IP réelle derrière Vercel, retour arrière plateforme, suspension avec motif, drapeau de publication, ordre des étapes et du déploiement. Historique : v13 — 2026-10-29 — **hébergement réel, C1 et C8 tranchées, préparation du lot 2** (§ 26) : hébergement confirmé (GestStock sur Vercel et Neon, JCMB sur VPS et Atlas), tâches planifiées par cron Vercel, consommation du flux par interrogation depuis le VPS et webhook retiré de la v1, limitation de débit (C1), jeton de liaison, secret, idempotence, limites de commande et données client (C8, sauf conservation), sécurité des routes d'intégration, comportements JCMB conservés, risques acceptés. Historique : v12 — 2026-10-29 — **clôture du lot 1, C3 validée (porte de sortie du Lot 1, 2026-10-29)** (§ 25) : preuves de la porte de sortie, lot 1 terminé et non déployé, décisions des étapes 7 à 9, publication conditionnée à une liaison active, critères d'entrée du lot qui expose le flux en HTTP, dette rattachée, checklist du premier déploiement. Historique : v11 — 2026-10-29 — décisions des étapes 4a à 4c du lot 1 (§ 24) : réparation de l'état du flux et invariant de purge, `409 CURSOR_AHEAD`, deux codes `400` sur `/catalog/changes`, type d'événement inconnu servi tel quel, `occurredAt` informatif, `currency` et `imageSha256` retirés de `Product`, devise ISO 4217 et `perWarehouse` (C8 tranché sur ces points), forme de l'instantané, retour arrière de V048 destructif, P8 devenue règle de déploiement ; état du lot 1 (étapes 1 à 6 du plan d'exécution réalisées, C3 non validée). Historique : v10 — décisions Q1 à Q7 (§ 22) : conventions de schéma (clé `uuid`, `write_id` unique, `object_version`), permissions `integration:*` au lot 2, **lot 1 sans route HTTP**, numéros de migration non fixés, métriques sans exposition, remplissage `product_image_generation`, contrat conforme au lint Redocly (0 erreur) ; constats annexes (§ 23). Historique : v9 — décisions v9-D1 (`410 CURSOR_EXPIRED`), v9-D2 (`pageToken` ≤ 512), v9-D3 (portes du lot 1) (§ 21) ; **C3 : approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1** ; entrée dans le lot 1 satisfaite sur le plan documentaire, **démarrage non autorisé** ; C1 et C8 ouvertes. Historique : v8 conception détaillée C3/C7, décisions P0 à P8 (§ 20), point bloquant C7 résolu sur le plan documentaire (P7) ; v7 décisions de contrat C2 à C7 (§ 19) ; v6 contrat corrigé (E3) et documents indexés (E5) ; plan A–E (§ 18) ; constat Atlas (§ 5.5) |
| Statut | **Proposition soumise à approbation.** Lot 1 **terminé, non déployé** (§ 25.2) ; C3 validée (porte de sortie du Lot 1, 2026-10-29) ; C1 tranchée, C8 tranchée sauf la durée de conservation des données client (§ 26) ; lot 2 **réalisé, déployé selon le responsable** (§ 29.1) ; lot 3 en cours : G16 réalisée et revue ; G17 **réalisée et vérifiée, non déployée** (§ 30.10), purge réelle toujours désactivée ; G18 **réalisée et vérifiée, non déployée** (§ 31) ; G19 **réalisée et vérifiée, non déployée** (§ 32). *v17 (première rédaction) : « G17 conçue et non commencée (§ 30) ».* *v16 : « lot 3 en préparation (§ 29), aucune étape commencée ».* *v15 : « lot 2 réalisé, non déployé ; aucun autre lot commencé ».* *v14 : « lot 2 en préparation, non commencé, décisions arrêtées (§ 27) ».* *v11 : « Lot 1 en cours » ; v10 : « Aucun lot d'implémentation n'est commencé. »* |
| Code, bases, déploiements | Lot 2 : branche `feat/integration-lot2` des quatre dépôts (§ 28.2) ; aucun déploiement. Lot 1 : code, migrations et tests dans le dépôt backend, branche `feat/integration-lot1` (§ 24.6, § 25.2) ; **aucune modification** de la production ni de l'hébergement, **aucun déploiement**. Documents : ce fichier et `integration-v1.openapi.yaml`. Seule base créée hors tests : `geststock_restore_lot0`, sur le PostgreSQL **local** d'essai (§ 17). *v10 : « Aucune modification du code, des migrations… »* |
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
- retour vers JCMB : une route **backend** `…/api/integrations/geststock/callback` *(à créer)* sur l'origine API JCMB retenue ci-dessus ; *v14-D1 : remplacé par une page **Angular** JCMB protégée, qui transmet `code` et `state` à une route backend authentifiée (§ 27.2) ; v14-D12 : `redirect_uri` exacte par environnement*
- liste blanche à comparaison exacte, une entrée par environnement (essai, production).

Aucun callback n'est configuré ; aucun paramètre Render, Vercel, DNS, OAuth ou de sécurité n'est modifié. **D8 reste ouverte** jusqu'à confirmation des origines backend. *v13-D1 : hébergeurs confirmés par le responsable (backend GestStock sur Vercel, backend JCMB sur le VPS de U5) ; URL publiques de production et callbacks encore à fixer.*

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
| Tâches planifiées | **Aucune** (`@Scheduled` absent) *— v12 : métriques et purge du lot 1, désactivées par défaut ; v13-D2 : non fiables sur Vercel, cron Vercel à concevoir* |
| Idempotence | Seulement à la création d'entreprise (`platform.company.idempotency_key`) |

### JeCréeMaBoutique

| Élément | Constat |
|---|---|
| Backend | Next.js 14 (`app/api/**/route.ts`), `services/`, `validators/` (Zod), Mongoose 8 |
| Base | **MongoDB 7, instance Docker unique** (`docker-compose.yml`, commentaire « remplacer par Atlas en production ») ; pas de jeu de réplicas configuré ⇒ **pas de transactions multi-documents** *— v13-D1 : base de production **MongoDB Atlas** (fait communiqué par le responsable)* |
| Front | Angular 20 standalone |
| Déploiement | Image Docker (GHCR) déployée par SSH sur un VPS (`.github/workflows/deploy.yml`) ; `vercel.json` présent mais apparemment hérité *— v13-D1 : VPS confirmé, `vercel.json` périmé* |
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
- **Migrations** : `online_order`, `online_order_line` (instantané : produit, SKU, libellé, prix unitaire, devise, quantité, version de prix ; *remise retirée en v13-D5*), `sale_id` unique ; aucune modification de `sale` ni `sale_line`.
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

*Note v17 (2026-11-02) : règle de purge précisée au § 30.4 (liaisons actives ou suspendues de l'entreprise, liaison sans acquittement bloquante, liaisons révoquées exclues, plafond `last_seq` lu en premier, lots autonomes) ; les « points ouverts rattachés à C8 » ci-dessous sur l'exclusion des liaisons révoquées et les liaisons inactives sont tranchés par v17-D4, v17-D5 et § 30.4. Texte d'origine conservé.*

- **Périmètre** : la règle vise uniquement `integration_outbox` (événements de synchronisation). `audit_log`, ventes, commandes et réservations **ne sont pas** purgés par cette règle ; toute rétention les concernant demande une analyse distincte.
- **Condition de purge** (les deux à la fois) : événement plus ancien que **90 jours** **et** `seq` inférieur au plus petit curseur **acquitté** par toutes les liaisons actives ou suspendues. JCMB acquitte son curseur après application (`POST …/changes/ack`, à créer dans le contrat).
- **Jamais purgés** : événements non acquittés, liaisons en erreur ou suspendues, sauf procédure explicite d'**abandon** (liaison révoquée, décision ADMIN journalisée).
- **Reprise sans les événements purgés** : la réconciliation par instantané (`snapshot`) reconstruit l'état courant du catalogue ; une purge ne rend donc pas la reprise impossible.
- **Données personnelles** : les événements de catalogue n'en contiennent pas ; les événements de commande ne transportent que des identifiants (jamais nom, téléphone ou adresse du client). Durée de conservation des commandes en ligne et de leurs données client : **[Ouvert]**, à aligner sur la politique de données personnelles.
- **Observabilité** : tâche de purge en mode simulation par défaut (comptage sans suppression), puis suppression par lots bornés ; métriques (événements en attente, purgés, plus ancien non acquitté) ; journal de chaque exécution.
- **Réversibilité** : une suppression est définitive ; avant purge, export optionnel des lots (format JSON compressé) vers le stockage des sauvegardes ; sinon, recours à la sauvegarde nocturne et à la réconciliation.
- **Volume (hypothèses à valider)** : ~0,5 Ko par événement avec index ; 2 000 événements/jour/entreprise ⇒ ~180 000 événements et ~90 Mo par entreprise sur 90 jours. Index : clé primaire `id` (`uuid`, UUID v7), index unique sur `write_id` (seule clé d'ordre), index unique sur `seq`, index partiel `seq IS NULL`, index sur `created_at` (Q1, § 22 ; *v8-v9 : « clé primaire `write_id` » — contraire à la convention « clé `uuid` » vérifiée par `SchemaConventionsIT` ; v7 et antérieures : « clé primaire `seq` », incompatible avec un `seq` nul à l'écriture*). Coût de stockage Neon à vérifier selon l'offre.
- **Purge et conception D** : un événement sans `seq` n'est jamais purgé. **Repère de purge [Approuvé, v9-D1]** : GestStock conserve durablement le plus haut `seq` purgé (emplacement : détail d'implémentation du lot 1) ; un `after` strictement inférieur à ce repère reçoit `410 CURSOR_EXPIRED` et le consommateur repart d'un instantané complet (§ 12, § 21). **Invariant de purge [Approuvé, v11-D1]** : l'événement de plus grand `seq` n'est **jamais** purgé (le compteur du flux reste reconstructible ; réparation de la ligne d'état : § 24.2). Points **ouverts, rattachés à C8** (§ 20.5) : durée de rétention ; règle de purge, dont l'exclusion des liaisons révoquées et le traitement des liaisons inactives dans le calcul du plus petit curseur acquitté. *v8 : « erreur renvoyée pour un curseur antérieur à la purge » ouverte — tranchée dans son principe par v9-D1.*

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
| Fichiers concernés | Existants : `category/CategoryService`, `product/ProductService`, `product/ProductImageService` (P6, P7), `stock/StockService`, `persistence/SchemaConventionsIT` (liste des tables) ; à créer : module `com.geststock.integration` — point d'entrée unique d'écriture (ex. `IntegrationEvents.publish`), composant séquenceur, services de lecture du flux et d'instantané, purge |
| Exposition HTTP (Q3) | **Aucune route HTTP au lot 1** : services testés directement (codes d'erreur vérifiés par la correspondance `ApiError`). Les routes arrivent aux lots 2-3, derrière l'authentification par liaison |
| Ordre des étapes (§ 22.3) | Chaîne complète d'abord avec `CATEGORY` (migration du flux → publication → séquenceur → lecture), puis les autres producteurs |
| Migrations | *(numéro attribué à l'implémentation)* (Q4) : `integration_outbox` (clé `id uuid` (UUID v7) ; `write_id` identity **UNIQUE**, seule clé d'ordre, jamais exposé ; `seq` **NULL à l'écriture, UNIQUE**, attribué à la lecture ; index partiel `seq IS NULL` ; type, identifiant d'objet, **`object_version`** (le JSON du contrat garde `version`), opération, charge minimale, `created_at`), `integration_feed_state` (clé `uuid` constante + `CHECK` de ligne unique, `last_seq`, repère de purge), `product_image_generation` (P7, remplie pour les images existantes, Q6) ; chaque script V a son script U. **Contraintes (§ 22.2)** : tables additives uniquement, migrations courtes, aucun déploiement avant la porte de sortie. *v9 : `V047__integration_outbox.sql`, clé `write_id`, `id = 1`, colonne `version`, permissions `integration:*` (passées au lot 2, Q2), rollback `U047`.* *v6 et antérieures : `seq` bigserial attribué à l'écriture — abandonné (risque d'événement sauté, § 19.2)* |
| Versions | Conception D (§ 20.2) : `seq` attribué à la lecture, contigu, dans l'ordre de `write_id`, aux seuls événements validés ; ordre d'application par (`type`, `objectId`) (C7) ; origine de `version` par famille (P3, § 20.3). *v7 : point bloquant « version de `PRODUCT_IMAGE` » — résolu sur le plan documentaire par P7* |
| Exigences d'implémentation (P0) | 1. Attribution dans une transaction **dédiée et courte** (`TransactionTemplate` ou `REQUIRES_NEW`), jamais incluse dans un `@Transactional` englobant la requête, jamais `readOnly = true` ; 2. `lock_timeout` et `statement_timeout` définis pour cette transaction (valeurs à fixer au lot 1) ; 3. attribution isolée dans un **composant séquenceur unique** et réutilisable (flux et instantané) ; 4. **point d'entrée unique** d'écriture d'événement appliquant R1 (flush, lecture de la version, insertion) ; aucun service métier n'insère directement dans l'outbox ; 5. le point de terminaison du flux **écrit en base** : ni réplica en lecture seule, ni cache ; 6. métriques : nombre d'événements sans `seq`, âge du plus ancien d'entre eux — **jauges Micrometer enregistrées, aucune exposition nouvelle** (pas d'actuator `metrics` public) ; **log WARN** quand un événement reste sans `seq` au-delà d'un seuil configurable (Q5) |
| Règle de déploiement (P8, v11-D12) | Les URL utilisées par les migrations (`GESTSTOCK_DB_URL`, `GESTSTOCK_PROVISIONER_DB_URL`) pointent vers l'hôte direct, **sans `-pooler`** ; le pooler n'est envisagé que pour le trafic applicatif, sur besoin mesuré ; vérifiée par la checklist de déploiement (§ 24.5). *v10 : « Vérification préalable (P8) — lecture seule, au début du lot : l'URL de connexion de l'application contient-elle `-pooler` ? » — remplacée.* |
| Rétention | § 5.6 (90 jours minimum, acquittement requis) ; purge livrée **désactivée** |
| Reprises | Lecture rejouable depuis tout `seq` (exposée au lot 3) |
| Dépendances | Lot 0 accepté |
| Porte d'entrée (v9-D3) | Conception détaillée C3 approuvée (P0 à P8, v9-D1, v9-D2) : **satisfaite sur le plan documentaire**. **Ne vaut pas autorisation de démarrer** : le démarrage du lot 1 fera l'objet d'une autorisation séparée |
| Porte de sortie (v9-D3) | T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 réussis sur PostgreSQL 17 (Testcontainers) : **satisfaite le 2026-10-29** (§ 25.1). La validation de C3 est prononcée **uniquement** à cette sortie : C3 validée (porte de sortie du Lot 1, 2026-10-29). *v9-v11 : « non satisfaite ».* |
| Risques | Événement écrit hors transaction (perte) ; surcoût d'écriture sur stock et ventes ; croissance de table ; régression des comptes de permissions dans les tests |
| Tests | Un changement ⇒ un événement dans la même transaction ; rollback métier ⇒ aucun événement ; `seq` strictement croissant sous écritures concurrentes ; isolation (deux entreprises d'essai, aucun événement croisé) ; purge en simulation ne supprime rien ; suite complète GestStock (unitaire + intégration) sans régression ; **T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 (§ 20.4)** — état au 2026-10-29 : § 24.6 |
| Critères d'acceptation (sortie) | Tous les tests verts, dont **T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6** (PostgreSQL 17, Testcontainers) ; temps d'une vente de 10 lignes non dégradé de plus de 10 % [Proposé] (T-C3-8) ; aucune régression ; exigences P0 1 à 6 vérifiées en revue ; P8 inscrite à la checklist de déploiement (v11-D12) ; **C3 démontrée** (revue du mécanisme) — C3 n'est « validée » qu'à ce moment. *v10 : « vérification P8 consignée ».* |
| Retour arrière | Publication désactivable par configuration ; scripts U des migrations du lot (aucune donnée métier touchée) ; aucun outil n'applique les scripts U à toutes les bases d'entreprise : application manuelle, base par base, avec le compte propriétaire *(v9 : `U047`)* |
| Preuves | Rapport de tests, revue de code, mesure avant/après |
| Conditions d'arrêt | Régression ventes/stock ; événement hors transaction ; fuite entre entreprises |
| Autorisation | Approbation écrite avant lot 2 |

### Lot 2 — Liaison et autorisation

| Rubrique | Contenu |
|---|---|
| Objectif | Lier explicitement une entreprise GestStock et une boutique JCMB |
| Flux | 1) JCMB crée `state` (256 bits, haché, 10 min, lié à la boutique) et un vérificateur PKCE, puis redirige vers l'écran d'autorisation GestStock ; 2) personne GestStock connectée, permission `integration:manage`, voit la boutique, choisit les dépôts (accessibles par elle) et les portées, confirme ; 3) GestStock émet un **code** (256 bits, seul le haché est stocké, 5 min, usage unique, lié à l'entreprise, au client, à l'URL de retour exacte et au défi PKCE) et redirige vers l'URL préenregistrée ; 4) le backend JCMB vérifie `state` (usage unique) et échange le code serveur à serveur (secret client + vérificateur PKCE) ; 5) GestStock renvoie la liaison et un secret (montré une fois ; haché côté GestStock, chiffré AES-GCM côté JCMB) *— v14-D1 : demande déposée de serveur à serveur (`POST /oauth/par`) et retour par une page Angular JCMB protégée ; parcours de référence : § 27.2* |
| États de liaison | `PENDING` → `ACTIVE` → `SUSPENDED` (temporaire, réactivable) / `REVOKED` (définitif) ; réautorisation = nouveau flux complet |
| Appels de service | Jeton court (5 min) par `client_credentials` ; `iss=geststock`, `aud` dédiée, `sub` = liaison, portées ; statut de liaison relu à chaque appel *— v13-D5 : JWT de 15 min, `aud=geststock-integration`, émetteur, type et clé de signature distincts de ceux des utilisateurs (§ 26.5) ; v14-D4 : `iss=geststock-integration`, claim `typ=integration`, en-tête `typ=at+jwt`* |
| Portées | `catalog:read`, `catalog:match`, `price:propose`, `stock:read`, `orders:read`, `orders:write` ; `orders:write` implique `orders:read` [Décision C5, approuvée]. `reservations:write` retirée : fusionnée dans `orders:write` (la réservation est créée avec la commande, § 12) |
| Révocation par la boutique | `POST /link/revoke` [Décision C2, approuvée] : définitive, motif facultatif, `REVOKED` + `revokedAt` + secret invalidé + audit ; ancienne liaison ⇒ `401 LINK_REVOKED` (traité par le client comme succès idempotent) ; réservations et commandes engagées conservées jusqu'à expiration ou conversion ; nouvelle connexion = nouvelle autorisation, nouvelle liaison |
| URL de retour | **Non définies** ; liste blanche stricte, comparaison exacte *— v14-D12 : une par environnement, domaine réel du frontend JCMB, `localhost` seulement en développement et en essai* |
| Fichiers concernés | Existants : `security/JwtTokenService`, `security/SecurityConfig`, `tenancy/TenantContext`, `platform/CredentialCipher`, `platform/audit/PlatformAudit` ; JCMB `lib/auth.ts`, `middleware.ts`. À créer : contrôleurs et services d'intégration, collection `geststocklinks`, écrans des deux fronts *— v14 : étapes détaillées et ordre au § 27.4* |
| Migrations | Plateforme, *(numéro attribué à l'implémentation)* : `integration_client`, `integration_link`, `integration_authorization_code` ; script U associé. Base de chaque entreprise : permissions `integration:manage` et `integration:price-approve` (Q2 ; met à jour `SchemaConventionsIT.referenceDataIsLoaded`, 51 permissions aujourd'hui). *v14-D7 : `integration:manage` seulement au lot 2 (ADMIN, 52 permissions) ; `integration:price-approve` au lot 3. v14-D9 : retour arrière plateforme dans `db/platform-rollback`. v14-D11 : colonne de publication dans `integration_feed_state`.* *v9 : `platform/V002__integration_link.sql`, `U002` ; permissions au lot 1.* JCMB : script `scripts/migrate-geststock-link.mjs` *(à créer)* |
| Angular | GestStock : écran de consentement, « Paramètres → Boutique en ligne » (dépôts, suspension, révocation). JCMB : « Connecter GestStock », statut |
| Dépendances | Lot 0 (URL de retour, secrets d'essai) |
| Risques | Erreur de flux = liaison usurpée : tests négatifs obligatoires |
| Tests | Scénarios 1, 2, 3 (§ 10) + jeton d'audience/émetteur incorrect, expiré, liaison suspendue ; aucun secret dans réponses Angular ni journaux ; critères C2 et C5 (§ 19.3) |
| Critères d'acceptation | Tous les scénarios négatifs refusés sans effet de bord |
| Retour arrière | Toutes les liaisons à `REVOKED`, routes désactivées, script U de la plateforme, collection supprimée *— v14 : interrupteurs et ordre au § 27.8* |
| Preuves | Rapport de tests de sécurité, journal plateforme |
| Conditions d'arrêt | Un seul scénario de rejeu ou d'usurpation qui réussit |
| Autorisation | Approbation avant lot 3 |

### Lot 3 — Synchronisation des catégories, produits et prix

| Rubrique | Contenu |
|---|---|
| Objectif | Copier le catalogue autorisé vers la boutique, sans perte ni écrasement |
| GestStock | API paginée `changes?after=<seq>&limit=`, `snapshot` (réconciliation), recherche pour le rapprochement, image, propositions et approbations de prix ; notification signée (HMAC, horodatage, identifiant, fenêtre 5 min) envoyée par une tâche planifiée par entreprise (`TenantContext.runAs`) *— v13-D3 : notification retirée de la v1 ; JCMB interroge le flux toutes les 30 à 60 s* |
| JCMB, instance actuelle | Consommateur : catégories avant produits ; `updateOne` conditionné `external.version < version reçue` ; registre des événements appliqués (index unique liaison + `seq`) ; curseur avancé **après** application ; rejouer un événement ne change rien |
| JCMB, si Atlas | Application de l'événement et avancée du curseur dans une transaction ; les règles d'idempotence restent |
| Propriété des champs | § 7 ; champs GestStock en lecture seule (API et Angular JCMB) |
| Suppressions | § 5.3 ; modification de `services/category.service.ts › deleteCategory` et `services/product.service.ts › deleteProduct` |
| Rapprochement | § 5.3 |
| Délais attendus **[Proposé]** | Notification ≤ 1 min après le changement ; réconciliation quotidienne ; une synchronisation non reçue apparaît « en retard » au-delà de 15 min *— v13-D3 : sans notification, le délai dépend de l'intervalle d'interrogation (30 à 60 s)* |
| Fichiers concernés | JCMB existants : `models/product.model.ts`, `models/category.model.ts`, `services/product.service.ts`, `services/category.service.ts`, `validators/product.validator.ts` ; à créer : consommateur, modèles `syncstates`, écrans de statut et de rapprochement |
| Migrations | GestStock *(numéro attribué à l'implémentation)* : `channel_warehouse`, `channel_price` ; JCMB `scripts/migrate-external-ids.mjs`, `scripts/migrate-sync-cursor.mjs` *(à créer)* ; rollbacks associés |
| Dépendances | Lots 1 et 2 ; **consommateur direct du flux** (`/catalog/changes`, instantané) : blocage levé, C3 validée (porte de sortie du Lot 1, 2026-10-29) ; exposition HTTP soumise aux critères d'entrée du § 25.4. *v9-v11 : « bloqué tant que C3 n'est pas validée en sortie du lot 1 (v9-D3) ».* |
| Risques | Écrasement de données boutique ; doublons |
| Tests | Scénarios 4 à 9, 19 ; critères C3 côté instantané (T-C3-3 à T-C3-6), C6 et C7 (§ 19.3) |
| Critères d'acceptation | Catalogue identique après synchronisation et après réconciliation ; aucun champ boutique modifié |
| Retour arrière | Arrêt du consommateur ; produits synchronisés marqués « déconnectés » et conservés ; scripts Mongo inverses ; script U GestStock |
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
| JCMB | `stock`/`inStock` en lecture seule ; contrôle `quantité ≤ disponibilité connue` à la commande (`services/order.service.ts`) *— v13-D7 : aucun contrôle de stock ajouté côté JCMB ; la vérification est remplacée au lot 5 par la réservation GestStock* |
| Migrations | Aucune nouvelle |
| Dépendances | Lot 3 ; **consommateur direct du flux** (événements `AVAILABILITY`) : blocage levé, C3 validée (porte de sortie du Lot 1, 2026-10-29). *v9-v11 : « bloqué tant que C3 n'est pas validée (v9-D3) ».* |
| Tests | Scénarios 11, 12, 17 |
| Retour arrière | Retour à `inStock` manuel |
| Conditions d'arrêt | Disponibilité calculée sur un dépôt non associé |
| Autorisation | Approbation avant lot 5 |

### Lot 5 — Transfert et traitement des commandes

| Rubrique | Contenu |
|---|---|
| Objectif | Transmettre chaque commande à GestStock une seule fois et la faire traiter par le personnel |
| JCMB | État de transmission dans le document de commande (`TO_SEND`, `SENT`, `FAILED`, tentatives, prochaine tentative) ; envoi avec `Idempotency-Key` = identifiant de commande ; reprise espacée *— v13-D5 : idempotence par (liaison, `externalOrderId`), sans `Idempotency-Key`* |
| GestStock | Réception idempotente ; boîte « Commandes en ligne » ; acceptation/refus ; conversion en vente au POS pré-remplie (mécanisme des devis : `sales/data/sales.facade.ts › loadQuote` comme modèle) ; paiement selon les règles de caisse existantes |
| États | § 5.4 |
| Fichiers concernés | JCMB : `app/api/orders/route.ts`, `services/order.service.ts`, `models/order.model.ts` ; GestStock : `sale/SaleService` (si option (a) § 5.1), module d'intégration *(à créer)*, front POS |
| Migrations | GestStock *(numéro attribué à l'implémentation)*, avec unicité (liaison, `externalOrderId`) [Décision C4] ; JCMB : champs d'instantané et de transmission sur `orders` |
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
| Migrations | *(numéro attribué à l'implémentation)* : réservations ; script U après libération de toutes les réservations |
| Tests obligatoires | Scénarios 12 à 17, plus charge : N demandes simultanées sur la dernière unité ⇒ une seule réussit ; aucun stock disponible négatif |
| Critères d'activation | Tous les tests de concurrence verts sur PostgreSQL réel, 100 exécutions sans écart ; revue de code ; aucune régression POS |
| Si non sûr | Analyse argumentée de report (blocage exact, risques, mesures temporaires, impact, travail restant, critères) soumise à approbation — **aucun report appliqué d'office** |
| Retour arrière | Désactivation de la réservation par liaison (retour à la disponibilité indicative) ; libération de toutes les réservations ; script U |
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
| D2b | Suspension automatique d'un prix approuvé si le prix de référence varie au-delà d'un seuil | **Tranché (v16-D3) : non retenue**, alerte seulement *— v15 : « Ouvert (non retenu par défaut) »* | — |
| D3 | Réservation : 30 min, configurable serveur, bornes 5 min – 24 h | **Validé** (bornes proposées) | — |
| D4 | Commande multi-dépôts : une vente par dépôt | Ouvert | Lots 5-6 |
| D5 | Rétention outbox : 90 jours minimum, acquittement requis | **Validé** sous réserve de validation technique *— v17 (2026-11-02) : règle de purge et acquittement conçus au § 30 ; validation technique au test de concurrence de G17 (§ 30.7)* | — |
| D6 | Seuil de disponibilité « périmée » | Ouvert | Lot 4 |
| D7 | MongoDB Atlas avant production ; offre | Ouvert *— v13-D1 : production sur Atlas confirmée ; offre et sauvegardes restent à vérifier* | Lot 7 |
| D8 | URL backends et callbacks | **Ouvert** : candidates U1-U7 § 0 *— v13-D1 : hébergeurs confirmés ; URL publiques et callbacks à fixer* | Lot 2 |
| D9 | Hébergement du backend GestStock et tâches planifiées | **Tranché (v16-D1, v16-D2)** : backend sur Render ; route interne protégée appelée par un cron externe au processus (fournisseur : Q1, § 29.4) *— v13 : « backend sur Vercel ; cron Vercel appelant une route interne protégée »* *— v12 : « Ouvert : options § 13 »* | Lots 2-3, 6 |
| D10 | Permission de traitement des commandes en ligne (`online-order:process`) | Ouvert (proposé) | Lot 5 |
| D11 | Conservation des commandes en ligne et des données client | Ouvert *— seul point de C8 encore ouvert ; données transmises fixées par v13-D5 : nom, téléphone, adresse pour une livraison, pas d'e-mail* | Lot 5 |

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

**Contrat détaillé : [`integration-v1.openapi.yaml`](integration-v1.openapi.yaml)** (OpenAPI 3.1, même dossier) — schémas, erreurs, idempotence, pagination et reprise par curseur, commandes et réservations, révocation ; *notification signée retirée en v13-D3*. Hypothèses marquées « [Hypothèse] » ; origine du serveur laissée en variable (D8). Aucun code généré ; aucun endpoint existant modifié. Ajouts par rapport au tableau ci-dessous : `GET /prices` (état des prix par produit) ; la portée `reservations:write` est fusionnée dans `orders:write` (la réservation est créée avec la commande).

Base : `/api/integration/v1` (GestStock). Authentification : jeton de liaison (`aud` dédiée), portée vérifiée par route ; entreprise déduite de la liaison. Erreurs au format `ApiError` existant.

| Méthode et chemin | Portée | Idempotence | Rôle |
|---|---|---|---|
| `POST /oauth/par` | client JCMB (Basic) | — | Dépôt de la demande d'autorisation (v14-D1) |
| `POST /oauth/token` | client JCMB | — | Échange de code (PKCE) ; `client_credentials` *— v14 : Basic exigé pour les deux grants ; code rejoué ⇒ liaison révoquée* |
| `GET /link` | toute | — | Statut, dépôts associés, réglages |
| `POST /link/revoke` | toute | oui (déjà révoquée ⇒ `401 LINK_REVOKED`, traité comme succès) | Révocation définitive par la boutique (C2) |
| `POST /link/secret` | toute (liaison `ACTIVE`) | non (un nouvel appel remplace le secret en attente) | Rotation du secret de liaison (v14-D6) |
| `GET /catalog/changes?after=&limit=` | `catalog:read` | lecture | Événements ordonnés par `seq` attribué à la lecture (C3) |
| `POST /catalog/changes/ack` | `catalog:read` | oui (`seq`) | Acquittement du curseur (D5) |
| `GET /catalog/snapshot?pageToken=` | `catalog:read` | lecture | Réconciliation paginée ; `asOfSeq` fixé à la première page ; `pageToken` opaque, lié à la liaison, 24 h (C3). *v6 et antérieures : `?cursor=` — remplacé par `pageToken`* |
| `GET /catalog/products/search?q=` | `catalog:match` | lecture | Rapprochement assisté |
| `GET /catalog/products/{id}/image` | `catalog:read` | lecture | Image (ETag `sha256`) |
| `POST /prices/proposals` | `price:propose` | `Idempotency-Key` | Proposition de prix, sérialisée par (liaison, produit) (C6) |
| `GET /availability?productIds=` | `stock:read` | lecture | Disponibilité indicative (dépôts associés) |
| `POST /online-orders` | `orders:write` | (liaison, `externalOrderId`) (v13-D5) *— v12 : `Idempotency-Key` = commande JCMB* | Transmission (instantané) |
| `POST /online-orders/{id}/cancel` | `orders:write` | oui | Annulation client |
| `GET /online-orders/{id}` | `orders:read` (C5) | lecture | État |
| `GET /online-orders/external/{externalOrderId}` | `orders:read` (C4, C5) | lecture | Commande retrouvée par l'identifiant JCMB ; 404 identique si inexistante ou d'une autre liaison |
| ~~Notification GestStock → JCMB~~ | — | — | **Retirée de la v1 (v13-D3)** *— v12 : HMAC, identifiant d'événement, « changements disponibles »* |

Événements (C7) : `CATEGORY`, `PRODUCT` (inclut le prix de référence), `PRODUCT_IMAGE` (`ProductImageState`), `CHANNEL_PRICE`, `AVAILABILITY`, `ONLINE_ORDER_STATUS` ; schéma propre à chaque type, discriminé par `type` ; type inconnu ignoré, curseur avancé ; côté GestStock, un type inconnu de la version qui sert la page est servi tel qu'il est stocké et ne bloque jamais le flux (v11-D4). `occurredAt` est informatif (heure de début de la transaction) ; l'ordre repose uniquement sur `seq` (v11-D5). `Product` ne porte ni `currency` ni `imageSha256` (v11-D6, v11-D7).

Flux et instantané (conception détaillée P0–P8, § 20) :
- `after` = dernier `seq` consommé ; **`lastSeq` = dernier `seq` examiné**, événements filtrés pour la liaison compris, `after` si rien n'a été examiné ; invariants `after ≤ lastSeq ≤` dernier `seq` attribué ; une page vide avec `lastSeq > after` est normale ; le consommateur enregistre toujours `lastSeq` comme nouvel `after` (P1). *v7 : « `seq` du dernier événement de la page » — remplacé.*
- **`hasMore` = il existe un `seq > lastSeq` ou un événement validé sans `seq`**, évalué après l'attribution ; vrai ⇒ rappel immédiat ; faux ⇒ reprise ultérieure, pas une fin définitive (P2). *v7 : « événements déjà séquencés » — remplacé.*
- `limit` de `/catalog/changes` : 100 par défaut, 500 au plus ; une valeur hors bornes est refusée (**400 `VALIDATION_FAILED`**) ; une valeur non numérique ou `after` absent : **400 `INVALID_PARAMETER`** (v11-D3) ; lot d'attribution : 1 000 ; valeurs configurables (P5). `limit` de l'instantané : 200 par défaut, 500 au plus, objets comptés **toutes sections confondues** (v11-D10). *v10 : « au-delà, 400 (borne du schéma) ».*
- **`409 CURSOR_AHEAD`** sur `/catalog/changes` (v11-D2) : `after` > dernier `seq` attribué ; le consommateur arrête la synchronisation et alerte, sans resynchronisation automatique (remise à zéro complète, v11-D11).
- **Instantané** (v11-D10) : en-tête `asOfSeq`, `currency` (ISO 4217), `nextPageToken` (absent sur la dernière page) ; sections dans l'ordre `categories`, `products`, `productImages`, `availability` ; objets archivés inclus ; versions : `@Version` (catégories, produits), génération ou 0 (images), `asOfSeq` (disponibilité). Détail : § 24.3.
- `pageToken` : opaque pour le client, **signé** (HMAC, clé dédiée par environnement), non chiffré ; porte `kid` et un numéro de format ; rotation : clé précédente acceptée 24 h ; `kid` inconnu ⇒ 400 `INVALID_PAGE_TOKEN` (P4). Longueur maximale **512** ; le client ne suppose ni la longueur, ni le format, ni le contenu ; encodage interne décidé au lot 1 (v9-D2). *v8 : `maxLength` 200.*
- **`410 CURSOR_EXPIRED`** sur `/catalog/changes` (v9-D1) : `after` strictement inférieur au repère de purge (plus haut `seq` purgé, conservé durablement) ; `after` égal au repère accepté ; le consommateur abandonne ce curseur, relance un instantané complet, puis reprend avec `after=asOfSeq`. **Distinct** de `410 SNAPSHOT_EXPIRED` (jeton d'instantané expiré, sur `/catalog/snapshot`) : les deux se distinguent par le champ `code` d'`ApiError`. Durée de rétention et règle de purge : ouvertes (C8).
- Origine de `version` (P3) : `CATEGORY`, `PRODUCT` ⇒ `@Version` lu après flush ; `PRODUCT_IMAGE` ⇒ génération `product_image_generation` (P7) ; `AVAILABILITY` ⇒ `seq` de l'événement, événement mince recalculé au service de la page ; `CHANNEL_PRICE`, `ONLINE_ORDER_STATUS` ⇒ **à confirmer** (lots 3-4).

Points tranchés (2026-10-28) : liste des portées (C5), format des événements (C7), pagination (C3), révocation (C2), recherche externe (C4), concurrence des prix (C6). Points **encore ouverts** : codes d'erreur non couverts par une décision, limitation de débit et 429 (C1), durée des jetons (5 min), `aud`, fenêtre HMAC (5 min), route JCMB de notification et autres hypothèses (C8). *v11 : codes d'erreur de `/catalog/changes` tranchés (v11-D2, v11-D3) ; devise et `perWarehouse` tranchés dans C8 (v11-D6, v11-D8). v13 : C1 tranchée (v13-D4) ; C8 tranchée sauf la durée de conservation des données client (v13-D5) ; webhook retiré (v13-D3) (§ 26).*

## 13. Hébergement et tâches planifiées (D9)

| Constat | Source | Conséquence |
|---|---|---|
| Aucune tâche `@Scheduled` dans GestStock | code | À introduire (notification, ménage des réservations, purge) *— v12 : métriques et purge du lot 1, désactivées par défaut ; v13-D2 : cron Vercel vers une route interne protégée* |
| Backend GestStock possiblement en conteneur Vercel *— v13-D1 : confirmé* | `backend/vercel.json`, `Dockerfile.vercel` | Instances pouvant s'arrêter : tâches planifiées internes **non garanties** |
| Front GestStock sur Render | URL fournie | Sans effet sur le backend |
| Sauvegardes GestStock par GitHub Actions planifié | `backend/scripts/backup/README.md` | Un ordonnanceur externe est déjà utilisé |

Conception qui ne dépend pas d'une tâche planifiée pour la **correction** :
- expiration des réservations évaluée par horodatage (§ 5.4) ;
- synchronisation **tirée** par JCMB (curseur) : la notification n'est qu'un accélérateur *(retirée de la v1, v13-D3)* ;
- réconciliation déclenchée côté JCMB (son conteneur VPS est permanent) ;
- purge, ménage et notifications : tâche interne si l'hébergement la garantit, sinon point d'entrée protégé appelé par un ordonnanceur externe (même principe que les sauvegardes). **Décision D9 requise.** *v13-D2 : cron Vercel appelant une route interne protégée.*

### 13.1 Hébergement réel : ce qui est prouvé et ce qui ne l'est pas

| Élément | Preuve | Statut |
|---|---|---|
| Backend préparé pour Vercel (runtime conteneur, bêta) | `backend/vercel.json`, `backend/Dockerfile.vercel` (Temurin 21, port `PORT`) | Prouvé dans le dépôt ; **déploiement effectif non prouvé** *— v13-D1 : déploiement sur Vercel confirmé par le responsable* |
| Aucun déploiement automatisé du backend | `backend/.github/workflows` : `backup.yml`, `ci.yml` seulement | Prouvé |
| Base sur Neon | `backend/scripts/backup/README.md` | Documenté, non vérifié sur le compte *— v13-D1 : confirmé par le responsable* |
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

Recommandation : **B + C** (aucun nouveau service, correction indépendante des tâches). A seulement si le backend est confirmé permanent. Aucun service modifié, aucun abonnement pris. *v13-D2 et v13-D3 : retenu — cron Vercel (au lieu de B) vers une route interne protégée pour les tâches GestStock ; côté JCMB, conteneur consommateur dédié sur le VPS (à la place de C) ; A exclue (backend sans processus permanent).*

## 14. Lot 0 — état de sortie

| # | Critère | Preuve disponible | État |
|---|---|---|---|
| 1 | D1, D2, D3, D5, D8 documentées | § 0, 5.1, 5.4, 5.6, 11 ; D1-D3, D5 validées par écrit (2026-10-28) ; D8 : 7 URL candidates avec vérification sûre (§ 0) | **Partiel** : D8 non confirmée |
| 2 | Contrat `integration/v1` | `integration-v1.openapi.yaml` (§ 12) ; décisions C2 à C7, P0 à P8, v9, Q7 appliquées ; YAML **valide**, 36 `$ref` résolues ; **Redocly 2.72.0 (règles recommandées) : 0 erreur**, 3 avertissements justifiés (§ 22.4) | **Partiel** : C3 validée seulement en sortie du lot 1 ; C1 et C8 ouvertes *(v13 : C1 tranchée, C8 tranchée sauf la conservation des données client, § 26)* ; contrat dans son ensemble **non approuvé** |
| 2c | Séquencement du flux sûr sous concurrence (C3) | C3 **validée (porte de sortie du Lot 1, 2026-10-29)** : porte de sortie du lot 1 satisfaite, preuves au § 25.1 (suite complète verte deux fois sans différence ; T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 ; T-C3-8 à 10 lignes ; revue P0 et R1/R2 acceptée, réserve P0-5). Lots consommateurs du flux débloqués quant à C3. *v10-v11 : « approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1 » ; tests non écrits ; sortie du lot 1 non satisfaite.* | **Satisfait** (2026-10-29) |
| 2b | Versionnement du plan et du contrat | `git add -f` des deux fichiers dans `gestion-stock` (branche `main`) ; v7 modifiée **après** l'indexation : l'index contient la v6, les modifications v7 ne sont pas indexées (`AM`) | **Partiel** : non commités ; réindexation de la v7 non autorisée à ce stade |
| 3 | Environnements isolés + données synthétiques | Spécification et scripts § 16 ; **non créés** | **Non satisfait** : création à autoriser |
| 4 | Stratégie de concurrence et de réservation | § 5.4, § 9 lot 6, § 10, § 13.2 ; précédent `CrossModuleConcurrencyIT.java` | **Partiel** : documentée, non approuvée |
| 5 | Sauvegarde / restauration testée en isolé | § 17 : restauration **GestStock exécutée en local**, cohérence vérifiée (outils et format). MongoDB : **bloqué** (Docker arrêté, outils Mongo absents). Chaîne officielle : non exécutée ; historique du workflow **non consultable** (GitHub CLI absent, § 18.4) | **Partiel** |
| 6 | Inventaire des noms de secrets | § 15 | **Satisfait** (noms seulement, sous réserve de revue) |
| 7 | Tâches planifiées et hébergement | § 13.1-13.3 : preuves, options, coûts (non vérifiés) | **Partiel** : D9 ouverte *(v13 : hébergement confirmé, D9 tranchée, v13-D1 et v13-D2)* |
| 8 | Risques et critères du lot 1 | § 9 (lot 1) | **Satisfait** (documenté, à approuver) |

Pour lever les critères restants : approbation du contrat (2) ; autorisation de créer les environnements locaux (3) et de démarrer Docker / installer les outils Mongo (5) ; vérification par l'utilisateur de `BACKEND_URL` et des `GET /api/health` (D8) ; choix D9 (7).

## 15. Inventaire des secrets (noms uniquement)

| Application | Existants (relevés dans la configuration, valeurs non lues) |
|---|---|
| GestStock | `GESTSTOCK_JWT_SECRET`, `GESTSTOCK_DB_PASSWORD`, `GESTSTOCK_PLATFORM_DB_PASSWORD`, `GESTSTOCK_PROVISIONER_DB_PASSWORD`, `GESTSTOCK_TENANT_CREDENTIALS_KEY`, `GESTSTOCK_ADMIN_PASSWORD`, `GESTSTOCK_PLATFORM_ADMIN_PASSWORD` ; sauvegarde : `GESTSTOCK_BACKUP_ADMIN_URL`, `GESTSTOCK_BACKUP_PROVISIONER_URL`, `GESTSTOCK_BACKUP_PASSPHRASE` |
| JeCréeMaBoutique | `JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`, `CACHE_INVALIDATION_SECRET`, `SWAGGER_ACCESS_KEY` |

Nouveaux **[Proposé, noms à définir]** : secret du client JCMB chez GestStock (stocké haché côté GestStock) ; clé de chiffrement des secrets de liaison côté JCMB ; secret HMAC des notifications par liaison (chiffré par `platform/CredentialCipher` côté GestStock) ; un jeu distinct par environnement. *v13 : secret HMAC des notifications sans objet en v1 (v13-D3) ; clé de signature des jetons de liaison distincte de celle des utilisateurs ; clé de chiffrement des secrets de liaison côté JCMB nouvelle, propre à l'intégration, présente seulement dans l'environnement du VPS (v13-D5, v13-D8). v14-D17 : noms retenus — GestStock `geststock.integration.links.enabled` ; JCMB `GESTSTOCK_INTEGRATION_ENABLED`, `GESTSTOCK_API_ORIGIN`, `GESTSTOCK_CLIENT_ID`, `GESTSTOCK_CLIENT_SECRET`, `GESTSTOCK_LINK_ENCRYPTION_KEY` (§ 27.6) ; clé de signature des jetons de liaison côté GestStock : nom à fixer à l'implémentation.*

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
| E2 | ~~Télécharger `@redocly/cli` pour la validation OpenAPI~~ — **accordée et exécutée** (téléchargement temporaire `npx`, § 22.4) | Téléchargement |
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
| **C3** | Séquencement et pagination | **Décision approuvée — validée (porte de sortie du Lot 1, 2026-10-29)** (§ 25.1) *(v7-v8 : « décision approuvée — validation technique en attente » ; v9-v11 : « approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1 », § 21)* | Description de `/catalog/changes`, `/catalog/snapshot`, `pageToken`, 400 `INVALID_PAGE_TOKEN`, 410 `SNAPSHOT_EXPIRED`, `ChangePage`, `SnapshotPage` | Lot 1 (migration, tests T-C3) ; § 12 aligné sur `pageToken` ; **lot 1 bloqué** |
| **C4** | Recherche par `externalOrderId` | **Approuvée, appliquée** | `GET /online-orders/external/{externalOrderId}` | Lot 5 (unicité (liaison, `externalOrderId`), tests) |
| **C5** | Portée `orders:read` | **Approuvée, appliquée** | `Scope` ; `x-required-scopes` des deux lectures ; implication dans `linkToken` | Lot 2 (portées ; `reservations:write` retirée) |
| **C6** | Concurrence des propositions de prix | **Approuvée, appliquée** | Description de `/prices/proposals` ; sens de `PRICE_VERSION_MISMATCH` | § 5.1 ; lot 3 (tests) |
| **C7** | Schémas des événements | **Approuvée, appliquée** — un point bloquant pour le lot 1 (§ 19.3) | `ChangeEventBase`, `ChangeEvent` (`oneOf` + discriminateur), 6 variantes, `ProductImageState` ; `REFERENCE_PRICE` supprimé | Lots 1 et 3 |
| C1 | Limitation de débit, 429 | **Tranchée (v13-D4, § 26.4)** *— v7-v12 : ouverte* | Inchangé : 429 sur 3 opérations, marqué « [Hypothèse] » | Valeurs, stockage des compteurs, calendrier : non décidés |
| C8 | Hypothèses restantes | **Tranchée (v13-D5, § 26.5)**, sauf la durée de conservation des données client (ouverte, lot 5) *— v7-v12 : ouverte, partiellement tranchée en v11* | Inchangé : durée du jeton, `aud`, fenêtre HMAC et déduplication, conservation des clés d'idempotence, limites de lignes et de quantités, `discountPercent`, origine serveur, webhook, données client. **Tranchés en v11 (§ 24)** : devise (ISO 4217, liaison et en-tête de l'instantané, v11-D6) ; `perWarehouse` exposé (v11-D8) | Non décidés ; dépendent aussi de D8, D11 |

### 19.2 C3 — séparation des constats

| Rubrique | Contenu |
|---|---|
| **Décision approuvée** | `seq` attribué à la lecture du flux, sous verrou à lecteur unique, aux seuls événements dont la transaction métier est validée ; `after` = dernier `seq` consommé ; `asOfSeq` fixé à la première page ; `pageToken` opaque, lié à la liaison, 24 h ; 400 si invalide ou d'une autre liaison ; 410 `SNAPSHOT_EXPIRED` si expiré |
| **Mécanisme observé dans le code** (lecture seule, 2026-10-28) | **Aucun.** Pas de module d'intégration, pas de table d'outbox, pas de `seq`, pas de curseur ni d'instantané (recherche `outbox`, `integration_`, `pg_advisory`, `pg_current_xact_id`, `pg_snapshot`, `asOfSeq`, `pageToken`, `cursor` dans `backend/src` : aucun résultat pertinent). Dernière migration : `V046__product_image.sql`. Verrous existants : `SELECT … FOR UPDATE` / `PESSIMISTIC_WRITE` sur des objets métier (caisse, client, produit, inventaire…), sans rapport avec un flux. Le plan v6 prévoyait un `seq bigserial` attribué à l'écriture : c'est précisément la conception exposée au risque (T2 obtient 9, T1 obtient 10, T1 valide, le consommateur passe à 10, T2 valide : 9 est sauté). |
| **Validation technique** | **Faite** : C3 validée (porte de sortie du Lot 1, 2026-10-29), preuves au § 25.1. *v7-v11 : « En attente. Rien à démontrer à partir du code existant ; la sûreté devra être prouvée par l'implémentation du lot 1 et les tests ci-dessous. C3 ne doit pas être déclarée « validée » avant. »* |
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
| **P0** | Conception D = conception détaillée de C3 (§ 20.2) | **[Approuvé]** ; conception D réalisée au lot 1 et C3 validée (porte de sortie du Lot 1, 2026-10-29) (§ 25.1) *(v8 : « C3 reste décision approuvée — validation technique en attente ; lot 1 bloqué » ; v9 : statut et portes reformulés par v9-D3, § 21)* |
| **P1** | `lastSeq` = dernier `seq` examiné (changement de contrat) | **[Approuvé]**, appliqué (OpenAPI, § 12) |
| **P2** | `hasMore` = `EXISTS(seq > lastSeq) OR EXISTS(seq IS NULL)` après attribution (changement de contrat) | **[Approuvé]**, appliqué ; remplace la règle « limite de 1 000 atteinte » de l'étude, inopérante pour un lecteur passé par `SKIP LOCKED` |
| **P3** | Origine de `version` par famille (§ 20.3) | **[Approuvé]** pour le principe ; `CHANNEL_PRICE` et `ONLINE_ORDER_STATUS` **à confirmer** (lots 3-4) |
| **P4** | Clé HMAC dédiée pour `pageToken` (`kid`, format, rotation 24 h, signé non chiffré) | **[Approuvé]** ; secret à créer au lot 1 (§ 15) |
| **P5** | Lot d'attribution 1 000 ; `limit` 100 par défaut, 500 au plus | **[Approuvé]**, valeurs configurables, à confirmer par T-C3-8 |
| **P6** | Image identique ou suppression à vide : ni incrément, ni événement | **[Approuvé]** |
| **P7** | Table `product_image_generation` | **[Approuvé]** ; lève le point bloquant C7 sur le plan documentaire |
| **P8** | Présence de `-pooler` dans l'URL de connexion de l'application | **Règle de déploiement [Approuvé, v11-D12]** : URL de migration (`GESTSTOCK_DB_URL`, `GESTSTOCK_PROVISIONER_DB_URL`) vers l'hôte direct, sans `-pooler` ; pooler réservé au trafic applicatif, sur besoin mesuré ; inscrite à la checklist de déploiement (§ 24.5). *v8-v10 : « Vérification à faire en lecture seule au début du lot 1 » — retirée des vérifications en attente.* |

### 20.2 Conception D (P0)

**Constats [Observé]** : aucun outbox, `seq`, curseur ni instantané ; isolation PostgreSQL par défaut (READ COMMITTED, aucune configuration contraire) ; verrous métier `SELECT … FOR UPDATE` pris dans l'ordre des identifiants (`StockService`, `ProductService`) ; SQL natif déjà utilisé avec JPA ; tests d'intégration sur PostgreSQL 17 (Testcontainers) avec barrières.

**Structures (par base d'entreprise, à créer au lot 1)** : `integration_outbox` (clé `id uuid` (UUID v7) ; `write_id` identity **UNIQUE**, seule clé d'ordre, jamais exposé ; `seq` NULL UNIQUE ; index partiel `seq IS NULL` ; type, `object_id`, `object_version`, opération, charge minimale, `created_at`) ; `integration_feed_state` (clé `uuid` constante, `CHECK` de ligne unique, `last_seq`) — Q1, § 22. *v8-v9 : « `write_id` identity, clé primaire », « `id = 1` », colonne `version`.* Curseur consommateur : tenu par JCMB ; acquittement par liaison (D5) pour la purge seulement.

**Déroulement**

```
Transaction métier                                      [aucun verrou de flux]
  1. modifications métier (verrous existants inchangés)
  2. flush JPA, lecture de la version  ─┐ point d'entrée unique (R1)
  3. INSERT integration_outbox (seq NULL) ┘
  4. COMMIT

Lecture du flux / première page d'instantané — séquenceur, transaction dédiée et courte
  a. SELECT last_seq FROM integration_feed_state FOR UPDATE SKIP LOCKED   (ligne unique, Q1)
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

**P7 [Approuvé]** : `product_image_generation (product_id` clé primaire, référence `product ON DELETE CASCADE`, `generation bigint`, `sha256` nullable, `updated_at)` ; jamais supprimée avec l'image ; `INSERT … ON CONFLICT (product_id) DO UPDATE SET generation = generation + 1 … RETURNING generation` = **première instruction** de la transaction d'image ; compteur, image et événement dans la même transaction ; retrait d'image ⇒ événement `UPSERT` avec `imageSha256 = null`. **Remplissage (Q6)** : la migration crée une ligne par image existante (génération 1, `sha256` de l'image). **P6 [Approuvé]** : empreinte inchangée, ou suppression d'une image inexistante ⇒ ni incrément, ni événement.

### 20.4 Tests d'acceptation du lot 1 — *v8 : aucun n'est écrit ni exécuté ; état au 2026-10-29 : § 24.6*

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
- **Calcul de la purge** : exclusion des liaisons révoquées et traitement des liaisons inactives, pour qu'une liaison qui n'acquitte plus ne bloque pas la purge. *— v17 (2026-11-02) : tranché au § 30.4 ; liaisons révoquées exclues ; une liaison active ou suspendue qui n'acquitte plus bloque la purge, sans exclusion automatique, jusqu'à sa révocation (v17-D4, v17-D5).*

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
| **Sortie du lot 1** | T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 réussis sur PostgreSQL 17 (Testcontainers) | **Non satisfaite** (aucun test écrit ni exécuté). *v12 : satisfaite le 2026-10-29 (§ 25.1).* |
| **Validation de C3** | Prononcée **uniquement** à la sortie du lot 1 | Non prononcée |
| **Lots consommateurs du flux** | Bloqués tant que C3 n'est pas validée | Bloqués. *v12 : débloqués quant à C3 ; exposition HTTP soumise au § 25.4.* |

**Statut de C3** : « **approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1** ». *v12 : « validée (porte de sortie du Lot 1, 2026-10-29) » (§ 25.1).*

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

## 22. Relevé de décisions v10 — 2026-10-28

Source : vérifications préalables du lot 1 en lecture seule (même date) : code et migrations du dépôt backend, `SchemaConventionsIT`, `TenantFlywayStrategy`, `SchemaUpgradeService`, `SecurityConfig`, lint Redocly.

### 22.1 Décisions

| # | Objet | Décision [Approuvé] | Constat qui l'a motivée [Observé] |
|---|---|---|---|
| **Q1** | Clés et colonnes des tables du flux | `integration_outbox` : clé `id uuid` (UUID v7), `write_id bigint identity UNIQUE`, **seule clé d'ordre** ; `integration_feed_state` : clé `uuid` constante et `CHECK` de ligne unique ; colonne `object_version` (le JSON du contrat garde `version`) | `SchemaConventionsIT` exige une clé `pk_<table>` dont la première colonne est `uuid`, et impose les colonnes d'audit à toute table portant une colonne `version` |
| **Q2** | Permissions `integration:*` | Passent au **lot 2** | Utilisées seulement à partir du lot 2 ; `referenceDataIsLoaded` fige 51 permissions |
| **Q3** | Exposition HTTP | **Aucune route HTTP au lot 1** ; services testés directement ; routes aux lots 2-3 derrière l'authentification par liaison | Toute route `/api/**` non déclarée est ouverte à tout utilisateur d'entreprise authentifié (`SecurityConfig.companyUser`) ; § 9 prévoyait déjà l'exposition au lot 3 |
| **Q4** | Numéros de migration | Les documents ne fixent plus de numéro : « numéro attribué à l'implémentation » | Le lot 1 a besoin de deux migrations ; les numéros réservés aux lots suivants seraient décalés |
| **Q5** | Métriques | Jauges Micrometer enregistrées, **aucune exposition nouvelle** (pas d'actuator `metrics` public) ; **log WARN** quand un événement reste sans `seq` au-delà d'un seuil configurable | Seul `health` est exposé aujourd'hui |
| **Q6** | `product_image_generation` existante | Remplie par la migration : génération 1 et `sha256` pour chaque image existante | Images déjà en base depuis `V046__product_image.sql` |
| **Q7** | Contrat | Corrections de lint appliquées (§ 22.4) ; chemin C4 inchangé ; `orderId` contraint en UUID par `pattern` | Redocly : 1 erreur, 26 avertissements |

### 22.2 Contraintes de migration (constat 1.4)
Une nouvelle migration de `db/migration` est jouée, au démarrage (`TenantFlywayStrategy`) ou en arrière-plan (`SchemaUpgradeService`, mode `migrate-on-startup=false`), sur chaque base d'entreprise active, avec le compte propriétaire, puis les droits DML du rôle d'exécution sont accordés. Pendant sa migration, une entreprise est refusée (503) ; un échec ne bloque que cette entreprise ; relance par `POST /api/platform/schema-upgrades` (Super Admin). Aucun retour arrière automatique ; les scripts U sont manuels. D'où, pour le lot 1 : **tables additives uniquement** (aucun `ALTER` sur une table métier), **migrations courtes**, **un script U par script V**, **aucun déploiement avant la porte de sortie du lot 1**.

### 22.3 Plan d'exécution du lot 1 (ordre approuvé)

| Ordre | Étape (numéro du plan) | Contenu | Tests principaux |
|---|---|---|---|
| 1 | 1 | Migration du flux : `integration_outbox`, `integration_feed_state` (ligne unique, repère de purge) ; script U ; `SchemaConventionsIT` mis à jour | Schéma, conventions, rollback |
| 2 | 3 | Point d'entrée unique `IntegrationEvents.publish` (R1) + interrupteur de publication | Événement dans la même transaction ; aucun après annulation ; T-C3-12 |
| 3 | 5 | Séquenceur (transaction dédiée, `SKIP LOCKED`, `lock_timeout` / `statement_timeout`, lots de 1 000) | T-C3-1, T-C3-2 a-d |
| 4 | 6 | Lecture du flux (service) : `after`, `lastSeq`, `hasMore`, `limit`, `CURSOR_EXPIRED`, filtre par liaison en interface | T-C3-7, T-C3-9, T-C3-10, T-C3-14 |
| 5 | 4a | Producteurs `CATEGORY` puis `PRODUCT` (la chaîne complète est d'abord éprouvée avec `CATEGORY`) | Un événement par changement ; T-C3-2 e |
| 6 | 2 + 4b | Migration `product_image_generation` (remplissage Q6) + raccordement de `ProductImageService` (P6, P7) | T-C7-1 à T-C7-6 |
| 7 | 4c | Producteur `AVAILABILITY` dans `StockService.applyMovements` (événements minces) | T-C3-8, T-C3-13 |
| 8 | 7 | Instantané et `pageToken` (HMAC, `kid`, rotation 24 h) | T-C3-3 à T-C3-6, T-C3-11 |
| 9 | 8 | Métriques (Q5) | Valeurs des jauges ; log WARN au-delà du seuil |
| 10 | 9 | Purge en mode simulation, désactivée | La simulation ne supprime rien |
| 11 | 10 | Sortie : suite complète + T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6 sur PostgreSQL 17 (Testcontainers), revue P0, P8 consignée | **Porte de sortie ; validation de C3** |

Chaque étape : une validation (commit) indépendante, suite complète verte avant la suivante. Prérequis de développement non encore levé : **Docker disponible** (Testcontainers, exigé par la porte de sortie). Démarrage du lot 1 : autorisation séparée (v9-D3).

### 22.4 Lint du contrat (Q7)

Corrections appliquées : description de `reason` (`/link/revoke`) entre guillemets (seule erreur) ; `data` déclaré dans `ChangeEventBase` (description seulement) ; `operationId` stable en camelCase sur les 15 opérations et le webhook ; une description par tag ; `info.license.name` « Propriétaire — usage restreint », sans URL ; `orderId` contraint (`format: uuid` + `pattern`), avec documentation de l'impossibilité du conflit avec `/online-orders/external/{externalOrderId}`.

Résultat (`@redocly/cli` 2.72.0, configuration recommandée, sans fichier de configuration) : **0 erreur, 3 avertissements** :

| Avertissement | Justification |
|---|---|
| `no-ambiguous-paths` (`/online-orders/external/{externalOrderId}` et `/online-orders/{orderId}/cancel`) | **Exception documentée** : la règle est structurelle ; `orderId` est contraint en UUID, `external` ne peut pas en être un |
| `info-license-strict` (`url` ou `identifier` attendu) | Conséquence de la décision « sans URL ». Levée possible sans URL par `identifier: LicenseRef-Proprietary` — **non appliqué, à décider** |
| `no-required-schema-properties-undefined` (`data`, dans le `then` de `ChangeEventBase`) | Faux positif : la règle examine le sous-schéma `then` isolément ; `data` est déclaré dans `properties` du même schéma. Levée possible en ajoutant `properties: { data: … }` dans le `then` — **non appliqué, à décider** |

## 23. Constats annexes (hors intégration, backlog)

| # | Constat [Observé] | Suite proposée |
|---|---|---|
| A1 | Routes `/api/**` autorisées par défaut à tout utilisateur d'entreprise authentifié (`SecurityConfig`, `anyRequest().access(companyUser)`) : une route oubliée sans `@PreAuthorize` est ouverte à tous les rôles | Revue de sécurité : refus par défaut, ou test qui exige une règle d'autorisation sur chaque contrôleur *— v13-D6 : pour `/api/integration/v1/**`, chaîne dédiée terminée par `denyAll` ; constat (état des lieux du 2026-10-29) : `EndpointSecurityCoverageIT` exige déjà `@PreAuthorize` ou une déclaration publique sur chaque route `/api/**`* |
| A2 | Réactivation d'une entreprise sans migration : `CompanyService.reactivate` ne déclenche pas de migration ; une entreprise suspendue pendant un déploiement ne serait migrée qu'au démarrage suivant ou à une relance Super Admin | **À vérifier** (lecture du code et essai) |
| A3 | `MigrationRollbackIT` renvoie à `docs/persistence.md` §8, absent du dépôt backend (`docs/` ignoré par Git) | Rétablir le document ou corriger la référence |

## 24. Relevé de décisions v11 — 2026-10-29

Source : réalisation des étapes 1, 3, 5, 6, 4a, 2+4b et 4c du lot 1 (dépôt backend, branche `feat/integration-lot1`) et revues associées. Les décisions sont numérotées v11-D1 à v11-D13.

### 24.1 Décisions

| # | Objet | Décision [Approuvé] | Constat ou motif |
|---|---|---|---|
| **v11-D1** | Réparation de la ligne d'état du flux ; invariant de purge | Si la ligne unique de `integration_feed_state` a disparu : `last_seq = MAX(seq)` et `purged_through_seq = MIN(seq) - 1` sur les événements séquencés ; aucun événement séquencé ⇒ (0, 0). **Invariant de purge : l'événement de plus grand `seq` n'est jamais purgé.** Procédure : § 24.2 | L'ancienne procédure (repère de purge « connu », 0 à défaut) provoquait une perte silencieuse et ne survivait pas à une purge totale (§ 24.2) |
| **v11-D2** | `409 CURSOR_AHEAD` sur `/catalog/changes` | `after` > dernier `seq` attribué ⇒ `409`, code `CURSOR_AHEAD`. Le consommateur **arrête la synchronisation et alerte**, sans resynchronisation automatique ; la reprise passe par la remise à zéro complète côté boutique (v11-D11) | Curseur d'une autre entreprise, ou flux réinitialisé : une page vide silencieuse ferait attendre indéfiniment des `seq` qui ne viendront qu'après un saut |
| **v11-D3** | Deux codes `400` sur `/catalog/changes` | Distingués par le champ `code` d'`ApiError` : `VALIDATION_FAILED` pour une valeur hors bornes (`after` < 0, `limit` hors de 1..500), paramètre fautif dans `errors` ; `INVALID_PARAMETER` pour `after` ou `limit` non numérique, ou `after` absent. Même type de contenu que les autres erreurs (`application/problem+json`) | Codes produits par l'API existante : Bean Validation des paramètres ⇒ `VALIDATION_FAILED` ; conversion impossible ou paramètre manquant ⇒ `INVALID_PARAMETER` (vérifié par test) |
| **v11-D4** | Type d'événement inconnu | Servi tel qu'il est stocké ; le consommateur l'ignore et avance son curseur. Un type inconnu ne bloque jamais le flux | Un type écrit par une version plus récente ne doit pas arrêter la lecture du flux |
| **v11-D5** | `occurredAt` | Informatif : heure de début de la transaction qui a écrit l'événement. L'ordre repose **uniquement** sur `seq` | Deux transactions concurrentes peuvent valider dans l'ordre inverse de leur début |
| **v11-D6** | Devise | `Product.currency` **retiré**. La devise est exposée une seule fois : par la liaison (lot 2) et dans l'en-tête de l'instantané, en code **ISO 4217**, normalisée depuis `platform.company.currency` (`FCFA`, `F CFA`, `XOF` ⇒ `XOF`). Valeur inconnue ⇒ la création de la liaison échoue avec un message explicite. **Partie « devise » de C8 tranchée** | Une même devise répétée dans chaque produit ; libellés locaux non normalisés en base (`FCFA`, `F CFA`, `XOF`) |
| **v11-D7** | Image dans `Product` | `Product.imageSha256` **retiré** : l'état de l'image passe uniquement par `PRODUCT_IMAGE` (`ProductImageState`) | Deux sources pour un même état, avec des versions différentes (`@Version` du produit, génération de l'image) |
| **v11-D8** | `perWarehouse` et périmètre | `perWarehouse` **exposé** (C8 tranché sur ce point). Périmètre des dépôts calculé au moment de servir la page. Au lot 2 : dépôts vendables choisis par liaison et figés à l'autorisation ; par défaut les dépôts `STORE` seulement, `WAREHOUSE` sur option explicite du commerçant. Si l'utilisateur qui a autorisé la liaison perd ses droits, la liaison passe « à revoir » avec une alerte, **sans changement silencieux du périmètre** | Lot 1 : tous les dépôts actifs, `STORE` (point de vente) et `WAREHOUSE` (dépôt de stockage, sans vente) confondus |
| **v11-D9** | Disponibilité modifiée sans mouvement de stock | L'activation et la désactivation d'un dépôt republient la disponibilité (**réalisé**). Les réservations (lot 5) et les changements de périmètre d'une liaison (lots 2-3) feront de même. La réconciliation quotidienne reste le filet de sécurité | Seuls les mouvements de stock publiaient `AVAILABILITY` |
| **v11-D10** | Forme de l'instantané (`SnapshotPage`) | § 24.3 | Reprise sans perte depuis `asOfSeq`, y compris pour les images et la disponibilité |
| **v11-D11** | Retour arrière de V048 (`product_image_generation`) | **Destructif** : les générations repartent à 1 ; ni l'instantané ni le rejeu ne suffisent, à cause de la règle des versions. Il impose une **remise à zéro complète côté JCMB** (oubli des versions locales, puis instantané complet). JCMB doit disposer de cette opération (lot 3), qui sert aussi pour `CURSOR_AHEAD` | Une boutique qui a déjà appliqué une génération supérieure ignorerait les changements d'image jusqu'à ce que le compteur la dépasse |
| **v11-D12** | P8 | **Règle de déploiement** : les URL utilisées par les migrations (`GESTSTOCK_DB_URL`, `GESTSTOCK_PROVISIONER_DB_URL`) pointent vers l'hôte direct, sans `-pooler` ; le pooler n'est envisagé que pour le trafic applicatif, sur besoin mesuré. P8 sort des vérifications en attente et entre dans la checklist de déploiement (§ 24.5) | La conception D n'utilise aucun verrou consultatif de session ; les migrations exigent une connexion directe |
| **v11-D13** | État du lot 1 | § 24.6 ; T-C3-8 : surcoût de 2,2 à 3,3 % après l'insertion groupée, critère satisfait ; **C3 non validée** (étapes 7 à 10 restantes). *v12 : lot 1 terminé, C3 validée (porte de sortie du Lot 1, 2026-10-29) (§ 25).* | — |

### 24.2 Réparation de la ligne d'état du flux (v11-D1)

Si `integration_feed_state` a perdu sa ligne unique, le séquenceur s'arrête : aucun `seq` n'est attribué et les événements restent en attente, sans perte. Recréer la ligne, avec le compte propriétaire de la base de l'entreprise :

```sql
INSERT INTO integration_feed_state (id, last_seq, purged_through_seq)
SELECT '00000000-0000-0000-0000-000000000001', COALESCE(MAX(seq), 0), COALESCE(MIN(seq) - 1, 0)
FROM integration_outbox
WHERE seq IS NOT NULL;
```

- Les `seq` sont contigus (conception D) et la purge supprime les plus petits : le plus petit `seq` restant moins 1 est exactement le repère de purge.
- **Invariant de purge** : l'événement de plus grand `seq` n'est jamais purgé. `MAX(seq)` reste donc disponible même après une purge, et le compteur reprend sans réutiliser un `seq`.
- Aucun événement séquencé (flux jamais lu) : (0, 0).

*Historique — procédure abandonnée (proposée à l'étape 5 du lot 1) : `last_seq = COALESCE(MAX(seq), 0)` et `purged_through_seq` = « dernier repère de purge connu », 0 à défaut. Raisons de l'abandon : (1) un repère remis à 0 fait accepter un curseur antérieur à la purge sans `410 CURSOR_EXPIRED` : les événements purgés entre ce curseur et le vrai repère manquent, **perte silencieuse** ; (2) si tous les événements ont été purgés, `MAX(seq)` est perdu et le compteur repartirait de 0, réutilisant des `seq` déjà servis.*

À aligner dans le dépôt backend à la prochaine étape (non modifié par ce relevé) : la Javadoc de `FeedSequencer` et le message de `IntegrationFeedStateMissingException` décrivent encore la procédure abandonnée ; le commentaire de `U048` recommande un instantané complet, insuffisant selon v11-D11 ; la purge (étape 9) doit appliquer l'invariant.

### 24.3 Forme de l'instantané (v11-D10)

| Élément | Règle |
|---|---|
| En-tête | `asOfSeq` (fixé à la première page, identique sur toutes les pages) ; `currency` (ISO 4217, v11-D6) ; `nextPageToken` (**absent** sur la dernière page ; *v10 : nul*) |
| Sections, dans cet ordre | `categories`, `products`, `productImages`, `availability` |
| `limit` | 200 par défaut, 500 au plus ; compte les objets **toutes sections confondues** ; une page peut chevaucher deux sections ; une section sans objet dans la page est un tableau vide |
| Objets archivés | Inclus (`active: false`) : un consommateur qui refait un instantané complet peut archiver ce qu'il détient encore |
| `productImages` | Un `ProductImageState` par produit, archivés compris ; `version` = génération, ou 0 sans ligne de génération ; `imageSha256` nul si aucune image |
| `availability` | Une `Availability` par produit, archivés compris ; version = `asOfSeq` (aucun champ `version` dans `Availability`) |
| Versions | `@Version` pour `categories` et `products` |
| Reprise | Le consommateur applique la règle des versions à l'instantané comme au flux, puis reprend le flux depuis `asOfSeq` |

### 24.4 Changements du contrat (`integration-v1.openapi.yaml`)

- `Product` : `currency` et `imageSha256` retirés (et de `required`), note dans la description.
- `/catalog/changes` : réponses `400` (deux codes, v11-D3) et `409 CURSOR_AHEAD` ; description de `limit` remplacée ; curseur en avance, type inconnu et rôle de `occurredAt` décrits.
- `ChangeEventBase` : descriptions de `seq`, `type` et `occurredAt` ; `ChangeEvent` : traitement d'un type inconnu.
- `SnapshotPage` : `currency`, `productImages`, `availability`, règle de `limit`, ordre des sections, objets archivés ; `nextPageToken` absent sur la dernière page. `ProductImageState` et `Availability` réutilisés, leurs descriptions complétées (version 0 sans génération ; `perWarehouse` et périmètre).
- `info.description` et `x-decisions.v11` ; P8 sortie de `verificationPending`.

Lint (`@redocly/cli` 2.72.1, `redocly.yaml` et `.redocly.lint-ignore.yaml` du dossier, inchangés) : **0 erreur, 0 avertissement** ; 2 exceptions ciblées, déjà justifiées (§ 22.4) ; YAML valide, toutes les `$ref` résolues.

### 24.5 Checklist de déploiement (v11-D12)

| # | Contrôle | Origine |
|---|---|---|
| P8 | `GESTSTOCK_DB_URL` et `GESTSTOCK_PROVISIONER_DB_URL` désignent l'hôte direct (aucun `-pooler`) | v11-D12 |
| D1 | Scripts officiels de sauvegarde et de vérification exécutés avec succès avant le déploiement | § 18.6 (D1) |
| M1 | Hébergement MongoDB de production confirmé (Atlas ou VPS), sans copie de `MONGODB_URI` | § 18.6 (M1) |

### 24.6 État du lot 1 au 2026-10-29

| Étape (plan) | Contenu | Commits (dépôt backend, `feat/integration-lot1`) | Tests d'acceptation |
|---|---|---|---|
| 1 | Migration du flux (V047, U047) | `50181e9` | Schéma, conventions, rollback |
| 3 | Point d'entrée unique de publication | `73a9331` | T-C3-12 |
| 5 | Séquenceur | `e04a73d` | T-C3-1, T-C3-2 a-c |
| 6 | Lecture du flux ; type inconnu non bloquant | `f506ab2`, `3d3007d` | T-C3-2 d, T-C3-7, T-C3-9, T-C3-10, T-C3-14 (version simplifiée, sans instantané) |
| 4a | `CATEGORY`, `PRODUCT` | `8294b64`, `a0031b4` (détection « rien n'a changé » fondée sur le mappeur) | T-C3-2 e |
| 2 + 4b | `product_image_generation` (V048, U048), `PRODUCT_IMAGE` | `41b39e5`, `97fed44`, `7caebe3` | T-C7-1 à T-C7-6 |
| 4c | `AVAILABILITY`, fournisseur de disponibilité | `879227f` | T-C3-8, T-C3-13 |
| Correctifs | Insertion groupée ; republication par dépôt ; codes d'erreur | `0563af1`, `18799db`, `0f6b008`, `f20335a` | T-C3-8 (nouvelle mesure) |

- **T-C3-8** : surcoût médian des ventes avec publication de 8,5 % et 10,4 % avant l'insertion groupée, puis **2,2 %, 3,3 % et 3,3 %** après (trois exécutions, 200 ventes de 3 lignes par tour, 6 tours alternés) : **critère satisfait**. Écart à noter : la mesure porte sur des ventes de 3 lignes, le critère du § 9 mentionne 10 lignes ; nouvelle mesure à 10 lignes proposée pour la porte de sortie.
- **Restent** : étape 7 (instantané et `pageToken` : T-C3-3 à T-C3-6, T-C3-11, T-C3-14 complet), étape 8 (métriques), étape 9 (purge en simulation, invariant v11-D1), étape 10 (porte de sortie).
- **Porte de sortie : non satisfaite. C3 : non validée.** *v12 : porte satisfaite et C3 validée (porte de sortie du Lot 1, 2026-10-29) (§ 25.1).*

### 24.7 Ce qui n'a pas été fait

Aucun code, migration, test ni configuration modifié par ce relevé ; dépôt backend lu seulement (journal Git) ; aucun commit, push ou déploiement.

## 25. Relevé de décisions v12 — clôture du lot 1, C3 validée — 2026-10-29

Source : porte de sortie du lot 1 (étapes 10 et 10b, vérification en lecture seule puis compléments de tests) et revue des conditions P0. Dépôt backend : branche `feat/integration-lot1`, de `c698f75` (base) à `8e79878` (dernier commit du lot 1). Décisions numérotées v12-D1 à v12-D7.

### 25.1 v12-D1 — C3 validée à la porte de sortie du lot 1

**Statut de C3 : validée (porte de sortie du Lot 1, 2026-10-29).** *Historique : v7-v8 « décision approuvée — validation technique en attente » ; v9-v11 « approuvée — conception détaillée approuvée — validation technique prévue en sortie du lot 1 ».*

Preuves :

- **Suite complète verte deux fois de suite, sans différence** (commit `7d22bdc`) : 251 tests unitaires et 733 tests d'intégration, 0 échec, 2 tests ignorés à dessein (mesure de débit et outil de documentation, lancés explicitement) ; 5 min 10 s puis 4 min 39 s ; mêmes résultats, classe par classe. Après les compléments de tests de l'étape 10b (`8e79878`, tests seulement) : 251 et 835, 0 échec.
- **Matrice complète T-C3-1 à T-C3-14 et T-C7-1 à T-C7-6** (PostgreSQL 17, Testcontainers) :

| Identifiant | Classes de test |
|---|---|
| T-C3-1 | `FeedSequencerIT` |
| T-C3-2 a, c | `FeedSequencerIT` |
| T-C3-2 b | `FeedSequencerIT` (deux séquenceurs) ; `ConcurrentFeedReadersIT` (deux lecteurs du flux, et variante avec un écrivain concurrent) ; `ChangeFeedServiceIT` (lecteur passé par `SKIP LOCKED`) |
| T-C3-2 d | `ChangeFeedServiceIT` |
| T-C3-2 e | `CatalogEventsIT` |
| T-C3-3, T-C3-4 | `SnapshotServiceIT` |
| T-C3-5, T-C3-6, T-C3-11 | `PageTokenCodecTest` ; `SnapshotServiceIT` (jeton d'une autre liaison) |
| T-C3-7, T-C3-9, T-C3-10 | `ChangeFeedServiceIT` ; `RequestParameterValidationTest` (codes des paramètres) |
| T-C3-8 | `AvailabilityThroughputIT` (mesure, lancement explicite) |
| T-C3-12 | `IntegrationArchitectureTest` |
| T-C3-13 | `AvailabilityEventsIT` |
| T-C3-14 | `ChangeFeedServiceIT`, `SnapshotServiceIT`, `OutboxPurgeIT` |
| T-C7-1 à T-C7-6 | `ProductImageEventsIT` |

- **Répétitions** : 100 × T-C3-1 (`FeedSequencerIT.lateCommitRepeated`), 100 × T-C3-2 b séquenceurs (`FeedSequencerIT.concurrentSequencersRepeated`), 100 × T-C3-2 b lecteurs (`ConcurrentFeedReadersIT.twoConcurrentReadersRepeated`) : toutes réussies.
- **T-C3-8 à 10 lignes** (critère du § 9) : surcoût médian des ventes avec publication **0,1 %, 2,0 % et −1,6 %** sur trois exécutions (200 ventes de 10 lignes par tour, 6 tours alternés) ; critère ≤ 10 % satisfait. *Mesures antérieures à 3 lignes : 8,5 % et 10,4 % avant l'insertion groupée, 2,2 % à 3,3 % après.*
- **Revue des conditions P0-1 à P0-6 et des règles R1/R2 : acceptée**, avec une réserve : **P0-5** (le flux lit la base primaire, sans réplica ni cache) n'est vérifiée qu'au niveau du service, faute de route HTTP ; elle devient un critère d'entrée du lot qui crée la route (§ 25.4).

§ 14, critère 2c : **satisfait**.

### 25.2 v12-D2 — Lot 1 terminé, non déployé

Le lot 1 est terminé. **Il n'est pas déployé** : la publication reste désactivée par défaut (`geststock.integration.publish.enabled=false`), et le premier déploiement suit la checklist du § 25.6. Commits `c698f75..8e79878` (22 ; 101 fichiers, 8 732 insertions, 12 suppressions) :

| Commit | Objet |
|---|---|
| `50181e9` | Migration du flux d'événements (outbox, état du flux) |
| `73a9331` | Point d'entrée unique de publication des événements |
| `e04a73d` | Séquenceur du flux d'événements (attribution des `seq`) |
| `f506ab2` | Lecture du flux d'événements (`ChangeFeedService`, sans route HTTP) |
| `3d3007d` | Un type d'événement inconnu ne bloque pas le flux |
| `8294b64` | Publication des événements `CATEGORY` et `PRODUCT` |
| `41b39e5` | Table `product_image_generation` (V048, U048) et remplissage des images existantes |
| `97fed44` | Génération d'image et événements `PRODUCT_IMAGE` (P6, P7) |
| `7caebe3` | Absence de `currency` et `imageSha256` dans la charge `PRODUCT` |
| `a0031b4` | Détection « rien n'a changé » fondée sur le mappeur ; test de stockage indépendant du JDK |
| `879227f` | Événements `AVAILABILITY` et fournisseur de disponibilité |
| `0563af1` | Insertion groupée des événements `AVAILABILITY` |
| `18799db` | Disponibilité republiée quand un dépôt change d'état |
| `0f6b008`, `f20335a` | Codes d'erreur `CURSOR_AHEAD` et validation unifiée du flux (le second documente les deux codes 400) |
| `1164119` | Procédure de réparation et retour arrière alignés sur la v11 |
| `7260855` | Jeton de pagination signé (HMAC, `kid`, rotation) |
| `6b47317` | Instantané cohérent du catalogue (`asOfSeq`) |
| `521f538` | Devise de l'instantané figée à la première page |
| `56cfa3a` | Métriques du flux d'événements (jauges, alerte) |
| `7d22bdc` | Purge du flux (simulation, désactivée par défaut) |
| `8e79878` | Compléments de la porte de sortie (T-C3-2 b lecteurs, T-C3-8 à 10 lignes) |

### 25.3 v12-D3 et v12-D4 — Décisions des étapes 7 à 9 ; publication conditionnée à une liaison active

| # | Objet | Décision [Approuvé] |
|---|---|---|
| v12-D3 a | `pageToken` | Format binaire, signé (HMAC-SHA256, `kid`, numéro de format), base64url **canonique** (aucun bit inutilisé ne peut varier) ; devise figée à la première page et portée par le jeton, comme `asOfSeq` et l'heure de la première page ; longueur maximale mesurée : **158 caractères** (contrat : 512 au plus) |
| v12-D3 b | Produit absent d'une section | Un produit absent des sections `productImages` ou `availability` (créé pendant la pagination, après le passage de ces sections) est dans son **état initial** : pas d'image (version 0), disponibilité 0. Aucun événement n'est publié à la création d'un produit |
| v12-D3 c | Dernière page | La dernière page de l'instantané peut être vide (sections vides, sans `nextPageToken`) |
| v12-D3 d | Purge | Éligibilité par **préfixe contigu** de `seq` (`created_at` n'est pas monotone en `seq`) ; jamais l'événement de plus grand `seq` ni un événement sans `seq` ; rien sans acquittement ; repère jamais en recul. Livrée **désactivée**, en **simulation** |
| v12-D3 e | Métriques | L'âge du plus ancien événement sans `seq` mesure aussi l'absence de lecture (le `seq` n'est attribué qu'à la lecture) : c'est un signal d'anomalie seulement pour une entreprise qui a un consommateur actif |
| **v12-D4** | Publication conditionnée à une liaison active (règle du lot 2) | Une entreprise ne publie que si elle a au moins une liaison active ; à la révocation de la dernière, elle cesse de publier et ses événements non consommés deviennent purgeables. L'instantané de création de liaison couvre l'état antérieur. Raison : sans cette règle, les entreprises sans liaison accumuleraient des événements jamais séquencés ni purgés |

### 25.4 v12-D5 — Critères d'entrée du lot qui expose le flux en HTTP (lots 2-3)

1. **P0-5 vérifiée sur la route** : base primaire, aucun cache, aucun réplica.
2. Tests HTTP des codes `INVALID_PAGE_TOKEN`, `SNAPSHOT_EXPIRED`, `CURSOR_AHEAD`, `CURSOR_EXPIRED`, `VALIDATION_FAILED`, `INVALID_PARAMETER`.
3. Implémentations réelles de `LinkRef`, `ChangeFilter`, `AckSource` et `WarehouseScope` (au lot 1 : identifiant opaque, aucun filtre, aucun acquittement, tous les dépôts actifs).
4. Publication conditionnée à une liaison active (v12-D4).
5. Republication de la disponibilité lors d'un changement de type de dépôt, si le périmètre filtre par type (au lot 1, seule l'activation et la désactivation d'un dépôt la republient).

### 25.5 v12-D6 — Dette rattachée

| Dette | Lot |
|---|---|
| Purge en une transaction par lot de suppression, au lieu d'une seule transaction (verrou de la ligne d'état tenu sur tous les lots aujourd'hui) | Lot 3, avec les acquittements |
| Jauge « dernière mesure réussie » : une base indisponible garde aujourd'hui ses jauges à leur dernière valeur | Branchement de la supervision |
| Opération de remise à zéro complète côté JCMB (v11-D11 ; sert aussi pour `CURSOR_AHEAD`) | Lot 3 |

### 25.6 v12-D7 — Checklist avant le premier déploiement du backend contenant le lot 1

Complète la checklist du § 24.5.

| # | Contrôle |
|---|---|
| D1 | Sauvegardes prouvées : scripts officiels de sauvegarde et de vérification exécutés avec succès (§ 18.6) |
| M1 | Hébergement MongoDB de production confirmé (§ 18.6) |
| P8 | `GESTSTOCK_DB_URL` et `GESTSTOCK_PROVISIONER_DB_URL` désignent l'hôte direct, sans `-pooler` (v11-D12) |
| Clé `pageToken` | Clé de production de signature des `pageToken` définie (`current-kid` et sa clé, 32 octets au moins, par l'environnement) ; sinon `ProductionSafetyCheck` refuse le démarrage si la publication est activée |
| Publication | `geststock.integration.publish.enabled` laissée à `false` jusqu'au lot 2 (métriques et purge également désactivées par défaut) |

Note : au premier démarrage, V047 et V048 s'appliquent à toutes les bases d'entreprise (tables additives, migrations courtes, remplissage des générations d'image) ; chaque entreprise répond 503 pendant sa propre migration (§ 22.2).

### 25.7 Changements du contrat (`integration-v1.openapi.yaml`)

- `/catalog/snapshot` et `SnapshotPage` : produit absent des sections `productImages` ou `availability` = état initial ; dernière page possiblement vide, sans `nextPageToken`.
- `info.description`, description de `/catalog/changes` et `x-decisions` : statut de C3 « validée (porte de sortie du Lot 1, 2026-10-29) » ; bloc `x-decisions.v12`. Aucune autre modification de schéma.

Lint (`@redocly/cli` 2.72.1, `redocly.yaml` et `.redocly.lint-ignore.yaml` du dossier, inchangés) : **0 erreur, 0 avertissement** ; 2 exceptions ciblées, déjà justifiées (§ 22.4) ; YAML valide, toutes les `$ref` résolues.

### 25.8 Ce qui n'a pas été fait

Aucun code, migration, test ni configuration modifié par ce relevé ; dépôt backend lu seulement (journal Git) ; aucun commit, push ou déploiement.

## 26. Relevé de décisions v13 — hébergement réel, C1 et C8, préparation du lot 2 — 2026-10-29

Source : état des lieux en lecture seule du 2026-10-29 (JCMB : backend `6e5cdbd`, frontend `8365146` ; GestStock : backend `8e79878`) et décisions du responsable. Décisions numérotées v13-D1 à v13-D8.

**Applications déployées : aucun effet.** Ce relevé ne modifie aucun dépôt applicatif, aucune configuration ni aucun hébergement. Il ne retire rien dont les deux applications en service dépendent : les routes d'intégration n'existent pas encore, la publication du lot 1 reste désactivée par défaut, et le webhook retiré n'avait jamais été implémenté. Les constats « périmés » côté JCMB (§ 26.1) sont seulement consignés ; aucun fichier n'y est retiré.

### 26.1 v13-D1 — Hébergement réel (fait communiqué par le responsable)

| Application | Frontend | Backend | Base |
|---|---|---|---|
| GestStock | Angular sur Render | Spring Boot sur **Vercel** (serverless) | **Neon** (PostgreSQL) |
| JeCréeMaBoutique | Angular sur Render | Next.js sur un **VPS** (Docker, déployé par `.github/workflows/deploy.yml`) | **MongoDB Atlas** |

Constats périmés, consignés sans modification de JCMB :

- `vercel.json` du backend JCMB (région `cdg1`, `crons: []`) ;
- la mention « production sur Vercel » du document stratégique JCMB 01 (§ 2) ;
- les restes Render du backend et du frontend JCMB (`cloudflare-worker.js`, `nginx-og.conf`, `proxy.conf.json`, `shareBaseUrl` de `environment*.ts`). **Ne pas les retirer sans vérifier qu'aucun partage ni aucune redirection n'en dépend encore** : hors du périmètre de ce plan.

Effets dans ce document : D7 (Atlas confirmé, offre ouverte), D8 (hébergeurs confirmés, URL à fixer), D9 (tranchée), § 1, § 13.1 ; notes datées v13 ajoutées, texte antérieur conservé.

### 26.2 v13-D2 — Conséquences de l'hébergement

| Sujet | Décision |
|---|---|
| Backend GestStock sur Vercel | **Aucun processus permanent.** Les tâches `@Scheduled` du lot 1 (`FeedMetricsJob`, `OutboxPurgeJob`) ne sont pas fiables en production ; elles restent désactivées par défaut (inchangé). À concevoir au lot 2 ou 3 : un **cron Vercel** qui appelle une **route interne protégée** (authentification dédiée, propre au cron, jamais publique, distincte des jetons utilisateurs et des jetons de liaison), avec un traitement **court** (borné en durée et en volume) et **repris** en cas d'interruption (état en base, opération rejouable sans effet en double) |
| Compteurs en mémoire | **Exclus** en production (limitation de débit, état des tâches). Les jauges du lot 1, calculées par instance, ne sont pas une source fiable sur Vercel ; leur exposition est à revoir avec la route interne (dette, § 26.10) |
| Neon | Hôte **direct** pour les migrations (P8, inchangée). Pour le trafic applicatif, le **pooler devient recommandé**, à cause du nombre d'instances serverless. La conception D est compatible avec un pooler en mode transaction : `SET LOCAL`, verrous de ligne (`FOR UPDATE SKIP LOCKED`), aucun verrou consultatif ni état de session. **À vérifier avant le premier déploiement** : le comportement des requêtes préparées via le pooler Neon (checklist N1, § 26.9) |
| Backend JCMB sur VPS | Processus permanent possible ; **IP de sortie fixe** (utilisée par la liste blanche facultative, v13-D5) |

### 26.3 v13-D3 — Déclenchement de la consommation ; webhook retiré

- **Consommateur** : conteneur dédié sur le VPS JCMB (service distinct du conteneur Next.js en service, ajouté au lot 3).
  - Lit le flux toutes les **30 à 60 s** (configurable).
  - Garde son jeton de liaison **en mémoire** (15 min, v13-D5).
  - Traite **une page à la fois** et enregistre `lastSeq` après chaque page ; si `hasMore` est vrai, il rappelle immédiatement.
  - La récupération des images se fait dans un **traitement séparé**.
- **Webhook GestStock → JCMB : retiré de la v1.**
  - La fenêtre HMAC, la déduplication par `eventId` et le secret HMAC par liaison sont sans objet en v1.
  - Une notification sans données pourra être ajoutée plus tard, sans changer la règle « synchronisation tirée ».
- **Effets** : délais du § 8 (la notification ≤ 1 min est remplacée par l'intervalle d'interrogation) ; D6 (seuil de disponibilité périmée) à fixer au regard de cet intervalle.

### 26.4 v13-D4 — C1 tranchée : limitation de débit

| Élément | Décision |
|---|---|
| Stockage | Compteurs en **fenêtre fixe** dans la **base plateforme** de GestStock (PostgreSQL) ; aucune nouvelle dépendance ; table à créer au lot 2 (nom non fixé) |
| `/oauth/token` | **10/min par identifiant client et par IP** (deux compteurs, les deux doivent être respectés) |
| `/catalog/changes` | **120/min par liaison** |
| `/catalog/snapshot` | **60/min par liaison** |
| Création de commande (`POST /online-orders`) | **60/min par liaison** |
| `/oauth/par` *(v14, complément)* | **30/min par client** |
| `/link/secret` *(v14, complément)* | **5/h par liaison** |
| Valeurs | De départ, **configurables** |
| Dépassement | `429`, `code = RATE_LIMITED`, en-tête `Retry-After` (secondes) obligatoire |
| Compteurs indisponibles | **Refus** : `503`, `code = RATE_LIMIT_UNAVAILABLE` ; jamais de laisser-passer |
| Calendrier | `/oauth/token` au lot 2 ; les autres routes avec leur lot (flux et instantané : lots 2-3, avec leurs routes HTTP ; commandes : lot 5) |

Choix ajoutés par ce relevé, dans le cadre de la décision : noms des codes `RATE_LIMITED` et `RATE_LIMIT_UNAVAILABLE`. **À vérifier au lot 2** : l'en-tête qui porte l'IP du client derrière le proxy Vercel, seul fiable pour le compteur par IP.

### 26.5 v13-D5 — C8 tranchée (sauf la conservation des données client)

| Point | Décision |
|---|---|
| Jeton d'accès | `client_credentials` ; **JWT de 15 min** ; `aud = geststock-integration` ; **émetteur et type distincts** de ceux des jetons utilisateurs (valeurs fixées au lot 2) ; **clé de signature distincte** ; statut de la liaison contrôlé à chaque appel (révocation immédiate, C2). Un jeton d'utilisateur est refusé par la chaîne d'intégration, un jeton de liaison par la chaîne principale |
| Secret de liaison | Généré par GestStock à la création de la liaison, **affiché une seule fois** ; **haché** côté GestStock ; **chiffré** côté JCMB (AES-GCM) avec une clé propre à l'intégration, présente seulement dans l'environnement du VPS, jamais dans Git ni dans MongoDB. **Rotation** : deux secrets valides pendant la transition (déclenchement et durée de la transition : lot 2) |
| Idempotence | Création de commande : **clé naturelle (liaison, `externalOrderId`)** (C4), sans `Idempotency-Key` ; autres écritures : `Idempotency-Key` **conservée 7 jours** |
| Limites de commande (GestStock) | **100 lignes** au plus, **quantité ≤ 9 999**, toujours au-delà des limites de JCMB (50 lignes, quantité 999) |
| `discountPercent` | **Retiré de la v1.** JCMB envoie le prix unitaire effectivement facturé ; le prix de référence reste du côté de GestStock |
| Données client | Nom et téléphone **obligatoires** ; adresse **seulement pour une livraison** ; **pas d'e-mail** |
| Conservation des données client | **Ouverte** : à fixer au lot 5 (D11). **Seul point de C8 encore ouvert** |
| Origine serveur | Liste blanche **facultative** de l'IP du VPS JCMB sur la chaîne d'intégration, activable par configuration, **en plus** de l'authentification |
| Déjà tranchés | Devise (v11-D6) ; `perWarehouse` (v11-D8) |
| Webhook (fenêtre HMAC, déduplication) | Sans objet en v1 (v13-D3) |

Forme retenue pour les données client dans le contrat :

- `customer` obligatoire, `{ name, phone }` obligatoires, aucun autre champ.
- **`delivery` obligatoire** : soit `{ mode: pickup }` sans adresse, soit `{ mode: delivery, address }` avec adresse. Aucune version de JCMB n'appelle encore `POST /online-orders` : aucune compatibilité à préserver.

Idempotence de `POST /online-orders` :

- Un **renvoi identique** du même `externalOrderId` (même corps) renvoie la commande déjà créée, avec **le même statut et le même corps que la première réponse**, sans en créer de seconde.
- `409 IDEMPOTENCY_KEY_REUSED` ne concerne que le même `externalOrderId` envoyé avec un **corps différent**.

*Première rédaction v13 : `delivery` facultatif (anciennes versions de l'application JCMB sans mode de livraison) ; s'il est présent, soit `{ mode: pickup }` sans adresse, soit `{ mode: delivery, address }` avec adresse. Renvoi identique en `200`.*

### 26.6 v13-D6 — Sécurité côté GestStock pour le lot 2

- **Chaîne dédiée** :
  - `SecurityFilterChain` dédiée à `/api/integration/v1/**`, en ordre prioritaire ;
  - authentification de liaison, puis une règle par portée, puis **`denyAll`** ;
  - `/oauth/token` seul ouvert sans jeton de liaison (authentification Basic du client).
- **Entreprise courante** : définie par la liaison (`company.id`), **jamais** par la requête ni par `company.code`.
- **Stockage** :
  - registre des liaisons dans la **base plateforme** (nécessaire pour résoudre l'entreprise avant tout contexte) ;
  - état du flux dans la base de l'entreprise (déjà en place : `integration_feed_state`).
- **Garde-fou de build** : extension d'`EndpointSecurityCoverageIT` pour exiger une **portée déclarée** sur chaque route d'intégration.
- **Portées et permissions** :
  - les portées du contrat (`catalog:read`, `orders:read`, `orders:write`, et les autres portées du schéma `Scope`) sont **distinctes** des permissions utilisateur ;
  - `integration:manage` est une **permission utilisateur** (créer ou révoquer une liaison) ;
  - son ajout passe par une migration du catalogue (51 permissions aujourd'hui) et la mise à jour des tests du catalogue et de la matrice des rôles ;
  - attribution au-delà d'ADMIN : à décider au lot 2.
- **Audit** :
  - création, révocation, rotation du secret, échecs d'authentification ;
  - avec une représentation d'auteur pour un appelant machine (la liaison).
- **Constat A1 (§ 23)** : cette chaîne y répond pour les routes d'intégration.

### 26.7 v13-D7 — JeCréeMaBoutique : comportement existant conservé

Décision du responsable : **aucun correctif de JCMB n'est planifié au lot 3**. Comportements conservés, relevés par l'état des lieux du 2026-10-29 (chemins dans `backend-gestion-boutique`) :

| Gravité | Comportement conservé | Référence |
|---|---|---|
| Élevée | Commande sans contrôle ni décrément du stock (seul `inStock` est lu) — **remplacé au lot 5 par la réservation GestStock** | `services/order.service.ts:48` |
| Élevée | Limitation de débit qui **laisse passer** si MongoDB est en erreur | `lib/tracking-guard.ts:54-56` |
| Élevée | Middleware : présence du Bearer seulement, vérification dans chaque handler ; préfixe public `/api/orders` couvrant aussi `PATCH /api/orders/[id]` | `middleware.ts:33-45, 120-122` |
| Moyenne | `isActive` non contrôlé à la création de commande (seul `banned` l'est) | `app/api/orders/route.ts` |
| Moyenne | Transitions de statut de commande libres | `services/order.service.ts` (`updateOrderStatus`) |
| Moyenne | CORS : origine par défaut `http://localhost:4200` avec `credentials` si `FRONTEND_URL` est absent | `next.config.mjs:16-26` |
| Moyenne | IP du client prise dans `x-forwarded-for` si `x-real-ip` est absent | `lib/tracking-guard.ts:32-34` |
| Moyenne | Champ `image` du produit : data URI ou URL externe sans limite de taille | `validators/product.validator.ts:10`, `lib/safe-url.ts:26-38` |
| Moyenne | Clé Swagger passée dans l'URL | `app/api/swagger/route.ts:9` |
| Faible | `/api/health` expose les slugs du cache OG, l'environnement et la mémoire | `app/api/health/route.ts:43-59` |
| Faible | Secret d'invalidation OG comparé sans temps constant | `app/api/og/invalidate/route.ts:11` |
| Faible | `Access-Control-Allow-Origin: *` sur `/api/og/*` (images publiques) | `next.config.mjs:35`, `vercel.json` |
| Faible | Type MIME de l'upload déclaré par le client (ré-encodage Cloudinary) | `app/api/upload/route.ts:77` |
| Faible | Devise « FCFA » écrite en dur dans la notification | `services/order.service.ts:86` |
| Faible | Suppression physique des produits, et des produits d'une catégorie supprimée | `services/product.service.ts:41-49` |

**Règle pour le code d'intégration ajouté dans JCMB** :

- il ne s'appuie sur **aucun** de ces comportements ;
- le consommateur et les routes d'intégration ont leurs **propres contrôles** : authentification vérifiée dans la route elle-même, limitation qui refuse en cas de panne, aucune IP lue dans un en-tête non fiable, statuts gardés, validation des tailles.

### 26.8 v13-D8 — Risques acceptés par le responsable (2026-10-29)

| Risque | Gravité | État |
|---|---|---|
| Secrets possiblement valides dans l'historique public de JCMB (commits `a2ecef2` et `31eb647`, fichier `.env.example`, supprimé en `805d1b0`) ; changement des secrets **non effectué** | Critique | **Accepté le 2026-10-29** |
| MongoDB du `docker-compose.yml` exposé sur le port 27017 sans authentification ; non vérifié sur le VPS | Critique si ce fichier sert en production, sinon faible | **Accepté le 2026-10-29** |

Atténuation pour l'intégration :

- clé de chiffrement des secrets de liaison **nouvelle** et propre à l'intégration (v13-D5) ;
- **aucun secret d'intégration ne réutilise un secret existant de JCMB** (`JWT_SECRET`, `MONGODB_URI`, clés Cloudinary, VAPID, Resend…) ;
- ces risques restent listés dans la checklist de déploiement (§ 26.9).

### 26.9 Checklist de déploiement consolidée

Complète et reprend les §§ 24.5 et 25.6.

| # | Contrôle | Origine |
|---|---|---|
| D1 | Sauvegardes prouvées : scripts officiels de sauvegarde et de vérification exécutés avec succès | § 18.6 |
| M1 | Hébergement MongoDB de production : **Atlas**, confirmé par le responsable ; offre et sauvegardes à vérifier (D7) | § 18.6, v13-D1 |
| P8 | `GESTSTOCK_DB_URL` et `GESTSTOCK_PROVISIONER_DB_URL` désignent l'hôte direct, sans `-pooler` | v11-D12 |
| N1 | **Avant d'utiliser le pooler Neon pour le trafic applicatif** : comportement des requêtes préparées via le pooler vérifié (essai hors production) | v13-D2 |
| Clé `pageToken` | Clé de production de signature des `pageToken` définie par l'environnement ; sinon `ProductionSafetyCheck` refuse le démarrage si la publication est activée | v12-D7 |
| Publication | `geststock.integration.publish.enabled` à `false` jusqu'au lot 2 ; métriques et purge désactivées | v12-D7 |
| T1 | Tâches `@Scheduled` du lot 1 laissées désactivées en production tant que le cron Vercel et la route interne ne sont pas livrés | v13-D2 |
| K1 | Clé de signature des jetons de liaison distincte de celle des jetons utilisateurs, fournie par l'environnement (lot 2) *— v14 : précisé au § 27.7* | v13-D5 |
| K2 | Clé de chiffrement des secrets de liaison côté JCMB nouvelle, propre à l'intégration, seulement dans l'environnement du VPS *— v14 : `GESTSTOCK_LINK_ENCRYPTION_KEY`, précisé au § 27.7* | v13-D5, v13-D8 |
| R1 | Secrets possiblement valides dans l'historique public de JCMB — **risque accepté le 2026-10-29** | v13-D8 |
| R2 | MongoDB du `docker-compose.yml` exposé sur 27017 sans authentification — **risque accepté le 2026-10-29** | v13-D8 |

### 26.10 Préparation du lot 2 : ce qui découle de ces décisions

Ce qui suit découle de décisions approuvées ; rien n'est commencé.

1. **Registre des liaisons** dans la base plateforme ; création (code d'autorisation), révocation (C2), lecture de la liaison ; devise de la liaison (v11-D6) ; dépôts vendables (v11-D8).
2. **`/oauth/token`** : `client_credentials`, JWT de 15 min, clé distincte, secret haché, rotation, limitation de débit (v13-D4).
3. **Chaîne de sécurité dédiée**, garde-fou de build, permission `integration:manage`, audit, liste blanche d'IP facultative (v13-D6, v13-D5).
4. **Publication conditionnée à une liaison active** (v12-D4) et critères d'entrée des routes HTTP du flux (§ 25.4).
5. **Conception** du cron Vercel et de la route interne (métriques, purge), si elle n'est pas renvoyée au lot 3 (v13-D2).

Dette rattachée (complète le § 25.5) :

| Dette | Lot |
|---|---|
| Exposition des métriques du flux sans dépendre de jauges en mémoire par instance | Lots 2-3, avec la route interne |
| Restes Render et `vercel.json` périmés dans JCMB (à vérifier avant tout retrait) | Hors plan, décision du responsable |

### 26.11 Changements du contrat (`integration-v1.openapi.yaml`)

- **Webhook** `geststockChangesAvailable` retiré (route, schéma du corps, signature HMAC) ; note en commentaire et dans `x-decisions.v13`. Principes de `info` : synchronisation par interrogation.
- **`OnlineOrderRequest`** :
  - `discountPercent` retiré ;
  - `lines` : `maxItems` 100 (inchangé) ; `quantity` ≤ 9 999 (*v12 : 100 000*) ;
  - `customer` obligatoire, `name` et `phone` obligatoires, aucun autre champ ;
  - `delivery` **obligatoire** : `pickup` sans adresse, ou `delivery` avec adresse ;
  - `unitPrice` décrit comme le prix effectivement facturé.
- **`POST /online-orders`** :
  - idempotence par (liaison, `externalOrderId`), en-tête `Idempotency-Key` retiré de cette opération ; renvoi identique : même statut et même corps que la première réponse, sans seconde commande (réponse `200` « rejouée » retirée) ;
  - `409` décrit pour ce cas ;
  - limites décrites.
- **Limitation de débit** :
  - `TooManyRequests` : `Retry-After` obligatoire, mention « hypothèse » retirée ;
  - `429` sur `/oauth/token`, `/catalog/changes`, `/catalog/snapshot` (ajouté) et `POST /online-orders`, avec la limite propre à chaque route ;
  - nouvelle réponse `RateLimitUnavailable` (`503`) sur ces quatre opérations.
- **`linkToken`** : 15 min, `aud = geststock-integration`, émetteur, type et clé distincts, statut vérifié à chaque appel, rotation du secret, liste blanche d'IP facultative. `TokenResponse.expires_in` : exemple 900.
- **`IdempotencyKey`** : conservation 7 jours (*v12 : 90 jours, en hypothèse*).
- **`info`, `servers` et `x-decisions`** :
  - `info.description` et `x-decisions` : C1 et C8 approuvées ; ouvert : conservation des données client ;
  - bloc `x-decisions.v13` ajouté ;
  - description de `servers` : backend GestStock sur Vercel, URL de production à fixer (D8).

Lint (`@redocly/cli` 2.72.1, `redocly.yaml` et `.redocly.lint-ignore.yaml` du dossier, **inchangés**) :

- **0 erreur, 0 avertissement** ;
- 2 exceptions ciblées, déjà justifiées (§ 22.4) ;
- YAML valide, toutes les `$ref` résolues (déréférencement complet sans reste) ;
- aucun webhook ; `discountPercent` ne subsiste que dans l'historique.

### 26.12 Ce qui n'a pas été fait

- Aucun code, migration, test ni configuration modifié par ce relevé.
- Dépôts JCMB et backend GestStock lus seulement.
- Aucun commit, push ou déploiement.

## 27. Relevé de décisions v14 — décisions du lot 2 — 2026-10-29

Source : plan d'exécution du lot 2 du 2026-10-29 (lecture seule des quatre dépôts : GestStock backend `8e79878`, gestion-stock `65a8db6`, JCMB backend `6e5cdbd`, JCMB frontend `8365146`), questions Q1 à Q14 tranchées par le responsable. Décisions numérotées v14-D1 à v14-D18.

**Applications déployées : aucun effet.** Ce relevé ne modifie que ce document et le contrat. Les routes décrites n'existent pas encore ; elles arriveront derrière des interrupteurs désactivés par défaut (§ 27.6).

### 27.1 Décisions

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **v14-D1** | Parcours de liaison | Demande d'autorisation déposée **de serveur à serveur** (PAR, RFC 9126) : `POST /oauth/par`, authentification Basic du client JCMB, `request_uri` à usage unique valable **10 min**, comme le `state` JCMB (la personne GestStock doit pouvoir se connecter ; le `request_uri` reste à usage unique, lié au client JCMB et inutilisable sans le vérificateur PKCE ; *première rédaction : environ 90 s*) ; limite de débit de `/oauth/par` : **30/min par client** (v13-D4 complété). Retour par une **page Angular JCMB protégée**, qui transmet `code` et `state` à une route backend authentifiée par Bearer, nettoie l'URL (`history.replaceState`) et applique `Referrer-Policy: no-referrer`. Parcours en 5 étapes : § 27.2. **Contradictions C-A (route de retour backend sans authentification) et C-B (paramètres d'autorisation falsifiables) résolues** |
| **v14-D2** | Unicité | Une boutique liée à **une seule** entreprise à la fois ; une entreprise peut avoir **plusieurs** boutiques. Index unique partiel côté boutique sur les liaisons non révoquées. **Liaisons `PENDING` expirées** : toute nouvelle demande d'autorisation (PAR) pour la même boutique fait passer, dans la même transaction et **avant** le contrôle d'unicité, ses liaisons `PENDING` au code expiré à `REVOKED` (motif `EXPIRED`) ; nettoyage global au lot 3 (cron) |
| **v14-D3** | Identifiants | **Deux niveaux** : client JCMB par environnement (HTTP Basic) et secret par liaison. v13-D5 est précisé en ce sens : le « secret client » de v13-D5 désigne le **secret de liaison**. **Contradiction C-C résolue** |
| **v14-D4** | Jeton de liaison | `iss = geststock-integration` ; claim `typ = integration` ; en-tête JOSE `typ = at+jwt` (RFC 9068) |
| **v14-D5** | Hachage du secret de liaison | SHA-256, comparaison en temps constant |
| **v14-D6** | Rotation | `POST /link/secret`, de serveur à serveur, avec le jeton de la liaison ; ancien secret valide jusqu'au **premier usage du nouveau**, **24 h au plus** ; limite de débit : **5 rotations par heure et par liaison** (v13-D4 complété). **Secret compromis : révocation de la liaison puis nouvelle liaison, pas la rotation** (la rotation garde l'ancien secret valide jusqu'au premier usage du nouveau, 24 h au plus) |
| **v14-D7** | Permissions | `integration:manage` pour **ADMIN uniquement** (52 permissions) ; `integration:price-approve` introduite au lot qui l'utilise (lot 3). *Remplace, pour le lot 2, l'introduction des deux permissions prévue au § 9 (Q2).* |
| **v14-D8** | IP réelle | Un **seul en-tête configurable posé par Vercel**, à vérifier sur un déploiement de prévisualisation avec un `X-Forwarded-For` falsifié ; **jamais** `X-Forwarded-For` brut sur la chaîne d'intégration. JCMB appelle GestStock **directement sur Vercel**, jamais à travers le relais nginx de Render. Vérification ajoutée à la checklist (I1, § 27.7) |
| **v14-D9** | Retour arrière de la base plateforme | `db/platform-rollback/U00x`, avec un test V → U → V |
| **v14-D10** | Suspension | Statut `SUSPENDED` avec un motif (`MANUAL`, `AUTHORIZER_LOST_ACCESS`) ; réactivation par une personne disposant de `integration:manage`, qui **reconfirme les dépôts** ; pendant la suspension, `403 LINK_SUSPENDED` partout sauf `GET /link` et `POST /link/revoke` ; la **publication continue** |
| **v14-D11** | Drapeau de publication | Dans la **base de l'entreprise** (colonne de `integration_feed_state`), posé dans la transaction d'activation de la liaison, retiré à la révocation de la dernière liaison de l'entreprise (met en œuvre v12-D4) |
| **v14-D12** | `redirect_uri` | Exacte par environnement : domaine réel du frontend JCMB ; `localhost` seulement en développement et en essai |
| **v14-D13** | Boutiques éligibles | Liaison refusée pour une boutique JCMB non approuvée (`isActive = false`) ou bannie, et pour le rôle `admin` de JCMB |
| **v14-D14** | Code rejoué | Refusé, et la liaison qu'il a créée est **révoquée** (motif `CODE_REPLAYED`). **Motif de révocation** (`revocationReason`), renseigné dès que la liaison est révoquée et nul seulement avant : `SHOP_REQUEST` (révocation demandée par la boutique, C2), `GESTSTOCK_ADMIN` (révocation par une personne disposant de `integration:manage`), `CODE_REPLAYED` (code rejoué), `EXPIRED` (liaison `PENDING` au code expiré, v14-D2). Évolution sans rupture : le consommateur **tolère une valeur inconnue** |
| **v14-D15** | Angular GestStock | URL de retour après connexion limitée aux **chemins internes** (aucune redirection ouverte) |
| **v14-D16** | Route interne du cron Vercel | **Lot 3** (aucune tâche planifiée nécessaire au lot 2 : codes, demandes et compteurs expirent par horodatage et se nettoient à l'écriture) |
| **v14-D17** | Noms des interrupteurs et variables | Noms Q14 acceptés : § 15 et § 27.6 ; checklist K1, K2 (§ 27.7) |
| **v14-D18** | Ordre des étapes | GestStock : G1, G2, G5, G6, G3, G7, G8 + G9, G10, G4, G11, G12, G13, G14, puis GA1 et GA2. JCMB : J1 et J2 en parallèle (GestStock simulé), puis J3, J4 et JA1 après G8. Déploiement : § 27.8 |

### 27.2 Parcours de liaison (v14-D1)

| # | Qui agit | Application | Requête |
|---|---|---|---|
| 1 | Propriétaire de la boutique (rôle `user`, boutique approuvée et non bannie, v14-D13) | Angular JCMB → backend JCMB → API GestStock | `POST /api/integrations/geststock/start` (Bearer). Le backend JCMB crée `state` (haché, 10 min, lié à la boutique) et le vérificateur PKCE (conservé côté serveur), puis dépose la demande : `POST /api/integration/v1/oauth/par` (Basic du client JCMB) avec `shop_id` (= `User._id`), `shop_name`, `redirect_uri`, `code_challenge` (S256), `scope`, `state`. Il reçoit `request_uri` (10 min, usage unique) et renvoie à Angular l'URL `<frontend GestStock>/integrations/jecreemaboutique/authorize?client_id=…&request_uri=…` |
| 2 | Personne GestStock connectée, `integration:manage` | Angular GestStock → API GestStock (chaîne principale) | Lecture de la demande : boutique, client, portées, dépôts accessibles (STORE cochés par défaut), devise normalisée (v11-D6 ; devise inconnue ⇒ refus explicite). Aucun paramètre de l'URL du navigateur n'est pris en compte en dehors de `client_id` et `request_uri`. Connexion préalable : retour limité aux chemins internes (v14-D15) |
| 3 | La même personne | Angular GestStock → API GestStock | Approbation : liaison créée en `PENDING`, dépôts figés (v11-D8), code émis (256 bits, haché, 5 min, usage unique, lié à l'entreprise, au client, à la demande, à sa `redirect_uri` et au défi PKCE) ; redirection vers `redirect_uri?code=…&state=…`. Refus : `error=access_denied&state=…`. Le `request_uri` ne sert qu'à une décision |
| 4 | Propriétaire de la boutique | Page Angular JCMB protégée → backend JCMB → API GestStock | La page (`AuthGuard`) envoie `code` et `state` à `POST /api/integrations/geststock/complete` (Bearer), nettoie l'URL (`history.replaceState`), `Referrer-Policy: no-referrer`. Le backend vérifie que `state` appartient **à la boutique authentifiée** (usage unique), puis appelle `POST /oauth/token` (`authorization_code`, Basic, `code_verifier`) |
| 5 | GestStock, puis backend JCMB | API GestStock → backend JCMB | Liaison `PENDING` → `ACTIVE`, drapeau de publication posé dans la même transaction (v14-D11). Réponse : liaison et secret de liaison (une seule fois ; empreinte SHA-256 côté GestStock ; chiffré AES-GCM côté JCMB). JCMB ne renvoie à Angular que le statut, le nom et le code de l'entreprise. Ensuite : `client_credentials` (Basic + `link_id` + `link_secret`) ⇒ JWT de 15 min |

Exigences du cahier des charges : autorisation explicite des deux côtés (`integration:manage` ; propriétaire authentifié aux étapes 1 et 4) ; jamais par e-mail, nom ou slug (`shop_id = User._id`, entreprise = celle de la personne connectée) ; code à usage unique, court, rejeu refusé avec révocation (v14-D14) ; redirection comparée à l'identique (v14-D12) ; boutique affichée telle que déposée par le serveur JCMB authentifié ; aucun secret dans Angular ; unicité (v14-D2). **Toutes satisfaites par le parcours.**

### 27.3 Choix ajoutés par ce relevé (dans le cadre des décisions)

| Choix | Motif |
|---|---|
| La liaison est créée en `PENDING` à l'approbation et passe `ACTIVE` à l'échange du code | Donne un sens au statut `PENDING` du contrat et permet v14-D14 (révoquer la liaison créée par un code rejoué) ; le drapeau de publication n'est posé qu'à l'activation |
| Boutique déjà liée : refus dès `POST /oauth/par` (`invalid_request`), l'index unique partiel restant la garantie finale | Évite qu'une personne GestStock approuve une demande vouée à l'échec |
| `POST /link/secret` sans `Idempotency-Key` ; un nouvel appel remplace le secret en attente | Rejouer la réponse obligerait à conserver le secret en clair ; l'ancien secret reste valide si la réponse est perdue. Exception justifiée à la règle « autres écritures : `Idempotency-Key` » (v13-D5) |
| `POST /link/secret` refusé en `SUSPENDED` (`403 LINK_SUSPENDED`) | Application littérale de v14-D10 |
| Champs de la demande PAR : `shop_id`, `shop_name` (affichage seulement), `state` de 32 à 512 caractères | Forme minimale ; aucun slug ni e-mail |

### 27.4 Étapes du lot 2 (ordre v14-D18)

Chaque étape : un commit, tests écrits d'abord (ceux qui doivent échouer avant la modification sont indiqués), retour arrière = revert, plus le script U s'il y a une migration. Numéros de migration attribués à l'implémentation (Q4).

| Ordre | Étape | Contenu | Tests d'abord | Critère de passage |
|---|---|---|---|---|
| 1 | G1 | Permission `integration:manage` (migration d'entreprise V + U ; `common/security/Permissions`) | Échouent d'abord : `SchemaConventionsIT.referenceDataIsLoaded` (51 → 52, ADMIN 52, GESTIONNAIRE 40, CAISSIER 15), `PermissionCatalogIT`, `RolePermissionMatrixIT`, `RoleApiIT`, `RoleRepositoryIT` ; `MigrationRollbackIT` | Suite verte |
| 2 | G2 | Base plateforme : `integration_client`, `integration_authorization_request`, `integration_authorization_code`, `integration_link` (index unique partiel côté boutique, v14-D2), `integration_rate_limit` ; `db/platform-rollback/U00x` (v14-D9) | Conventions plateforme (nommage, `uuid`, `timestamptz`, commentaires), unicité, V → U → V sur schéma isolé | Schéma conforme ; V → U → V vert |
| 3 | G5 | Jeton de liaison : clé distincte, 15 min, `aud`, `iss`, `typ` (v14-D4) ; `ProductionSafetyCheck` (clé absente, courte ou égale à la clé utilisateur ⇒ refus de démarrer si les liaisons sont activées) | Échouent d'abord : clé utilisateur, `aud`/`iss`/`typ` faux, expiré ⇒ refus | **Ne pas** déclarer un second `JwtEncoder`/`JwtDecoder` en bean injecté par type (`security/JwtConfig` en déclare un seul) |
| 4 | G6 | Chaîne de sécurité dédiée `/api/integration/v1/**`, ordre prioritaire, une règle par portée, `denyAll` | Échouent d'abord : `EndpointSecurityCoverageIT` étendu (portée déclarée sur chaque route d'intégration ; seuls `/oauth/par` et `/oauth/token` ouverts au client) ; jeton utilisateur sur l'intégration ⇒ 401 ; jeton de liaison sur `/api/**` ⇒ 401 | Matrice croisée verte |
| 5 | G3 | Service de liaison : états, secret SHA-256 en temps constant (v14-D5), devise (v11-D6), unicité | Transitions interdites ; devise inconnue refusée ; secret jamais relisible | IT verts |
| 6 | G7 | Statut de la liaison à chaque appel ; entreprise courante définie par la liaison | `REVOKED` ⇒ 401 `LINK_REVOKED` ; `SUSPENDED` ⇒ 403 `LINK_SUSPENDED` sauf `GET /link` et `/link/revoke` ; liaison de A sur données de B ⇒ 404 | IT verts |
| 7 | G8 + G9 | `/oauth/par`, `/oauth/token` (deux grants) ; limitation de `/oauth/token` (10/min par client et par IP, en-tête v14-D8) et de `/oauth/par` (30/min par client) ; révocation `EXPIRED` des liaisons `PENDING` expirées de la boutique avant le contrôle d'unicité | Code rejoué ⇒ `invalid_grant` et liaison révoquée ; code expiré, d'un autre client ; `redirect_uri` différente ; PKCE faux ; 11ᵉ appel ⇒ 429 + `Retry-After` ; compteurs indisponibles ⇒ 503 ; `X-Forwarded-For` falsifié sans effet | Scénario 2 du § 10 vert |
| 8 | G10 | Consentement et gestion côté GestStock (chaîne principale, `integration:manage`) : lecture de la demande, approbation, refus, liste, suspension et réactivation (reconfirmation des dépôts), révocation | Sans la permission ⇒ 403 ; demande expirée ou déjà décidée ⇒ refus | IT verts ; `EndpointSecurityCoverageIT` vert |
| 9 | G4 | Dépôts vendables par liaison, figés à l'autorisation (v11-D8) ; `AUTHORIZER_LOST_ACCESS` (v14-D10) | Dépôts ⊆ dépôts accessibles ; STORE par défaut ; dépôt désactivé exclu ; perte d'accès ⇒ `SUSPENDED` | IT verts |
| 10 | G11 | `GET /link`, `POST /link/revoke` (C2) | Critères C2 (§ 19.3) | IT verts |
| 11 | G12 | Audit : création, approbation et refus, activation, révocation, suspension, rotation, échecs d'authentification ; auteur machine | Une entrée par événement, aucun secret, code ni en-tête `Authorization` | IT verts |
| 12 | G13 | Drapeau de publication (v14-D11) | Échouent d'abord : aucune liaison ⇒ aucun événement ; activation ⇒ événements ; révocation de la dernière ⇒ arrêt ; suspension ⇒ publication maintenue | IT verts |
| 13 | G14 | `POST /link/secret` (v14-D6) | Ancien secret accepté avant le premier usage du nouveau, refusé après ou au-delà de 24 h ; nouvel appel remplace le secret en attente ; réponse `no-store` ; 6ᵉ rotation dans l'heure ⇒ 429 | IT verts |
| 14 | GA1 | Angular GestStock : écran de consentement ; retour après connexion limité aux chemins internes (v14-D15) | Rien envoyé sans confirmation ; URL de retour externe ignorée | Tests verts |
| 15 | GA2 | Angular GestStock : « Paramètres → Boutique en ligne » | Masqué sans `integration:manage` ; aucun secret affiché | Tests verts |
| JCMB, en parallèle | J1, J2 | AES-256-GCM (`lib/integration-crypto.ts`) ; modèles `geststocklinks` et demandes d'autorisation (`state` haché, vérificateur, TTL), index unique côté boutique, `scripts/migrate-geststock-link.mjs` | Aller-retour, altération, clé absente ; secret absent de toute sérialisation | vitest vert (GestStock simulé) |
| JCMB, après G8 | J3, J4, JA1 | Client GestStock (jeton en mémoire ; 401, 429, 503) ; routes `start`, `complete`, statut, révocation ; page Angular de retour et section « Connecter GestStock » | `admin`, boutique non approuvée ou bannie refusées (v14-D13) ; `state` d'une autre boutique, rejoué ou expiré refusé ; aucun secret vers Angular ; limitation qui refuse en cas de panne | vitest et tests Angular verts |

### 27.5 Tests de sécurité exigés au lot 2

Liaison refusée sans `integration:manage` ; code rejoué (et révocation de la liaison créée) ou expiré refusé ; `redirect_uri` modifiée refusée ; demande PAR expirée ou réutilisée refusée ; jeton d'utilisateur refusé sur la chaîne d'intégration et jeton de liaison refusé sur la chaîne principale ; liaison révoquée : 401 `LINK_REVOKED` immédiat ; liaison suspendue : 403 `LINK_SUSPENDED` hors `GET /link` et `/link/revoke` ; liaison de A sans accès aux données de B ; limitation de `/oauth/token`, y compris 503 si les compteurs sont indisponibles et `X-Forwarded-For` falsifié sans effet ; secret absent des journaux, de l'audit, des réponses après la première remise et de toute réponse JCMB vers Angular ; publication démarrée seulement avec une liaison active et arrêtée à la révocation de la dernière ; boutique non éligible et rôle `admin` JCMB refusés ; clé AES absente ⇒ refus de démarrer.

### 27.6 Interrupteurs et variables (v14-D17)

| Application | Nom | Rôle |
|---|---|---|
| GestStock | `geststock.integration.links.enabled` (défaut `false`) | Chaîne d'intégration, routes de liaison et écrans désactivés tant qu'il est faux |
| GestStock | `geststock.integration.publish.enabled` (défaut `false`, existant) | Publication des événements ; avec v14-D11, seules les entreprises liées publient |
| JCMB | `GESTSTOCK_INTEGRATION_ENABLED` (défaut faux) | Routes d'intégration (404) et bouton masqués |
| JCMB | `GESTSTOCK_API_ORIGIN` | Origine du backend GestStock sur Vercel (jamais le relais Render, v14-D8) |
| JCMB | `GESTSTOCK_CLIENT_ID`, `GESTSTOCK_CLIENT_SECRET` | Client JCMB de l'environnement (v14-D3) |
| JCMB | `GESTSTOCK_LINK_ENCRYPTION_KEY` | Clé AES-256-GCM des secrets de liaison, propre à l'intégration, VPS seulement |

Restent à nommer à l'implémentation : la clé de signature des jetons de liaison côté GestStock, l'en-tête d'IP retenu (v14-D8) et la liste blanche des `redirect_uri` du client.

### 27.7 Checklist de déploiement (complète le § 26.9)

| # | Contrôle | Origine |
|---|---|---|
| K1 | Clé de signature des jetons de liaison distincte de `GESTSTOCK_JWT_SECRET`, fournie par l'environnement (nom à fixer à l'implémentation) ; `geststock.integration.links.enabled` à `false` jusqu'à l'activation | v13-D5, v14-D17 |
| K2 | `GESTSTOCK_LINK_ENCRYPTION_KEY` nouvelle, propre à l'intégration, présente seulement dans l'environnement du VPS ; `GESTSTOCK_CLIENT_SECRET` propre à l'environnement ; `GESTSTOCK_INTEGRATION_ENABLED` à faux jusqu'à l'activation | v13-D5, v13-D8, v14-D17 |
| I1 | En-tête d'IP posé par Vercel vérifié sur un déploiement de prévisualisation avec un `X-Forwarded-For` falsifié ; `GESTSTOCK_API_ORIGIN` pointe vers Vercel, pas vers le relais nginx de Render | v14-D8 |
| U1 | `redirect_uri` de production = domaine réel du frontend JCMB ; aucune entrée `localhost` hors développement et essai | v14-D12 |
| PR | Migration plateforme et script `db/platform-rollback` vérifiés V → U → V avant déploiement | v14-D9 |

### 27.8 Ordre de déploiement

1. **Backend GestStock** (Vercel) : migrations additives (plateforme, puis permission d'entreprise ; brève indisponibilité 503 par entreprise pendant sa migration, § 22.2), interrupteurs à `false` ; suite complète et checklist (P8, N1, K1, I1, PR).
2. **Angular GestStock** (Render) : écrans masqués sans la permission et l'interrupteur.
3. **Backend JCMB** (VPS) : `GESTSTOCK_INTEGRATION_ENABLED` faux, variables K2, index MongoDB ; le conteneur en service ne change pas de comportement.
4. **Angular JCMB** (Render).
5. **Activation** pour une entreprise et une boutique d'essai : `links.enabled` côté GestStock, puis l'interrupteur JCMB ; `publish.enabled` seulement avec G13.

Retour arrière : interrupteurs à faux ; liaisons à `REVOKED` ; scripts U (entreprise, puis `db/platform-rollback`) ; collection MongoDB supprimée. Essais de bout en bout sans production : tests automatisés des deux côtés (GestStock en Testcontainers jouant le client JCMB ; JCMB avec GestStock simulé et `mongodb-memory-server` en jeu de réplicas) ; essai local des deux applications (environnements § 16, à autoriser) ; prévisualisation Vercel sur une branche Neon isolée, sur autorisation.

### 27.9 Points ouverts à la première rédaction, tranchés ensuite (ajustements v14)

| Point | Constat initial | Décision |
|---|---|---|
| Durée du `request_uri` et connexion GestStock | Environ 90 s : la demande pouvait expirer pendant la connexion de la personne GestStock | **10 min**, comme le `state` JCMB (v14-D1) |
| Limitation de débit de `/oauth/par` et `/link/secret` | Aucune valeur fixée par v13-D4 | **30/min par client** ; **5/h par liaison** ; `429` avec `Retry-After`, `503` si les compteurs sont indisponibles (v13-D4 complété) |
| `currency` sur `Link` | Prévue par v11-D6, absente du schéma | Ajoutée (ISO 4217, `^[A-Z]{3}$`) |
| Liaisons `PENDING` dont le code a expiré | Jamais utilisables, nettoyage non défini | Révoquées (motif `EXPIRED`) au dépôt d'une nouvelle demande pour la même boutique, avant le contrôle d'unicité ; nettoyage global au lot 3 (v14-D2) |

Aucun point ouvert ne reste pour le lot 2 en dehors de ceux nommés au § 27.6 (noms à fixer à l'implémentation).

### 27.10 Changements du contrat (`integration-v1.openapi.yaml`)

- **`POST /oauth/par`** ajouté (Basic du client ; `PushedAuthorizationRequest`, `PushedAuthorizationResponse` ; `redirect_uri` exacte, S256 seulement, boutique déjà liée refusée, éligibilité de la boutique, une décision par `request_uri` ; `request_uri` de 10 min ; révocation `EXPIRED` des liaisons `PENDING` expirées de la boutique ; 30/min par client, `429` et `503`).
- **`/oauth/token`** : Basic du client exigé pour les deux grants ; `authorization_code` lié à la demande déposée, PKCE S256 (`code_verifier` obligatoire, motif) ; activation `PENDING` → `ACTIVE` ; code rejoué refusé et liaison révoquée ; rotation (ancien secret jusqu'au premier usage du nouveau, 24 h au plus).
- **`POST /link/secret`** ajouté (`LinkSecretResponse`, `no-store`, sans `Idempotency-Key`, 403 en suspension ; 5/h par liaison, `429` et `503` ; secret compromis : révocation, pas rotation).
- **`GET /link`** : accessible en suspension.
- **`linkToken`** : `iss`, claim `typ`, en-tête `typ=at+jwt`, deux niveaux d'identifiants, SHA-256 en temps constant, rotation, en-tête d'IP unique ; **`clientBasic`** : client par environnement, sur `/oauth/par` et `/oauth/token`.
- **`Forbidden`** : `LINK_SUSPENDED` décrit ; **`Link`** : statut `PENDING` décrit, `suspensionReason` (`MANUAL`, `AUTHORIZER_LOST_ACCESS`), `revocationReason` (`SHOP_REQUEST`, `GESTSTOCK_ADMIN`, `CODE_REPLAYED`, `EXPIRED` ; nul seulement avant la révocation ; valeur inconnue tolérée par le consommateur), `currency` (ISO 4217, obligatoire). **`TooManyRequests`** : compteur par client sur `/oauth/par`.
- `info.description` (principes, décisions v14), `servers` (appel direct sur Vercel), tag « Autorisation », bloc `x-decisions.v14`.

Lint (`@redocly/cli` 2.72.1, `redocly.yaml` et `.redocly.lint-ignore.yaml` du dossier, **inchangés**) : **0 erreur, 0 avertissement** ; 2 exceptions ciblées, déjà justifiées (§ 22.4) ; YAML valide ; 40 `$ref` distinctes, toutes résolues (déréférencement complet sans reste) ; 17 chemins.

### 27.11 Ce qui n'a pas été fait

- Aucun code, migration, test ni configuration modifié par ce relevé.
- Dépôts applicatifs lus seulement.
- Aucun commit, push ou déploiement.

## 28. Relevé v15 — lot 2 réalisé, plan et contrat alignés sur le code — 2026-10-31

Source : lecture seule des quatre dépôts, branche `feat/integration-lot2` : GestStock backend `8333afd`, gestion-stock `1eac3d9`, JCMB backend `b9ae7b1`, JCMB frontend `a31e644`. **Le code fait foi** : là où il s'écarte de v14, ce relevé et le contrat décrivent le code, et l'écart est listé au § 28.3. Décisions numérotées v15-D1 à v15-D6.

**Applications déployées : aucun effet.** Le lot 2 n'est déployé nulle part ; ce relevé ne modifie que ce document et le contrat.

### 28.1 Journal des changements v14 → v15

| Objet | v14 | v15 |
|---|---|---|
| État du lot 2 | En préparation, non commencé | **Réalisé, non déployé** : G1 à G15, GA1, GA2, J1 à J5, JA0, JA1 (§ 28.2) |
| URL de retour | `redirect_uri?code=…&state=…` ; refus `error=access_denied&state=…` | `iss=geststock-integration` ajouté dans les deux cas (§ 28.3, contrat) |
| Drapeau de publication | Colonne de `integration_feed_state`, posée dans la transaction d'activation | Table `integration_publication` de la base de l'entreprise, posée **avant** l'activation, attente bornée à 2 s (§ 28.3, § 28.4) |
| Limitation de `/oauth/par` | 30/min par client | 30/min par IP avant l'authentification **et** 30/min par client après (§ 28.3) |
| `OAuthError` | Cinq valeurs de `error` | `temporarily_unavailable` ajoutée ; champ `code` (`LINK_REVOKED`) |
| Codes d'erreur de la chaîne | `INVALID_TOKEN`, `LINK_REVOKED`, `LINK_SUSPENDED`, `INSUFFICIENT_SCOPE` | En plus : `COMPANY_SUSPENDED`, `COMPANY_UNAVAILABLE` (403), `SCHEMA_UPGRADE_IN_PROGRESS`, `SCHEMA_UPGRADE_FAILED` (503) |
| `Link` | `warehouses[].priority` facultatif ; réglages décrits | `companyName` ajouté ; pas de `priority` ; `settings` `{}` et `lastSyncAt` nul pour l'instant ; `warehouses` vide après révocation |
| Caractères de contrôle | Non traités | Refusés au format de chaque route ; motif de révocation seul à admettre tabulation et sauts de ligne (G15) |
| Journaux | Aucun secret | En plus : aucune valeur reçue, même refusée ou illisible, à aucun niveau (G15) |
| Page de retour JCMB | « Protégée » (`AuthGuard`) | Sans `AuthGuard` : la page traite elle-même l'absence de session, sans emporter le code dans une URL de retour (§ 28.3, § 28.5) |
| Variables JCMB | Quatre noms (§ 27.6) | Onze noms (§ 28.6) |
| Décisions | v14-D1 à v14-D18 | v15-D1 à v15-D6 (§ 28.7) |

### 28.2 Étapes réalisées

| Dépôt | Étapes (commits, du plus ancien au plus récent) |
|---|---|
| GestStock backend | G1 `9a992ad`, G2 `2f88575`, G5 `b017f36`, G6 `73a7a54`, G3 `8f70a93`, G7 `2b25ff6`, G8 `df0a0b0`, G9 `acda59e`, G10 `74c2c09`, G4a `954b88b`, G4b `024f8a7`, G11 `67aa2b7`, G12 `3f4d0e4`, G13 `a4a2d7b` et `68474fe`, G14 `a50d5ec`, G15 `8333afd` (plus `5d7b059`, stabilisation d'un test du lot 1) |
| gestion-stock (Angular GestStock) | GA1 `67ed527`, en-têtes de sécurité `cd743ff`, GA2 `1eac3d9` |
| JCMB backend | J1 `d1412ce`, J2 `c33d467`, J3 `1afa191`, J4 `efb0c0b`, J5 `b9ae7b1` |
| JCMB frontend | JA0 `c354fff`, JA1 `a31e644` |

Chaque étape a été livrée tests d'abord (échec de comportement constaté avant la modification), suites complètes vertes ; côté GestStock, tests d'intégration sur PostgreSQL 17 (Testcontainers) seulement.

### 28.3 Écarts entre v14 et le code (le code fait foi)

| # | v14 | Code | Écrit en v15 |
|---|---|---|---|
| E1 | v14-D11 : drapeau dans une colonne de `integration_feed_state`, posé **dans** la transaction d'activation | Table `integration_publication` (migration V051) ; drapeau posé **avant** l'activation (transaction de la base de l'entreprise), puis activation sur la base plateforme ; échec du passage : `503 temporarily_unavailable`, code non consommé ; activation non aboutie : drapeau resynchronisé | § 28.4 ; contrat `/oauth/token` |
| E2 | `/oauth/par` limité par client seulement | Deux compteurs : par IP avant l'authentification du client (30/min), par client après (30/min) ; idem `/oauth/token` (10/min) | Contrat `TooManyRequests`, `/oauth/par`, `/oauth/token` |
| E3 | Retour `code`, `state` ; refus `error`, `state` | `iss=geststock-integration` ajouté dans les deux cas (RFC 9207) ; identifiant fixe, pas une URL | Contrat `/oauth/par` (écart assumé avec la RFC 9207, qui prévoit une URL d'émetteur) |
| E4 | Liaisons `PENDING` expirées révoquées au dépôt PAR | Au dépôt PAR **et** à l'approbation, avant la création de la nouvelle liaison en attente | Contrat `/oauth/par` |
| E5 | « Liaison révoquée : 401 `LINK_REVOKED` » pour toute requête | Avec un jeton : `401 LINK_REVOKED` ; `client_credentials` : `400 invalid_grant` avec `code = LINK_REVOKED` ; l'échange du code ne renvoie jamais ce `code` (`invalid_grant` seul) | Contrat `/oauth/token`, `/link/revoke`, `OAuthError` |
| E6 | v14-D1 : page de retour JCMB « protégée » (`AuthGuard`) | Route `/integrations/geststock/callback` sans `AuthGuard` : sans session, message « reconnectez-vous puis recommencez » et lien vers la connexion **sans** URL de retour (le code n'y part pas) | § 28.5 |
| E7 | § 27.5 : « clé AES absente ⇒ refus de démarrer » (JCMB) | Configuration JCMB validée à la **première utilisation** (comme `JWT_SECRET` et `MONGODB_URI`) : clé absente ou invalide ⇒ `503 INTEGRATION_MISCONFIGURED` sur les routes, aucun appel à GestStock | § 28.5 ; à trancher au lot 3 si le refus au démarrage reste voulu (§ 28.8) |
| E8 | Point de cette rédaction : « dépendance `warehouse:read` pour les portées concernées » | **Aucune portée d'intégration ne dépend de `warehouse:read`** (portées : `x-required-scopes` du contrat). Seul lien relevé : l'écran GA2 lit `GET /api/warehouses` (`warehouse:read`) pour proposer les dépôts à la réactivation ; seul le rôle ADMIN a `integration:manage` (v14-D7), et il a aussi `warehouse:read` | § 28.4 ; contrat inchangé sur ce point |

### 28.4 GestStock tel que réalisé

**Chaîne d'intégration** (`/api/integration/v1/**`, G6, G7) : refus dans l'ordre suspension (`403 LINK_SUSPENDED`), entreprise non active (`403 COMPANY_SUSPENDED` si l'entreprise est suspendue, `COMPANY_UNAVAILABLE` sinon), base de l'entreprise en migration (`503 SCHEMA_UPGRADE_IN_PROGRESS`, `SCHEMA_UPGRADE_FAILED` après un échec), portée (`403 INSUFFICIENT_SCOPE`). `POST /link/revoke` ne touche que la base plateforme : ni contrôle d'entreprise ni contrôle de migration. Les routes du client (`/oauth/par`, `/oauth/token`) exigent l'en-tête Basic et ignorent tout jeton Bearer.

**Audit** (G12, G14) : table `platform.integration_audit_log` ; actions `LINK_REQUEST_APPROVED`, `LINK_REQUEST_DENIED`, `LINK_ACTIVATED`, `LINK_SUSPENDED`, `LINK_REACTIVATED`, `LINK_REVOKED`, `CODE_REPLAY_DETECTED`, `CODE_EXCHANGE_REJECTED`, `CLIENT_AUTHENTICATION_FAILED`, **`LINK_SECRET_ROTATED`** (rotation demandée par la boutique) et **`LINK_SECRET_PROMOTED`** (secret en attente devenu courant, avec sa cause : premier usage ou ancien secret expiré). Approbation, refus, suspension, réactivation et révocation sont aussi copiés dans le journal de l'entreprise. Aucun secret, code, `request_uri` ni en-tête `Authorization` ; le motif libre de révocation n'apparaît que dans l'audit.

**Drapeau de publication** (G13, E1) : chaque transaction qui publie lit le drapeau une seule fois avec `FOR SHARE`, verrou gardé jusqu'à sa fin. Le passage à vrai prend d'abord `LOCK TABLE … IN EXCLUSIVE MODE` (file équitable : les ventes qui arrivent derrière attendent, l'activation n'est pas affamée), avec `lock_timeout` et `statement_timeout` de **2 s** (`geststock.integration.publication.lock-timeout`, de 1 ms à 1 min). Au-delà, l'échange du code répond `503 temporarily_unavailable` sans consommer le code. Retrait à la révocation de la dernière liaison active ou suspendue ; la suspension n'arrête pas la publication.

**Rotation du secret** (G14) : `POST /link/secret` ; secret en attente gardé à côté du secret courant ; promotion au premier usage du nouveau, ou ancien refusé au-delà de 24 h ; comparaison en temps constant ; 5 rotations par heure et par liaison.

**G15** :

- `Link.companyName` : nom commercial (`platform.company.trade_name`, 150 caractères au plus), lu par la requête qui relit déjà la liaison à chaque appel (et, à l'échange du code, par celle qui lit déjà le code de l'entreprise) ; nul s'il est vide ; ajouté après les champs existants.
- Caractères de contrôle (U+0000 à U+001F, U+007F) refusés dans tout champ texte reçu par les routes d'intégration et les écrans de liaison : formulaires OAuth (`invalid_request`, noms de paramètres compris), corps JSON et variables de chemin (`VALIDATION_FAILED`), identifiants Basic (`401 invalid_client`). Tabulation et sauts de ligne permis dans le seul motif de `POST /link/revoke`. Rien n'est enregistré ni audité, sauf l'échec d'authentification du client (v15-D1).
- Fuites de journaux fermées, à tout niveau : validation `@Valid` des corps faite avant celle de Spring et sans la valeur refusée ; `toString` des corps masqués ; corps JSON illisible résolu sans journal (`400 MALFORMED_REQUEST` inchangé) ; logger `org.springframework.web.method.HandlerMethod` limité à INFO (v15-D4) ; nom de paramètre OAuth refusé par le pare-feu traité en `invalid_request` (500 auparavant).

**Écrans** (GA1, GA2) : consentement `/integrations/jecreemaboutique/authorize` (`client_id`, `request_uri` seuls lus dans l'URL) ; « Paramètres → Boutique en ligne » (`integration:manage`) : liste, suspension, réactivation (dépôts reconfirmés, lus par `GET /api/warehouses`, E8), révocation. En-têtes de sécurité du frontend appliqués à toutes les pages (`cd743ff`).

**Noms fixés à l'implémentation** (§ 27.6, « restent à nommer ») : clé de signature des jetons de liaison `geststock.integration.links.token.keys` et `current-kid` ; en-tête d'IP `geststock.integration.client-ip-header` (variable `GESTSTOCK_INTEGRATION_CLIENT_IP_HEADER` en production ; **nom de l'en-tête à confirmer en I1**) ; liste blanche des `redirect_uri` : table `platform.integration_client_redirect_uri`.

### 28.5 JeCréeMaBoutique tel que réalisé

**J1 — chiffrement** : AES-256-GCM, format `v1.<keyId>.<iv>.<tag>.<ciphertext>`, données associées liaison + boutique ; anciennes clés pour le déchiffrement seulement ; aucune clé égale à un autre secret de l'application.

**J2 — modèles** : `geststocklinks` (index unique partiel sur la boutique pour les liaisons non révoquées, secret chiffré jamais sérialisé) ; demandes d'autorisation (`state` haché, vérificateur, durée de vie **10 min**, index TTL de nettoyage, consommation atomique à usage unique) ; `scripts/migrate-geststock-link.mjs`.

**J3 — client GestStock** : PAR, échange du code (vérification de `iss`), jeton de liaison en mémoire (un seul appel pour des demandes simultanées, renouvelé dans sa dernière minute), `GET /link`, révocation ; redirections jamais suivies ; réessai d'un `503` émis par GestStock avant tout traitement du code (`temporarily_unavailable`, `RATE_LIMIT_UNAVAILABLE`), 3 tentatives au plus ; erreurs typées.

**J4 — routes** (Bearer de la boutique ; interrupteur désactivé : `404 INTEGRATION_DISABLED` ; erreurs `{ success: false, message, code }`, `Cache-Control: no-store`) :

| Route | Limite par boutique | Boutique approuvée exigée | Succès |
|---|---|---|---|
| `POST /api/integrations/geststock/start` | 5 / 10 min | Oui | `201` : `authorizationUrl` seulement |
| `POST /api/integrations/geststock/complete` | 10 / 10 min | Oui | `201` : vue de la liaison |
| `GET /api/integrations/geststock/link` | 30 / min | Non | `200` : `{ link, refreshed, stale }` |
| `POST /api/integrations/geststock/revoke` | 5 / 10 min | Non | `200` : `{ link, revoked }` |

Codes d'erreur : `INTEGRATION_DISABLED` 404 ; `UNAUTHENTICATED` 401 ; `ADMIN_FORBIDDEN` 403 ; `SHOP_NOT_ELIGIBLE` 403 ; `RATE_LIMITED` 429 (limiteur JCMB, fermé en cas de panne) ; `RATE_LIMIT_UNAVAILABLE` 503 ; `INVALID_REQUEST` 400 ; `TOO_MANY_PENDING_REQUESTS` 429 (**3 demandes en cours au plus** par boutique) ; `ALREADY_LINKED` 409 ; `AUTHORIZATION_REQUEST_INVALID` 400 ; `INVALID_ISSUER` 400 ; `AUTHORIZATION_REJECTED` 400 ; `LINK_REVOKED` 409 ; `LINK_SAVE_FAILED` 500 ; `GESTSTOCK_UNAVAILABLE` 503 ; `GESTSTOCK_RATE_LIMITED` 429 ; `GESTSTOCK_ERROR` 502 ; `GESTSTOCK_REVOCATION_REJECTED` 502 ; `INTEGRATION_MISCONFIGURED` 503 ; `LINK_SECRET_UNREADABLE` 500 ; `INTERNAL_ERROR` 500. Les `429 RATE_LIMITED` et `GESTSTOCK_RATE_LIMITED` portent toujours `Retry-After` (60 s si GestStock n'en donne pas, J5), exposé au navigateur par le CORS de l'API (`Access-Control-Expose-Headers: Retry-After`, `next.config.mjs`).

Règles :

- **Consultation** : état relu chez GestStock s'il date de plus d'**une minute** ; GestStock injoignable : état local rendu, signalé « non actualisé » (`stale`), sans erreur ; liaison révoquée chez GestStock : révoquée ici aussi.
- **Compensation** : liaison activée chez GestStock mais non enregistrée ici (ou réponse inattendue) : révocation immédiate chez GestStock avec un motif constant, puis `LINK_SAVE_FAILED` ou `GESTSTOCK_ERROR`.
- **Révocation : GestStock d'abord**, puis localement (secret effacé, boutique libérée) ; déjà révoquée chez GestStock : même issue ; GestStock injoignable : aucune modification locale et erreur réessayable ; corps refusé par GestStock (`400`) : `502 GESTSTOCK_REVOCATION_REJECTED`. Motif facultatif, 500 caractères au plus, sans caractère de contrôle.
- **`companyName`** (J5) : nettoyé par le client (texte seulement, caractères de contrôle retirés, 150 caractères au plus, tronqué sans couper un caractère), enregistré à la création et mis à jour au rafraîchissement ; **un nul reçu conserve le nom déjà connu** (GestStock ne renvoie nul que pour un nom vide ou illisible) ; borne du modèle comptée en caractères.

**JA0** : tests unitaires du frontend JCMB avec Vitest et jsdom (v15-D5) ; construction toujours hors du dépôt (`dist/` versionné, v15-D6).

**JA1** : section « GestStock » de `/profile` (masquée pour l'administrateur et si l'intégration est désactivée) ; navigation vers l'écran d'autorisation seulement si son origine est exactement l'origine GestStock configurée. Page de retour **`/integrations/geststock/callback`** (à reporter dans `GESTSTOCK_REDIRECT_URI` et dans les `redirect_uri` du client chez GestStock) : `code`, `state`, `iss` et `error` retirés de l'URL avant tout traitement ; un seul `POST complete` par `state` ; refus et paramètres invalides sans appel ; `Referrer-Policy: no-referrer` par une balise `meta` pendant l'affichage (en-tête de déploiement recommandé, § 28.9) ; aucune valeur dans la console ; aucune mesure d'audience dans l'application. Polices Google chargées sur toutes les pages (origine seule envoyée, jamais l'URL) : hébergement local facultatif (§ 28.8).

### 28.6 Variables JCMB (complète le § 27.6)

| Nom | Rôle |
|---|---|
| `GESTSTOCK_INTEGRATION_ENABLED` | `true` pour activer ; sinon routes en `404` et section masquée |
| `GESTSTOCK_LINK_ENCRYPTION_KEY` | Clé AES-256-GCM courante (32 octets, Base64), seule à chiffrer ; VPS seulement |
| `GESTSTOCK_LINK_ENCRYPTION_KEY_ID` | Identifiant de la clé courante (1 à 32 caractères `A-Z a-z 0-9 _ -`) |
| `GESTSTOCK_LINK_ENCRYPTION_OLD_KEYS` | Anciennes clés, déchiffrement seulement (`id1:base64,id2:base64`, facultatif) |
| `GESTSTOCK_API_ORIGIN` | Origine du backend GestStock sur Vercel (jamais le relais Render, v14-D8) |
| `GESTSTOCK_FRONTEND_ORIGIN` | Origine du frontend GestStock (écran d'autorisation) |
| `GESTSTOCK_CLIENT_ID`, `GESTSTOCK_CLIENT_SECRET` | Client JCMB de l'environnement (v14-D3) |
| `GESTSTOCK_REDIRECT_URI` | URL de la page de retour, identique caractère par caractère à la liste blanche GestStock |
| `GESTSTOCK_ISSUER` | `iss` attendu au retour (défaut `geststock-integration`) |
| `GESTSTOCK_SCOPES` | Restriction facultative des portées demandées (sous-ensemble des portées du contrat) |

Frontend JCMB : `geststockOrigin` dans `environment.ts` et `environment.prod.ts` (origine attendue de l'écran d'autorisation), à aligner sur `GESTSTOCK_FRONTEND_ORIGIN`.

### 28.7 Décisions v15

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **v15-D1** | Identifiant client illisible | `401 invalid_client` (RFC 6749 § 5.2) plutôt que `400` ; l'échec reste **audité** (`CLIENT_AUTHENTICATION_FAILED`, G12) sans aucune partie de la valeur reçue, et compte dans le limiteur par IP |
| **v15-D2** | Requête refusée par le pare-feu HTTP | `400` **sans corps** conservé (`%00` dans l'URL, caractère de contrôle dans un en-tête) : refus avant toute route, comportement commun à toute l'application |
| **v15-D3** | UUID du JSON | Tolérance de Jackson conservée : caractères de contrôle de début et de fin retirés (`"<uuid>\u0000"` désigne `<uuid>`, enregistré sans le caractère) ; au milieu : `400 MALFORMED_REQUEST`. Les variables de chemin, elles, sont strictes |
| **v15-D4** | Journaux de Spring MVC | Logger `org.springframework.web.method.HandlerMethod` limité à INFO (sur le modèle de `org.postgresql`) : il cite la valeur reçue en DEBUG et les arguments en TRACE ; son seul WARN reste visible |
| **v15-D5** | Tests du frontend JCMB | Vitest et jsdom (`@angular/build:unit-test`) |
| **v15-D6** | `dist/` du frontend JCMB | Laissé versionné en attendant la vérification de la construction Render ; aucune construction dans le dépôt (sortie hors du dépôt) |

### 28.8 Backlog du lot 3

| Point | Origine |
|---|---|
| Route interne du cron Vercel (métriques, purge) | v14-D16 |
| Nettoyage global des liaisons `PENDING` expirées | v14-D2 |
| Permission `integration:price-approve` | v14-D7 |
| Exposition des métriques du flux sans jauges en mémoire par instance | § 26.10 |
| Révocation de la liaison au bannissement d'une boutique JCMB | v15 |
| Part JCMB de la rotation du secret de liaison (appel de `POST /link/secret`, rechiffrement) | G14 |
| Refus de démarrer du backend JCMB si la configuration de l'intégration est invalide (E7), si voulu | v15 |
| Hébergement local des polices du frontend JCMB (facultatif) | JA1 |
| Retrait de `tsconfig.tsbuildinfo` du suivi Git (JCMB backend) | J1 à J5 |
| `dist/` du frontend JCMB : retrait du suivi ou maintien, selon la construction Render | v15-D6 |

### 28.9 Checklist de déploiement (complète les §§ 26.9 et 27.7)

| # | Contrôle | Origine |
|---|---|---|
| R3 | Construction Render du frontend JCMB vérifiée (`dist/` versionné utilisé ou non) | v15-D6 |
| N2 | Version de Node fixée sur Render pour les projets JCMB (les dépendances de construction et de test, dont jsdom, imposent une version minimale de Node ; JA0 a dû choisir jsdom 26 pour cette raison) | JA0 |
| RP | En-tête `Referrer-Policy: no-referrer` sur `/integrations/geststock/*` du frontend JCMB (en plus de la balise `meta`) | JA1 |
| U2 | `redirect_uri` de production identique **caractère par caractère** des deux côtés : `GESTSTOCK_REDIRECT_URI` (JCMB) et `platform.integration_client_redirect_uri` (GestStock) | v14-D12, JA1 |
| O1 | Origine GestStock de production : `GESTSTOCK_FRONTEND_ORIGIN` (backend JCMB) et `geststockOrigin` (frontend JCMB) identiques ; `GESTSTOCK_API_ORIGIN` vers Vercel | JA1, v14-D8 |
| I1 | En-tête d'IP posé par Vercel vérifié sur une prévisualisation avec un `X-Forwarded-For` falsifié ; son nom dans `GESTSTOCK_INTEGRATION_CLIENT_IP_HEADER` (**à confirmer en I1**) | v14-D8 |
| K3 | Clés de production : signature des `pageToken` (`geststock.integration.page-token.*`), signature des jetons de liaison (`geststock.integration.links.token.*`, distincte de `GESTSTOCK_JWT_SECRET`), chiffrement JCMB (`GESTSTOCK_LINK_ENCRYPTION_KEY`, `_KEY_ID`), en-tête d'IP. Côté GestStock, `ProductionSafetyCheck` refuse le démarrage si la clé `pageToken` manque avec la publication activée, ou si la clé des jetons de liaison ou l'en-tête d'IP manquent avec les liaisons activées ; côté JCMB, contrôle à la première utilisation (E7) | v12-D7, v13-D5, v14-D17 |

### 28.10 Risques acceptés

v13-D7 (comportements existants de JCMB conservés, § 26.7) et v13-D8 (risques acceptés le 2026-10-29, § 26.8) : **inchangés**.

### 28.11 Changements du contrat (`integration-v1.openapi.yaml`)

- **En-tête et `info`** : routes du lot 2 décrites telles qu'implémentées ; principes : compteurs du limiteur, formats d'erreur (dont `400` sans corps du pare-feu), caractères de contrôle ; décisions v15 ; bloc `x-decisions.v15`.
- **`/oauth/par`** : corps de formulaire seulement, sans paramètre dans l'URL ni répété ; caractères de contrôle ; `scope` et `invalid_scope` ; révocation `EXPIRED` aussi à l'approbation ; compteurs par IP et par client ; URL de retour avec `iss` (écart assumé avec la RFC 9207) ; `401` avec `WWW-Authenticate: Basic`.
- **`/oauth/token`** : `LINK_REVOKED` sur `client_credentials` ; `503` sous deux formats (`RATE_LIMIT_UNAVAILABLE`, `temporarily_unavailable` avec code non consommé) ; compteurs par IP et par client.
- **`GET /link`**, **`POST /link/secret`** et routes à venir : `503 ServiceUnavailable` (`SCHEMA_UPGRADE_*`, `RATE_LIMIT_UNAVAILABLE`) ; **`Forbidden`** : `COMPANY_SUSPENDED`, `COMPANY_UNAVAILABLE`.
- **`POST /link/revoke`** : corps facultatif, motif de 500 caractères au plus (tabulation et sauts de ligne permis), `400` (`VALIDATION_FAILED`, `MALFORMED_REQUEST`), `warehouses` vide, base plateforme seulement.
- **`OAuthError`** : `temporarily_unavailable`, `code` (`LINK_REVOKED`) ; **`BadRequest`** : `VALIDATION_FAILED`, `MALFORMED_REQUEST` ; **`TooManyRequests`** : deux compteurs ; **`clientBasic`** : encodage RFC 6749 § 2.3.1, en-tête illisible ; **`linkToken`** : en-tête d'IP à confirmer en I1.
- **`PushedAuthorizationRequest`** : `shop_id` et `shop_name` non blancs ; **`Link`** : `companyName`, `warehouses` sans `priority`, `settings` `{}` et `lastSyncAt` nul pour l'instant.
- **Réponses complètes des cinq routes du lot 2** (vérifiées dans le code) : `404 RESOURCE_NOT_FOUND` (liaisons désactivées, `LinksDisabled`), `500 INTERNAL_ERROR` (`InternalError`), `400` sans corps du pare-feu (`FirewallRejected`) ; `POST /link/revoke` : `403 INSUFFICIENT_SCOPE` et `415 UNSUPPORTED_MEDIA_TYPE`, **aucun `503`** (ni limiteur, ni base de l'entreprise) ; `GET /link` : `503` `SCHEMA_UPGRADE_*` ou `SERVICE_CAPACITY_REACHED`, jamais `RATE_LIMIT_UNAVAILABLE` ; `POST /link/secret` : `503` `RATE_LIMIT_UNAVAILABLE` ou `SCHEMA_UPGRADE_*`.

Lint (`@redocly/cli` 2.72.1, `redocly.yaml` et `.redocly.lint-ignore.yaml` du dossier, **inchangés**) : **0 erreur, 0 avertissement** ; 2 exceptions ciblées, déjà justifiées (§ 22.4), toujours utilisées ; YAML valide (clés dupliquées refusées) ; 44 `$ref` distinctes, toutes résolues ; 17 chemins.

### 28.12 Ce qui n'a pas été fait

- Aucun code, migration, test ni configuration modifié par ce relevé ; dépôts applicatifs lus seulement.
- Aucun commit, push ou déploiement.

## 29. Relevé v16 — hébergement sur Render, préparation du lot 3 — 2026-11-02

Source : décisions du responsable du 2026-11-02 ; lecture seule du backend GestStock (`feat/integration-lot2`, `8333afd`) et du backend JCMB (`b9ae7b1`). Décisions numérotées v16-D1 à v16-D4 ; les points marqués **[Proposé]** ou **[Ouvert]** restent à approuver avant l'étape qui en dépend.

**Applications déployées : aucun effet.** Ce relevé ne modifie que ce document et le contrat.

### 29.1 Décisions v16

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **v16-D1** | Hébergement du backend GestStock (fait communiqué par le responsable) | Spring Boot sur **Render** (service web), base **Neon** ; remplace Vercel (v13-D1). Le lot 2 est déployé selon le responsable ; les contrôles du § 28.9 ne sont pas vérifiés par ce relevé. Frontends (Render), backend JCMB (VPS) et base JCMB (Atlas) : inchangés |
| **v16-D2** | Tâches de fond (purge du flux, métriques, nettoyage des liaisons `PENDING` expirées) | Conception de v13-D2 **conservée** : une **route interne protégée**, appelée par un **cron externe au processus** ; traitement court (borné en durée et en volume), repris en cas d'interruption, rejouable sans effet en double. Raison : le service Render peut s'endormir sans trafic (offre gratuite) ou tourner sur plusieurs instances ; un `@Scheduled` n'y est pas fiable. Les tâches `@Scheduled` du lot 1 restent désactivées en production (T1 inchangé) |
| **v16-D3** | D2b — suspension automatique d'un prix approuvé | **Non retenue.** Un changement du prix de référence ne retire jamais un prix approuvé de la vente : alerte seulement (`ChannelPrice.referenceChangedSinceApproval`, avis au commerçant et à l'approbateur, § 5.1) |
| **v16-D4** | Démarrage du lot 3 | Par ce relevé (documentaire) ; les étapes suivent l'ordre du § 29.5, chacune après que les points du § 29.4 dont elle dépend ont été tranchés |

### 29.2 Conséquences de v16-D1 sur les décisions antérieures

| Sujet | Avant | v16 |
|---|---|---|
| v13-D2 « aucun processus permanent » | Backend serverless | Processus permanent, mais ni toujours éveillé ni forcément unique : les règles de v13-D2 (aucun état en mémoire pour les compteurs ni pour les tâches) **restent valables** |
| Compteurs en mémoire, jauges du lot 1 | Exclus (Vercel) | **Toujours exclus** (plusieurs instances possibles) ; dette « métriques sans jauges en mémoire » (§ 26.10) maintenue |
| Neon, trafic applicatif | Pooler recommandé (nombre d'instances serverless) ; N1 avant usage | **[Proposé]** hôte **direct** pour tout le trafic (pool de connexions du processus, peu d'instances) ; N1 sans objet tant que le pooler n'est pas utilisé ; P8 inchangée |
| En-tête d'IP réelle (v14-D8, I1) | Posé par Vercel | **À établir sur Render** : identifier l'en-tête que le proxy de Render pose ou écrase, puis vérifier qu'une valeur falsifiée par le client n'est pas reprise ; son nom dans `GESTSTOCK_INTEGRATION_CLIENT_IP_HEADER` |
| `GESTSTOCK_API_ORIGIN` (JCMB) | Origine Vercel, jamais le relais nginx du frontend | Origine du **service backend Render**, jamais le relais du frontend (règle v14-D8 inchangée) |
| Cron | Cron Vercel | Cron externe au processus (§ 29.4, Q1) |

### 29.3 État des critères d'entrée du lot 3 (§ 25.4), constaté dans le code

| # | Critère | État au 2026-11-02 |
|---|---|---|
| 1 | P0-5 sur la route (base primaire, ni cache ni réplica) | À prouver avec les routes HTTP du flux (G16) |
| 2 | Tests HTTP des codes `INVALID_PAGE_TOKEN`, `SNAPSHOT_EXPIRED`, `CURSOR_AHEAD`, `CURSOR_EXPIRED`, `VALIDATION_FAILED`, `INVALID_PARAMETER` | À écrire (G16, G18) ; codes déjà levés par `ChangeFeedService` et `SnapshotService` |
| 3 | `LinkRef`, `ChangeFilter`, `AckSource`, `WarehouseScope` réels | `WarehouseScope` : **fait** (`LinkWarehouseScope`, G4a). `LinkRef` : identifiant opaque, à alimenter par la liaison authentifiée (G16). `ChangeFilter` : `ALL` (Q2). `AckSource` : `NoAcknowledgements` (G17) |
| 4 | Publication conditionnée à une liaison active | **Fait** (G13, table `integration_publication`) |
| 5 | Republication de la disponibilité au changement de type de dépôt | Sans objet tant que le périmètre ne filtre pas par type (`LinkWarehouseScope` filtre par liaison et par activité) ; à revoir au lot 4 |

### 29.4 Points ouverts du lot 3

| # | Question | Proposition | À trancher avant |
|---|---|---|---|
| Q1 | Fournisseur du cron (v16-D2) et authentification de la route interne | **[Validé 2026-11-02] workflow GitHub Actions `schedule`** (précision de 5 à 15 min, suffisante pour la purge et les mesures ; jeton dans les secrets GitHub). **[Proposé]** jeton dédié en en-tête, propre au cron, comparé en temps constant, distinct des jetons utilisateurs et de liaison ; route hors de `/api/integration/v1/**` | G20 |
| Q2 | Filtre par liaison (`ChangeFilter`) | **[Validé 2026-11-02]** catalogue actif entier de l'entreprise (aucune sélection de produits par liaison en v1) ; `ChangeFilter.ALL` conservé | G16 |
| Q3 | Consommateur JCMB | **[Validé 2026-11-02]** conteneur dédié sur le VPS, distinct du conteneur Next.js (v13-D3 inchangé) | J7 |
| Q4 | Champ `stock` des produits JCMB synchronisés au lot 3 | **[Validé 2026-11-02]** inchangé au lot 3 (géré par la boutique) ; remplacé par la disponibilité au lot 4 (§ 7) | J6 |
| Q5 | Prix d'un produit synchronisé jamais approuvé | **[Validé 2026-11-02]** règle du § 5.1 appliquée côté JCMB dès le lot 3 : visible, non commandable, « Prix en attente de validation » | J6 |
| Q6 | Refus de démarrer du backend JCMB si la configuration de l'intégration est invalide (E7) | **[Proposé]** non : contrôle à la première utilisation conservé | — |

### 29.5 Étapes du lot 3 (ordre proposé)

Même règle qu'au lot 2 : un commit par étape, tests écrits d'abord (échec de comportement constaté avant la modification), retour arrière = revert, plus le script U s'il y a une migration ; numéros de migration attribués à l'implémentation. GestStock : tests d'intégration sur PostgreSQL 17 (Testcontainers) seulement.

| Ordre | Étape | Contenu | Tests d'abord |
|---|---|---|---|
| 1 | G16 | `GET /catalog/changes` (`catalog:read`) : `LinkRef` = liaison authentifiée, filtre Q2, 120/min par liaison (v13-D4) ; P0-5 | `INVALID_PARAMETER`, `VALIDATION_FAILED`, `CURSOR_AHEAD`, `CURSOR_EXPIRED` ; liaison de A sans donnée de B ; portée absente ⇒ 403 ; 121ᵉ appel ⇒ 429 |
| 2 | G17 | `POST /catalog/changes/ack` ; `AckSource` réel (plus petit `seq` acquitté par les liaisons actives) ; purge en une transaction par lot de suppression (dette v12-D6) | Rien de purgé au-delà de l'acquittement le plus bas ; acquittement en recul ou au-delà de `lastSeq` refusé ; liaison révoquée hors calcul |
| 3 | G18 | `GET /catalog/snapshot` (60/min par liaison) | `INVALID_PAGE_TOKEN`, `SNAPSHOT_EXPIRED` ; `pageToken` d'une autre liaison refusé ; devise figée |
| 4 | G19 | `GET /catalog/products/{productId}/image` | Produit d'une autre entreprise ⇒ 404 ; empreinte et version cohérentes avec l'événement `PRODUCT_IMAGE` |
| 5 | G20 | Route interne et cron (v16-D2, Q1) : purge, mesures du flux, révocation `EXPIRED` des liaisons `PENDING` expirées (nettoyage global, v14-D2) | Sans jeton du cron ⇒ 401 ; jeton utilisateur ou de liaison refusé ; deux exécutions ⇒ même état ; traitement borné |
| 6 | G21 | Permission `integration:price-approve` (migration d'entreprise V + U), ADMIN par défaut (v14-D7) | Comptes de permissions (`SchemaConventionsIT`, `PermissionCatalogIT`, `RolePermissionMatrixIT`, `RoleApiIT`, `RoleRepositoryIT`) ; `MigrationRollbackIT` |
| 7 | G22 | `channel_price` (V + U) ; `POST /prices/proposals` (`price:propose`, `Idempotency-Key`) ; `GET /prices` ; décisions d'approbation ; concurrence C6 ; alerte de changement du prix de référence (v16-D3) | Proposition concurrente ⇒ `SUPERSEDED` ; `422 PRICE_VERSION_MISMATCH` ; rejeu idempotent ; décision sur une proposition déjà décidée ⇒ conflit ; aucun prix approuvé modifié par un changement du prix de référence |
| 8 | GA3 | Angular GestStock : approbation et refus des prix (motif obligatoire), avis de changement du prix de référence | Masqué sans `integration:price-approve` ; refus sans motif impossible |
| 9 | G23 | `GET /catalog/products/search` (`catalog:match`) | Pagination ; produits d'une autre entreprise absents |
| JCMB | J6 | Identifiants externes des produits et catégories (`external.source`, `external.id`, `external.version`), index unique `{shopId, external.source, external.id}`, `scripts/migrate-external-ids.mjs` ; champs GestStock en lecture seule (API) | Écriture d'un champ GestStock refusée ; association en double refusée sans modification |
| JCMB | J7 | Modèle `syncstates` et consommateur (Q3) : catégories avant produits, `updateOne` conditionné par la version, registre des événements appliqués, curseur avancé **après** application, remise à zéro (`CURSOR_AHEAD`, v11-D11) | Rejeu sans effet ; événement plus ancien ignoré ; interruption entre application et curseur sans perte ; type inconnu ignoré |
| JCMB | J8 | Instantané initial et réconciliation | Catalogue identique après synchronisation et après réconciliation ; aucun champ boutique modifié |
| JCMB | J9 | Images : traitement séparé, par empreinte | Image inchangée non retéléchargée |
| JCMB | J10 | Suppressions (§ 5.3) : catégorie contenant des produits synchronisés ⇒ 409 ; produit synchronisé : masquer ou détacher ; produit désactivé chez GestStock ⇒ archivé | `deleteCategory`, `deleteProduct` |
| JCMB | J11 | Rapprochement assisté et propositions de prix | Différences affichées avant confirmation ; association concurrente refusée |
| JCMB | J12 | Restes du lot 2 : part JCMB de la rotation du secret (`POST /link/secret`, rechiffrement) ; révocation de la liaison au bannissement d'une boutique (`app/api/admin/shops/[id]/toggle-ban`) | Ancien secret plus utilisé après la rotation ; bannissement ⇒ liaison révoquée chez GestStock puis localement |
| JCMB | JA2 | Angular JCMB : statut de synchronisation, rapprochement, champs GestStock en lecture seule, « Prix en attente de validation » | Tests Vitest |

### 29.6 Backlog du lot 3 (remplace le § 28.8)

| Point | Origine | Étape |
|---|---|---|
| Route interne et cron (métriques, purge) | v14-D16, v16-D2 | G20 |
| Nettoyage global des liaisons `PENDING` expirées | v14-D2 | G20 |
| Permission `integration:price-approve` | v14-D7 | G21 |
| Exposition des métriques du flux sans jauges en mémoire par instance | § 26.10 | G20 |
| Révocation de la liaison au bannissement d'une boutique JCMB | v15 | J12 |
| Part JCMB de la rotation du secret de liaison | G14 | J12 |
| Refus de démarrer du backend JCMB si la configuration est invalide (E7) | v15 | Q6 |
| Hébergement local des polices du frontend JCMB (facultatif) | JA1 | — |
| Retrait de `tsconfig.tsbuildinfo` du suivi Git (JCMB backend) | J1 à J5 | — |
| `dist/` du frontend JCMB : retrait du suivi ou maintien | v15-D6 | R3 |

### 29.7 Checklist de déploiement (complète et corrige le § 28.9)

| # | Contrôle | Origine |
|---|---|---|
| I1 | En-tête d'IP réelle **posé par Render** identifié et vérifié avec un `X-Forwarded-For` falsifié ; son nom dans `GESTSTOCK_INTEGRATION_CLIENT_IP_HEADER` | v14-D8, v16-D1 |
| O1 | `GESTSTOCK_API_ORIGIN` (JCMB) = origine du service backend **Render** ; `GESTSTOCK_FRONTEND_ORIGIN` et `geststockOrigin` identiques | JA1, v16-D1 |
| P8 | `GESTSTOCK_DB_URL`, `GESTSTOCK_PLATFORM_DB_URL` et `GESTSTOCK_PROVISIONER_DB_URL` au format `jdbc:postgresql://hôte/base?sslmode=require` : hôte direct sans `-pooler`, aucun identifiant dans l'URL, aucun paramètre propre à `psql` (`channel_binding`) | v11-D12, v16 |
| PORT | Port d'écoute aligné sur celui attendu par Render (`GESTSTOCK_SERVER_PORT`) | v16-D1 |
| T1 | Tâches `@Scheduled` désactivées en production tant que la route interne et le cron ne sont pas livrés (G20) | v13-D2, v16-D2 |
| N1 | Sans objet tant que le pooler Neon n'est pas utilisé (§ 29.2) | v16 |

### 29.8 Changements du contrat (`integration-v1.openapi.yaml`)

- Hébergement : serveur décrit sur Render (v16-D1) ; en-tête d'IP posé par le proxy de Render, à confirmer en I1.
- Bloc `x-decisions.v16`.
- Aucune route ajoutée ni modifiée : les routes du lot 3 restent décrites telles que proposées, à aligner sur le code étape par étape.

### 29.9 Ce qui n'a pas été fait

- Aucun code, migration, test ni configuration modifié ; dépôts applicatifs lus seulement.
- Aucune vérification du déploiement Render (§ 28.9, § 29.7) ; aucun accès à Neon ni à Render.
- Aucun commit, push ou déploiement.

## 30. Relevé v17 — acquittement du flux et purge (conception G17) — 2026-11-02

Source : audit de conception G17 (lecture seule du backend GestStock : `OutboxPurge`, `AckSource`, `SnapshotService`, `FeedSequencer`, `OAuthService`, `LinkPublication`), revue contradictoire du même jour et décisions du responsable du 2026-11-02. Décisions numérotées v17-D1 à v17-D16 ; tout point marqué **[Proposé]** n'est pas tranché. **Aucune implémentation autorisée par ce relevé** : G17 commence après validation de ce document, tests d'abord.

**Applications déployées : aucun effet.** Ce relevé ne modifie que ce document et le contrat.

*Révision du 2026-11-02 après revue contradictoire* : faille de la première démonstration du § 30.5 corrigée (les éléments de la borne étaient lus à des instants différents ; v17-D11) ; décisions v17-D12 à v17-D16 ajoutées ; numéros de migration retirés ; propositions séparées des décisions.

### 30.1 Décisions de la revue G16 (2026-11-02)

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **v17-D1** | Événements `AVAILABILITY` dans le flux | Servis seulement aux liaisons qui ont la portée `stock:read` (celle de `GET /availability`) ; `catalog:read` seule ne divulgue aucune quantité. Filtre de la liaison (`ChangeFilter`) : un événement écarté est examiné et fait avancer `lastSeq` (P1). **Règle équivalente pour l'instantané (G18)** : section `availability` servie seulement avec `stock:read` (`SnapshotService.read` n'a pas encore de filtre ; un produit absent de la section est dans son état initial, v12-D3 b) |
| **v17-D2** | Paramètre refusé par le pare-feu HTTP (hors intégration, toute l'application) | Refus pendant la lecture des arguments : `400 INVALID_PARAMETER` « Paramètre refusé. », sans journal (auparavant `500` et journal ERROR citant le nom, constaté sur `GET /api/audit-logs`) ; refus avant toute route : `400` sans corps (v15-D2), sans journal ni page d'erreur ; logger `org.springframework.web.servlet.DispatcherServlet` limité à INFO (en DEBUG, il lit les paramètres et fait dépendre la réponse du niveau de journal ; en TRACE, il écrit la query). **Limite assumée** : en DEBUG et TRACE, Tomcat et Spring Security écrivent la ligne de requête de toute requête ; ces niveaux ne sont jamais activés en production |

### 30.2 Décisions G17

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **v17-D3** (G17-1) | Stockage des acquittements | Base de **chaque entreprise**, table `integration_link_ack` (§ 30.6). Raison : acquittements, flux et purge dans la même base, cohérents après une restauration de la base de l'entreprise |
| **v17-D4** (G17-2) | Liaison active ou suspendue sans acquittement | **Bloque toute la purge** de l'entreprise (protège une liaison qui récupère encore son état initial) |
| **v17-D5** (G17-3) | Liaison qui n'acquitte plus | Aucune exclusion automatique ; abandon par une **révocation explicite et journalisée** (D5, audit `LINK_REVOKED`) ; alerte sur l'âge de l'acquittement par liaison avec les métriques (G20) |
| **v17-D6** (G17-4) | `seq` supérieur au dernier `seq` attribué | `409 CURSOR_AHEAD`, comme `GET /catalog/changes` (l'ébauche du contrat prévoyait `422`) |
| **v17-D7** (G17-5) | Limite de débit | Compteur propre à l'acquittement : **60 appels par minute et par liaison**, configurable ; distinct du compteur du flux |
| **v17-D8** (G17-6) | Contrôle du `seq` réellement servi à la liaison | **Aucun** : il imposerait une écriture à chaque lecture ; un acquittement trop en avance ne fait perdre des événements qu'à la liaison fautive (la purge suit le plus petit acquittement) |
| **v17-D9** (G17-7) | Événements sans `seq` | **Conservés en G17** (règle existante inchangée), y compris après la révocation de la dernière liaison : ils peuvent alors s'accumuler (la publication est arrêtée, v12-D4, mais ceux déjà écrits et jamais lus restent) jusqu'à la décision prévue en G20, avec les métriques |
| **v17-D10** | Purge par lots autonomes (dette v12-D6) | § 30.4 |
| **v17-D11** | Plafond de la borne (correction de la revue) | La purge lit `last_seq` dans la base de l'entreprise **avant** de lire la liste des liaisons dans la base plateforme ; cette valeur est un **plafond immuable** du passage. La borne ne dépasse jamais ce plafond (§ 30.4, § 30.5) |
| **v17-D12** | `seq` mal typé | **Refus strict en `400`** : chaîne, décimal, booléen, `null`, valeur hors des entiers 64 bits, objet ou tableau ; aucune conversion implicite (§ 30.3) |
| **v17-D13** | Acquittement inférieur ou égal à la valeur enregistrée, y compris sous le repère de purge | **Accepté** : `200`, `acknowledgedSeq` = valeur réellement enregistrée, jamais de recul ; la lecture suivante du flux garde son comportement (`410 CURSOR_EXPIRED` si `after` est sous le repère) |
| **v17-D14** | Ordre de la limite de débit | La limite est appliquée **avant l'analyse du corps** ; un appel refusé reçoit `429 RATE_LIMITED` avec `Retry-After` (conventions de G16) ; un corps illisible compte donc dans la limite |
| **v17-D15** | Migration | Migration d'entreprise, **numéro attribué à l'implémentation** (Q4), et script de retour associé. Le retour arrière supprime les acquittements : par sécurité, la purge reste bloquée pour les liaisons actives ou suspendues jusqu'à leurs nouveaux acquittements (v17-D4) |
| **v17-D16** | Durée d'un passage de purge | Nombre maximal de lots et durée maximale **configurables** ; la durée est vérifiée **entre** deux lots : un lot commencé est mené à son terme, jamais interrompu par la limite ; aucun nouveau lot ne commence après le dépassement ; chaque lot validé reste acquis et le passage suivant reprend depuis le repère |

### 30.3 Acquittement : `POST /catalog/changes/ack`

- Portée `catalog:read` ; liaison **exclusivement** celle du jeton authentifié, entreprise courante celle de la liaison (chaîne d'intégration, G6, G7) ; aucun identifiant de liaison ni d'entreprise lu dans la requête.
- Statuts de liaison (chaîne existante) : inconnue, d'un autre client ou en attente : `401 INVALID_TOKEN` ; révoquée : `401 LINK_REVOKED` ; suspendue : `403 LINK_SUSPENDED` (v14-D10), son dernier acquittement reste enregistré et continue de compter dans la purge (D5).
- **Ordre de traitement** (v17-D14) : chaîne de sécurité, puis limite de débit, puis lecture du corps, puis validation, puis enregistrement. Spring MVC lit un paramètre `@RequestBody` **avant** d'appeler la méthode du contrôleur : pour respecter cet ordre, le corps devra être lu par la méthode elle-même, après la limite (mécanisme à réaliser à l'implémentation, comme la lecture manuelle des paramètres de G16). Le type de contenu est donc contrôlé par la route (`415`) ; la route ne doit **pas** déclarer `consumes` : la chaîne d'intégration ne trouverait alors aucune règle pour un autre type de contenu et répondrait `403` au lieu de `415` (`IntegrationSecurityConfig.ScopedEndpoints`, lu le 2026-11-02).
- **Corps** (v17-D12), objet JSON `{"seq": <entier>}` :

  | Corps reçu | Réponse |
  |---|---|
  | `seq` entier de 0 à 2⁶³ − 1 | Traité |
  | `seq` absent ou `null` | `400 VALIDATION_FAILED`, champ `seq` dans `errors` |
  | `seq` entier négatif | `400 VALIDATION_FAILED`, champ `seq` dans `errors` |
  | `seq` chaîne, décimal (`1.5`, `1.0`), booléen, objet, tableau, ou entier hors des 64 bits | `400 MALFORMED_REQUEST` |
  | Corps absent, vide, illisible, ou autre chose qu'un objet JSON | `400 MALFORMED_REQUEST` |
  | Corps de plus de 1 024 octets | `413 CONTENT_TOO_LARGE` (choix E2, § 30.10 ; RFC 9110 § 15.5.14, comme `FILE_TOO_LARGE`) |
  | Type de contenu absent, ou autre que `application/json` (paramètres comme `charset` admis) | `415 UNSUPPORTED_MEDIA_TYPE` |

  Le message nomme le champ, jamais la valeur reçue ; aucune valeur dans les journaux (G15). Champs inconnus : ignorés (choix effectif E1, § 30.10 ; *première rédaction : [Proposé]*) ; un objet sans `seq` (`{"autre": 1}`) répond donc `VALIDATION_FAILED` sur `seq`. Répartition des deux codes vérifiée par `CatalogAckRouteIT` (§ 30.10).
- Enregistrement : une seule instruction atomique, `acknowledged_seq = greatest(valeur enregistrée, seq reçu)` ; un acquittement ne recule jamais ; un `seq` inférieur ou égal à la valeur enregistrée, même sous le repère de purge, répond `200` avec la valeur enregistrée (v17-D13) ; rejouer l'appel donne le même résultat.
- `seq` supérieur au `last_seq` du flux : `409 CURSOR_AHEAD` (v17-D6), rien n'est enregistré.
- Limite : v17-D7 ; compteurs inaccessibles : `503 RATE_LIMIT_UNAVAILABLE`, rien n'est enregistré.
- **[Proposé] Règle du consommateur** (JCMB) : n'acquitter que des événements appliqués, jamais avant la fin de l'instantané initial.

### 30.4 Purge

**Calcul de la borne d'un passage**, dans cet ordre (v17-D11) :

1. **Plafond** : lire `last_seq` dans la base de l'entreprise (`integration_feed_state`). Cette valeur, notée `P`, est conservée sans changement pendant tout le passage.
2. **Liaisons** : lire dans la base plateforme les liaisons `ACTIVE` ou `SUSPENDED` de l'**entreprise courante** (contexte d'entreprise du passage), après l'étape 1. Les liaisons révoquées sont exclues ; leurs lignes d'acquittement sont ignorées.
3. **Acquittements** : `AckSource` lit, dans la base de l'entreprise, les acquittements de ces liaisons et renvoie l'un de trois cas (au lieu d'un `OptionalLong`) :

   | Cas | Liaisons `ACTIVE` ou `SUSPENDED` | Limite `A` |
   |---|---|---|
   | Aucune liaison | aucune (dernière liaison révoquée, v12-D4) | pas de limite d'acquittement |
   | Bloquée | au moins une sans acquittement (v17-D4) | **rien n'est purgeable** ; le passage s'arrête |
   | Acquittée | toutes ont un acquittement | `A` = plus petit acquittement |

4. **Borne** `B` = le minimum de : `P` ; `MAX(seq) − 1` (v11-D1 : l'événement de plus grand `seq` est conservé) ; premier `seq` de moins de 90 jours − 1 (D5) ; `A` s'il existe. `B` n'est jamais relevée pendant le passage. Si `B ≤ repère`, rien n'est purgeable.

**Bornes incluses** : un passage ne supprime que les événements séquencés tels que **`repère < seq ≤ B`**, dans l'ordre des `seq` (préfixe contigu, v12-D3 d) ; un événement sans `seq` n'est jamais supprimé (v17-D9). Le repère `purged_through_seq` est le plus haut `seq` supprimé ; après chaque lot validé, **repère = plus petit `seq` restant − 1** (v11-D1), et il ne recule jamais. Exemple : avec un acquittement `A`, la purge peut aller jusqu'à `A` inclus ; le repère vaut alors au plus `A`, et une lecture avec `after = A` reste acceptée (égalité, v9-D1).

**Lots autonomes (v17-D10, v17-D16)** :

1. Chaque lot a sa transaction courte : verrou de la ligne d'état du flux (`FOR UPDATE`, `lock_timeout`), suppression d'au plus `batch-size` événements (les plus petits `seq` de l'intervalle), mise à jour du repère au plus grand `seq` supprimé, dans la **même** transaction.
2. Erreur pendant un lot : **retour arrière complet de ce lot** ; les lots déjà validés restent acquis ; le passage s'arrête ; le suivant recalcule sa borne et reprend depuis le repère, sans doublon ni perte.
3. Aucun verrou conservé entre deux lots (le séquenceur, en `SKIP LOCKED`, n'est retardé que le temps d'un lot).
4. Nombre maximal de lots et durée maximale **configurables** ; la durée est vérifiée entre deux lots (v17-D16).
5. **Simulation** : même ordre de lecture, même plafond, même borne, mêmes critères de sélection ; elle compte les événements éligibles et les lots qui seraient faits, sans rien supprimer ni avancer le repère. Elle **ne reproduit pas** la prise de verrou ni ses délais (`lock_timeout`).
6. Purge désactivée et en simulation par défaut (inchangé) ; G17 n'active pas la purge.

### 30.5 Activation d'une liaison pendant une purge

**Exigence** (précision du responsable) : une liaison activée pendant une purge ne perd aucun événement dont elle a besoin. Elle doit être **démontrée par un test d'intégration** sur le fonctionnement réel de l'activation et de l'instantané ; tant qu'elle ne l'est pas, la purge réelle n'est pas autorisée.

**Faits du code (lecture seule, 2026-11-02)** :

- L'instantané fixe `asOfSeq` = `last_seq`, lu dans la transaction de sa première page, après un passage du séquenceur (`SnapshotService.read`).
- `last_seq` ne décroît jamais : le séquenceur l'augmente ; la réparation (§ 24.2) le recrée à `MAX(seq)`, et l'événement de plus grand `seq` n'est jamais purgé.
- Tout `seq` attribué est inférieur ou égal à `last_seq` ; un acquittement aussi (refusé au-delà, v17-D6).
- L'activation (`OAuthService.exchangeCode`) lève d'abord le drapeau de publication (base de l'entreprise), puis active la liaison (base plateforme).

**Faille de la première rédaction** : elle supposait la borne lue à un seul instant. Or la liste des liaisons (base plateforme) et les acquittements (base de l'entreprise) sont lus séparément. Contre-exemple : la purge lit la liste sans L ; L est activée et lit sa première page (`asOfSeq` = 100) ; une autre liaison acquitte 150 ; la purge lit ensuite les acquittements et obtient une borne de 150 : les événements 101 à 150, nécessaires à L, deviennent supprimables. La règle des 90 jours rend ce cas improbable, sans le rendre impossible.

**Démonstration corrigée** (v17-D11). Instants :

| Instant | Événement |
|---|---|
| `tL` | la purge lit `last_seq` : plafond `P = last_seq(tL)` |
| `tR` (> `tL`) | la purge lit la liste des liaisons `ACTIVE` ou `SUSPENDED` |
| `tA` (> `tR`) | la purge lit les acquittements |
| `t0` | L est activée (commit dans la base plateforme) |
| `t1` (> `t0`) | L lit sa première page d'instantané : `asOfSeq = last_seq(t1)` |

| Cas | Ce que voit la purge | Pourquoi L ne perd rien |
|---|---|---|
| `t0 ≤ tR` | L, sans acquittement (L n'a pas encore pu acquitter, ou son premier acquittement est postérieur à sa première page) | Si L n'a pas d'acquittement à `tA` : purge bloquée (v17-D4). Si L a déjà acquitté `a` à `tA` : `a` ≥ son `asOfSeq` (règle du consommateur) et la borne ≤ `a`, et rien de ce que L a encore à lire n'est au-dessous ; si L acquitte trop tôt, le risque est le sien seul (v17-D8) |
| `t0 > tR` | pas L | L a été activée après `tR`, donc après `tL` ; sa première page est lue à `t1 > t0 > tL` ; `last_seq` ne décroissant pas, `asOfSeq = last_seq(t1) ≥ last_seq(tL) = P`. La borne étant ≤ `P`, tout `seq` supprimé est ≤ `P` ≤ `asOfSeq` : aucun événement postérieur à l'instantané de L n'est supprimé, et sa lecture du flux depuis `asOfSeq` ne reçoit pas `410` (repère ≤ `P` ≤ `asOfSeq`) |

**Conditions d'implémentation** dont dépend la garantie : (a) `P` lu **avant** la liste des liaisons, dans une instruction distincte validée avant la lecture de la liste ; (b) borne ≤ `P`, calculée une fois par passage et jamais relevée ; (c) acquittement refusé au-delà de `last_seq` ; (d) `last_seq` jamais décroissant ; (e) liaison active ou suspendue sans acquittement bloquante.

**Statut** : démonstration **théorique**, fondée sur la lecture du code ; elle **ne vaut pas garantie** tant que le test de concurrence (§ 30.7, test 1) ne passe pas. Si ce test échoue, une protection transactionnelle ou une synchronisation entre activation et purge est requise avant toute purge réelle. *— 2026-11-03 : test écrit, rouge sur l'algorithme du lot 1, vert sur l'implémentation G17 (§ 30.10). La garantie est démontrée pour le scénario reproduit ; la purge réelle reste désactivée et son activation relève de G20.*

**Restauration d'une base d'entreprise** : flux et acquittements sont restaurés ensemble ; une liaison créée après la sauvegarde n'a pas d'acquittement dans la base restaurée et bloque la purge (sans danger) ; une liaison révoquée depuis est exclue par son statut.

### 30.6 Table des acquittements (conventions)

- Table `integration_link_ack` de la base de l'entreprise ; migration d'entreprise, **numéro attribué à l'implémentation**, et script de retour associé (v17-D15). *— Attribués le 2026-11-03 : `V052__integration_link_ack.sql` et `db/rollback/U052__integration_link_ack.sql`.*
- Colonnes : `link_id uuid` **clé primaire** (une ligne par liaison) ; `acknowledged_seq bigint NOT NULL` avec `CHECK (acknowledged_seq >= 0)` ; `acknowledged_at timestamptz NOT NULL`.
- **Aucune clé étrangère** vers la base plateforme (autre base), comme `integration_link_warehouse.link_id` (v11-D8).
- Commentaires sur la table et sur chaque colonne ; conventions vérifiées par `SchemaConventionsIT`.
- Les lignes des liaisons révoquées sont conservées et ignorées par la purge (§ 30.4, étape 2).
- `acknowledged_at` est mis à jour à chaque acquittement accepté, même sans progression (choix effectif E4, § 30.10).
- Retour arrière : destructif, sans danger (v17-D15).

### 30.7 Étape G17 (après validation de ce relevé)

**Tests bloquants avant toute autorisation de purge réelle**, dans cet ordre ; le test 1 est le **premier écrit** de G17 :

1. **Concurrence activation, instantané, purge** : reproduit le contre-exemple du § 30.5 avec des points d'arrêt pilotés par le test (lecture du plafond, lecture de la liste des liaisons, activation réelle, première page réelle d'instantané, acquittement d'une autre liaison, lecture des acquittements, suppression) ; échoue si la borne n'est pas plafonnée par `P`.
2. **Plafond** : la borne ne dépasse jamais `last_seq` lu avant la liste des liaisons.
3. **Curseur de l'instantané** : après la suppression, la lecture du flux depuis `asOfSeq` répond `200`, jamais `410`.
4. **Repère après chaque lot** : égal au plus petit `seq` restant − 1 après chaque commit ; jamais en recul.
5. **Reprise après interruption** : lot en erreur annulé seul, lots précédents acquis, passage suivant sans doublon ni perte ; limites de lots et de durée (lot commencé mené à son terme).
6. **Isolation entre entreprises** : l'acquittement de A n'écrit que dans la base de A ; la purge de B ignore les liaisons et acquittements de A.
7. **Simulation** : même borne et même nombre d'événements éligibles que la suppression, sans suppression ni avancée du repère.

**Autres tests d'abord** :

| Contenu | Tests |
|---|---|
| Migration d'entreprise et script de retour (§ 30.6) | Conventions de schéma ; aller-retour ; purge bloquée après le retour arrière |
| `POST /catalog/changes/ack` (§ 30.3) | Montée, jamais de recul, rejeu ; chaque ligne du tableau des corps ; `409` ; `401` (révoquée) ; `403` (suspendue, sans portée) ; `429` au 61ᵉ appel, corps illisible compté ; `503` ; acquittements simultanés : le plus grand l'emporte ; aucune valeur dans les journaux |
| `AckSource` (§ 30.4) | Aucune liaison ; liaison sans acquittement ; plus petit acquittement ; révoquée ignorée ; suspendue comptée ; entreprise courante seulement |
| Bornes de la purge | `repère < seq ≤ B` ; 90 jours ; plus grand `seq` conservé ; événements sans `seq` conservés ; séquenceur bloqué au plus un lot |
| Contrat | Route classée parmi les routes de liaison (`OpenApiDocumentationIT`) ; portée couverte (`EndpointSecurityCoverageIT`) ; lint |

Hors G17 : route interne et cron, métriques et alertes (G20) ; événements sans `seq` après la dernière révocation (G20, v17-D9) ; filtre de l'instantané (G18, v17-D1).

### 30.8 Changements du contrat (`integration-v1.openapi.yaml`)

- `POST /catalog/changes/ack` réécrit (§ 30.3) : `409 CURSOR_AHEAD` au lieu de `422` ; ordre de traitement et limite avant le corps ; tableau des corps refusés ; `400`, `401`, `403`, `404`, `415`, `429`, `500`, `503` détaillés ; `acknowledgedSeq` obligatoire.
- `GET /catalog/changes` : phrase « rétention et règle de purge : ouvertes (C8) » remplacée par un renvoi à D5 et au § 30.4.
- Bloc `x-decisions.v17`, décisions et propositions séparées.

### 30.9 Ce qui n'a pas été fait

- Aucun code, migration, test ni configuration modifié ; dépôts applicatifs lus seulement.
- Les tests du § 30.7 ne sont pas écrits : ils font partie de G17.
- Aucun commit, push ou déploiement.

*Ce § 30.9 décrit l'état du relevé avant l'implémentation ; l'état au 2026-11-03 est au § 30.10.*

### 30.10 G17 réalisée (2026-11-03)

Backend GestStock, branche `feat/integration-lot2`, sur `b940204` ; **non commité au moment de cette rédaction, non déployé**. Purge réelle toujours **désactivée** et en **simulation** par défaut.

**Composants**

| Élément | Rôle |
|---|---|
| `V052__integration_link_ack.sql`, `db/rollback/U052__integration_link_ack.sql` | Table `integration_link_ack` (§ 30.6) ; retour arrière destructif, sans danger (v17-D15) |
| `AckFloor` (nouveau) | Limite des acquittements, trois cas : `NoLink`, `Blocked`, `Acknowledged(seq)` |
| `AckSource` (modifié) | Renvoie un `AckFloor` (remplace l'`OptionalLong` du lot 1) ; `NoAcknowledgements` supprimé |
| `RetainedLinks` (nouveau) | Liaisons `ACTIVE` ou `SUSPENDED` de l'entreprise, lues dans la base plateforme ; composant distinct, observable par les tests |
| `LinkAcknowledgements` (nouveau) | Acquittement atomique (`greatest`), jamais en recul ; `CURSOR_AHEAD` au-delà de `last_seq` ; lecture des acquittements d'un ensemble de liaisons |
| `LinkAckSource` (nouveau) | `AckSource` réelle : entreprise du contexte (refus sans contexte), liaisons, puis acquittements |
| `OutboxPurge` (modifié) | Plafond `P` lu en premier, puis `AckSource`, puis borne calculée une fois ; un lot par transaction ; limites de lots et de durée ; simulation identique |
| `PurgeReport`, `IntegrationPurgeProperties` (modifiés) | Champs `ceilingSeq`, `floor`, `batches` ; réglages `max-batches` (100 par défaut) et `max-duration` (30 s par défaut) |
| `CatalogChangesController` (modifié) | Route `POST /catalog/changes/ack` (§ 30.3) ; contrôle de débit commun aux deux routes |
| `IntegrationRateLimitProperties` (modifié) | Réglage `catalog-ack-per-link` (60 par défaut) |

**Borne et lots, tels qu'implémentés** : conformes aux § 30.4 et v17-D11. `P` est lu par une instruction distincte, hors transaction, avant l'appel à `AckSource` ; la borne est calculée dans une transaction en lecture seule et n'est plus relevée ; chaque lot ouvre sa transaction (verrou de la ligne d'état avec `lock_timeout`, suppression, repère), et une erreur l'annule seul puis arrête le passage, l'exception remontant à l'appelant ; la durée maximale est vérifiée avant chaque lot sauf le premier.

**Choix de l'implémentation** (non tranchés par v17-D1 à v17-D16 ; arrêtés le 2026-11-03 selon les bonnes pratiques, à la demande du responsable) :

| # | Choix [Approuvé] | Raison |
|---|---|---|
| E1 | Champs inconnus du corps de l'acquittement **ignorés** ; un objet sans `seq` répond `VALIDATION_FAILED` sur `seq` | Comportement du reste de l'API ; évolution du client sans rupture ; la rigueur porte sur `seq` (type, clé répétée). Était [Proposé] |
| E2 | Corps de l'acquittement limité à **1 024 octets** ; au-delà : **`413 CONTENT_TOO_LARGE`** (nouveau code d'erreur) | Le corps attendu tient en quelques dizaines d'octets et il est lu par la route (v17-D14). RFC 9110 § 15.5.14 et convention de l'API (`FILE_TOO_LARGE`, `413`) : un corps trop grand n'est pas un corps mal formé. *Première implémentation : `400 MALFORMED_REQUEST`, corrigée le 2026-11-03 (rouge constaté : `400` au lieu de `413`)* |
| E3 | `max-duration` nulle : le **premier lot a toujours lieu**, puis le passage s'arrête | Conséquence directe de v17-D16 (durée vérifiée entre deux lots, lot commencé mené à son terme) : une durée nulle signifie « un lot par passage » ; la refuser n'apporterait rien |
| E4 | `acknowledged_at` mis à jour à **chaque acquittement accepté**, même sans progression | Mesure la dernière activité de la liaison : une liaison active dans une entreprise sans nouvel événement réacquitte la même valeur et ne doit pas paraître à l'arrêt. Le **retard** (écart `last_seq` − acquittement, âge du plus ancien événement non acquitté) se calcule séparément à partir des `seq` et de `created_at`, pour les métriques de G20 (v17-D5) |

**Rouge de comportement constaté avant la modification**

| Tests | Rouge | Après |
|---|---|---|
| `CatalogAckRouteIT` (11 tests à ce moment) et le cas 503 | `403` (route absente) | Verts |
| `OutboxPurgeIT` (7 tests), sur l'algorithme du lot 1 adapté aux nouveaux types | Pas de plafond, une seule transaction, pas de limites de lots ni de durée | Verts |
| `PurgeActivationRaceIT`, sur les vrais composants | `P` non lu, borne 7, événements 6 et 7 supprimés, repère 7, `CURSOR_EXPIRED` pour L | Vert |

**Test de concurrence** (`PurgeActivationRaceIT`, § 30.7, test 1) : tout réel (purge en mode `DELETE` sur la base Testcontainers, `RetainedLinks` espionné pour arrêter la purge juste après sa lecture réelle de la liste, activation, première page d'instantané, acquittement enregistré dans la table). Résultats vérifiés sur les données : `P` = 5 ; `asOfSeq` de L = 5 ; acquittement de l'autre liaison = 8 ; borne = 5 ; événements 6, 7 et 8 conservés ; repère = 5 ; lecture de L depuis 5 sans `410` ; passage suivant bloqué (L visible sans acquittement), rien supprimé. Synchronisation par verrous à compte, sans délai arbitraire ; événements antidatés de 100 jours pour écarter la règle des 90 jours.

**Autres tests** : `CatalogAckRouteIT` (13 tests, deux entreprises réelles : montée et non-recul, rejeu, acquittement sous le repère, `409`, corps stricts, `415`, statuts de liaison, isolation, limite de 60 avec corps illisibles comptés, 20 acquittements simultanés, journaux ; le 13ᵉ, ajouté à la clôture documentaire, vérifie la limite de 1 024 octets et les champs inconnus ignorés : écrit d'abord comme test de caractérisation, puis modifié pour E2, avec un rouge constaté — `400` au lieu de `413` — avant la correction), `LinkAckSourceIT` (4 tests), `OutboxPurgeIT` (13 tests dont 6 nouveaux : plafond, aucune liaison et purge bloquée, limite de lots, durée nulle, lot en erreur annulé seul puis reprise, simulation identique), `IntegrationRateLimitUnavailableIT` (cas 503 de l'acquittement), `OpenApiDocumentationIT`, `SchemaConventionsIT` (nouvelle table), `MigrationRollbackIT` (aller-retour avec U052).

**`./mvnw verify` complet** (Docker, Testcontainers PostgreSQL 17), trois passages :

| Passage | Tests unitaires | Tests d'intégration | Résultat |
|---|---|---|---|
| 1 | 281, aucun échec | 1 209 ; 4 erreurs ; 2 ignorés | `PublicationFlagTimeoutIT` : conteneur `postgres:17-alpine` non démarré (contexte non chargé) ; relancée seule, la classe passe (4 sur 4) |
| 2 | 281, aucun échec | 1 209 ; 1 échec ; 2 ignorés | `AppointmentApiIT` : transaction expirée après un blocage d'environ 5 minutes, hors du périmètre de G17 ; vert aux passages 1 et 3 |
| 3 | 281, aucun échec | 1 209 ; **aucun échec ni erreur** ; 2 ignorés | **BUILD SUCCESS** |

Les échecs des passages 1 et 2 sont attribués à l'infrastructure locale (Docker, ressources de la machine) ; cette attribution n'est pas prouvée. Les 2 tests ignorés sont ceux qui ne s'exécutent qu'à la demande.

**Limites connues**

- Le temps d'attente du séquenceur pendant un lot (au plus un lot, en `SKIP LOCKED`) n'est **pas mesuré** par un test.
- La purge réelle n'a été exécutée que sur la base de test ; son déclenchement en production (route interne et cron), les métriques et l'alerte d'âge des acquittements relèvent de G20.
- Événements sans `seq` après la révocation de la dernière liaison : conservés (v17-D9), décision en G20.
- **[Proposé]** Règle du consommateur (n'acquitter que des événements appliqués, jamais avant la fin de l'instantané initial) : à reprendre côté JCMB (J7).

## 31. G18 réalisée — instantané du catalogue par HTTP — 2026-11-03

Backend GestStock, branche `feat/integration-lot2`, commit `58c4278` ; **non déployé**. Route `GET /catalog/snapshot` (portée `catalog:read`) sur le service d'instantané du lot 1 (`SnapshotService`, C3, v11-D10).

### 31.1 Décisions du 2026-11-03

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **G18-D1** | Disponibilité sans la portée `stock:read` (v17-D1) | Le champ `availability` est **absent** de chaque page : absent signifie « non autorisé », jamais « section vide » ni « disponibilité 0 » (le contrat donnait à un produit absent de `availability` une disponibilité 0). L'instantané **s'arrête après `productImages`** ; la disponibilité n'est pas calculée. `availability` retiré des champs obligatoires de `SnapshotPage` |
| **G18-D2** | Jeton de page placé sur la section `availability`, présenté sans `stock:read` (jeton d'accès demandé ensuite avec moins de portées) | `200`, **dernière page vide**, sans `nextPageToken` ni quantité : rien n'est divulgué, l'instantané se termine normalement |

### 31.2 Réalisation

| Élément | Changement |
|---|---|
| `SnapshotService` | `read(link, pageToken, limit, withAvailability)` : sans la disponibilité, la section n'est ni calculée ni parcourue (fin après `productImages`), et un jeton placé sur elle donne une page vide. `read(link, pageToken, limit)` du lot 1 inchangée (disponibilité servie) |
| `CatalogChangesController` | Route `GET /catalog/snapshot` ; lecture manuelle des paramètres (comme G16), commune aux trois routes ; vue `SnapshotPageView` (champ `availability` omis sans `stock:read`, `toString` sans le jeton de page) |
| `IntegrationRateLimitProperties` | `catalog-snapshot-per-link` : 60 par défaut (v13-D4), compteur propre, compté avant la lecture des paramètres |

Réponses : `400 INVALID_PAGE_TOKEN` (jeton illisible, altéré, vide, de plus de 512 caractères ou d'une autre liaison), `400 INVALID_PARAMETER` (paramètre répété, `limit` non entier), `400 VALIDATION_FAILED` (`limit` hors de 1..500), `401`, `403` (`INSUFFICIENT_SCOPE`, `LINK_SUSPENDED`, `COMPANY_*`), `404` (liaisons désactivées), `410 SNAPSHOT_EXPIRED`, `429 RATE_LIMITED` avec `Retry-After`, `500`, `503` (`RATE_LIMIT_UNAVAILABLE`, `SCHEMA_UPGRADE_*`, `SERVICE_CAPACITY_REACHED`) ; `Cache-Control: no-store`.

### 31.3 Tests

**Rouge de comportement constaté avant la modification** :

1. Avant la route : les 10 tests de `CatalogSnapshotRouteIT` reçoivent `403` (route absente).
2. Route écrite, service encore sans filtre : le test « fin après `productImages` » échoue (pages vides supplémentaires). La première version de ce test ne détectait pas l'absence du filtre, la vue masquant déjà le champ ; elle a été renforcée avant d'écrire le filtre.

**`CatalogSnapshotRouteIT`** (10 tests, entreprises A et B réelles, catalogue de B maîtrisé) : sans `stock:read`, aucun champ `availability`, aucune quantité, fin après `productImages` ; avec `stock:read`, champ présent sur chaque page et un élément par produit ; jeton placé sur la disponibilité présenté sans `stock:read` : page vide finale ; isolation A / B et reprise du flux après `asOfSeq` ; jeton d'une autre liaison, altéré, trop long ou vide ; paramètres répétés, non entiers, hors bornes ; portée, suspension, absence de jeton ; 61ᵉ appel refusé sans toucher au flux ni à une autre liaison ; aucune valeur reçue dans les journaux. **Limite** : le `410 SNAPSHOT_EXPIRED` est vérifié par HTTP au moyen d'une doublure du service ; la règle des 24 heures elle-même est couverte par `SnapshotServiceIT`.

**Autres** : `IntegrationRateLimitUnavailableIT` (cas 503 de l'instantané), `OpenApiDocumentationIT` (route de liaison) ; `SnapshotServiceIT`, `CatalogChangesRouteIT` et `CatalogAckRouteIT` inchangés et verts (mise en commun de la lecture des paramètres sans effet sur le flux ni l'acquittement).

**`./mvnw verify`** complet (Docker, Testcontainers PostgreSQL 17), premier passage : 281 tests unitaires et 1 221 tests d'intégration, aucun échec ni erreur, 2 ignorés (exécutés à la demande seulement) : **BUILD SUCCESS**.

### 31.4 Changements du contrat (`integration-v1.openapi.yaml`)

- `GET /catalog/snapshot` : portée et disponibilité (G18-D1, G18-D2), paramètres, `400` détaillé, `404`, `500`, `503` détaillé, `429` à compteur propre, `Cache-Control: no-store`, `HEAD` implicite.
- `SnapshotPage` : `availability` retiré des champs obligatoires, absent sans `stock:read`.
- Bloc `x-decisions.v17.g18`.

### 31.5 Ce qui n'a pas été fait

- Aucun déploiement, aucun push.
- Côté JeCréeMaBoutique, le consommateur (J7, J8) devra traiter l'absence du champ `availability` comme « non autorisé ».

## 32. G19 réalisée — image d'un produit — 2026-11-03

Backend GestStock, branche `feat/integration-lot2`, sur `58c4278` ; **non commité au moment de cette rédaction, non déployé**. Route `GET /catalog/products/{productId}/image` (portée `catalog:read`), sur le service de photo existant (`ProductImageService.get`). Aucune migration.

### 32.1 Constat (audit du 2026-11-03)

Les images sont stockées **dans la base de chaque entreprise** (table `product_image`, V046), sans fichier, stockage objet ni URL externe : JPEG ré-encodé par le serveur à l'envoi (512 px de côté au plus, métadonnées retirées, type reconnu sur le contenu), au plus une image par produit, empreinte SHA-256 enregistrée. Cette empreinte est la valeur `imageSha256` des événements `PRODUCT_IMAGE` et de la section `productImages`, écrite dans la même transaction (P6, P7). Fichier absent, image corrompue ou type interdit : sans objet (contraintes de la base).

### 32.2 Décisions du 2026-11-03

| # | Objet | Décision [Approuvé] |
|---|---|---|
| **G19-D1** | Format | Image **JPEG binaire**, pas d'URL (révocation immédiate, aucun chemin exposé, aucune clé de signature de plus) |
| **G19-D2** | Cache et validation | `ETag` fort = empreinte SHA-256 ; `If-None-Match` correspondant : `304` sans corps ; `Cache-Control: no-store` conservé ; pas de `Last-Modified` |
| **G19-D3** | Introuvable | Un seul `404 PRODUCT_IMAGE_NOT_FOUND` pour un produit inexistant, d'une autre entreprise ou sans image |
| **G19-D4** | Produit archivé | Image servie (cohérent avec l'instantané, qui sert les produits archivés) |
| **G19-D5** | Identifiant | Forme canonique `8-4-4-4-12` exigée (majuscules admises) ; sinon `400 INVALID_PARAMETER`, sans la valeur ; lu par la route, et non converti par Spring (dont la conversion cite la valeur refusée dans ses journaux) |
| **G19-D6** | Débit | 120 appels par minute et par liaison, `304` compris, compteur propre (`catalog-image-per-link`) |
| **G19-D7** | Négociation | Erreurs en `application/problem+json` quel que soit `Accept` |
| **G19-D8** | En-têtes | `Content-Type: image/jpeg`, `Content-Length`, `ETag`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` ; `HEAD` implicite |
| **G19-D9** | Concurrence flux / téléchargement | Le client enregistre l'`ETag` **reçu**, pas l'empreinte de l'événement |

### 32.3 Écarts trouvés pendant l'implémentation

| Écart | Traitement |
|---|---|
| Le journal de la chaîne d'intégration (`IntegrationSecurityConfig`) écrivait le **chemin reçu**, en INFO pour un refus (donc en production) et en DEBUG pour un accès autorisé ; G19 est la première route d'intégration qui reçoit une valeur dans son chemin | **Corrigé** : le journal écrit le modèle de route (`…/products/{productId}/image`), jamais le chemin reçu |
| `operationId` `getProductImage` de l'ébauche déjà attribué à `GET /api/products/{id}/image` (doublon `getProductImage_1`) | Route nommée **`getCatalogProductImage`** (code et contrat) |
| `If-None-Match: *` donne `200`, pas `304` (Spring MVC 7 ; RFC 9110 prévoirait `304`) | **Non tranché par une décision** : comportement standard conservé, comme l'API principale ; documenté et vérifié par le test ; le client envoie l'empreinte qu'il détient |

### 32.4 Tests

**Rouge de comportement constaté avant la modification** : les 9 tests de `CatalogImageRouteIT` et le cas 503 reçoivent `403` (route absente). Pendant l'implémentation, le contrôle des journaux a fait apparaître l'écart du journal de la chaîne (§ 32.3).

**`CatalogImageRouteIT`** (9 tests, entreprises A et B réelles) : image servie (octets, `ETag`, `nosniff`, `no-store`, `Content-Length`) ; `304` pour l'empreinte exacte, dans une liste ou en `ETag` faible, `200` pour une autre empreinte et pour `*` ; image remplacée ; produit archivé ; même `404` pour un produit inexistant, de l'autre entreprise ou sans image ; identifiants non canoniques refusés sans la valeur, majuscules acceptées ; `Accept: image/jpeg` sur une erreur ; statuts de liaison et portée ; 121ᵉ appel refusé, `304` compris, sans toucher à l'instantané ni à une autre liaison ; aucune valeur reçue dans les journaux. **Limite** : le contrôle des journaux laisse de côté, en les nommant, la ligne de requête de Spring Security et l'écriture du corps de réponse par Spring MVC (le champ `path` d'une `ApiError` renvoie au client son propre chemin, RFC 9457), en DEBUG et TRACE seulement (v17-D2) ; sous MockMvc, `TestDispatcherServlet` est limité à INFO comme `DispatcherServlet` en production.

**Autres** : `IntegrationRateLimitUnavailableIT` (cas 503 de l'image), `OpenApiDocumentationIT` (route de liaison), `IntegrationSecurityChainIT` et `IntegrationLinkAccessIT` verts après la correction du journal.

**`./mvnw verify`** complet (Docker, Testcontainers PostgreSQL 17), premier passage : 281 tests unitaires et 1 231 tests d'intégration, aucun échec ni erreur, 2 ignorés (exécutés à la demande seulement) : **BUILD SUCCESS**.

### 32.5 Conséquences pour JeCréeMaBoutique (J9)

Comparer `imageSha256` du flux à l'empreinte détenue avant de télécharger ; envoyer `If-None-Match` avec l'`ETag` détenu et `Accept: image/jpeg, application/problem+json` ; enregistrer l'`ETag` reçu (G19-D9) ; `404` : pas d'image ; respecter la limite de 120 par minute et `Retry-After`.

### 32.6 Changements du contrat (`integration-v1.openapi.yaml`)

- `GET /catalog/products/{productId}/image` réécrit : `getCatalogProductImage`, règles G19-D1 à G19-D9, `If-None-Match: *`, réponses `400`, `404` détaillé, `429`, `500`, `503`, en-têtes.
- Bloc `x-decisions.v17.g19`.

### 32.7 Ce qui n'a pas été fait

- Aucun déploiement, aucun push ; le backend de G19 n'est pas commité au moment de cette rédaction.
