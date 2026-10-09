<div class="cover">
<div class="cover-kicker">Rapport d'audit — confidentiel</div>
<h1 class="cover-title">AUDIT — APPLICATION DE GESTION DE STOCK</h1>
<div class="cover-sub">Audit technique, fonctionnel, métier, UX/UI, sécurité et architecture<br>Vision cible et feuille de route d'évolution</div>
<table class="cover-meta">
<tr><td>Application</td><td>gestion-stock (« GestStock ») — magasin d'optique multi-dépôts</td></tr>
<tr><td>Dépôt analysé</td><td>branche <code>main</code>, commit <code>3945251</code> (« revu data et logique »)</td></tr>
<tr><td>Date de l'audit</td><td>3 octobre 2026</td></tr>
<tr><td>Périmètre</td><td>257 fichiers suivis, ~18 800 lignes (TS 12 624, HTML 3 381, SCSS 2 837)</td></tr>
<tr><td>Méthode</td><td>Lecture intégrale du code, build de production, exécution des tests, <code>npm audit</code>. Aucun fichier du projet n'a été modifié.</td></tr>
</table>
<div class="cover-score"><span>Maturité actuelle</span><strong>31 / 100</strong><em>Prototype fonctionnel avancé — non exploitable en production en l'état</em></div>
</div>

## Sommaire

1. Résumé exécutif
2. Présentation de l'application
3. Architecture actuelle
4. Cartographie des modules
5. Audit fonctionnel (métier)
6. Audit technique
7. Audit base de données
8. Audit API
9. Audit UX/UI
10. Audit sécurité
11. Audit performance
12. Audit tests
13. Audit qualité du code
14. Fonctionnalités manquantes
15. Recommandations
16. Architecture cible
17. Modèle métier cible
18. Workflows recommandés
19. Matrice Existant / Cible
20. Score de maturité
21. Registre des risques
22. Roadmap
23. Priorisation Impact / Effort
24. Conclusion
25. Annexes (conventions, preuves, méthode)

**Conventions de statut** : <span class="b ex">EXISTE</span> vérifié dans le code · <span class="b pa">PARTIEL</span> commencé mais incomplet · <span class="b ab">ABSENT</span> non trouvé · <span class="b pr">PROBLÉMATIQUE</span> présent mais défaillant · <span class="b ac">À CONFIRMER</span> invérifiable avec les éléments disponibles.

**Abréviation utilisée dans les preuves** : **MBI** = `src/app/core/interceptors/mock-backend.interceptor.ts` (le « backend simulé », 1 976 lignes). Les numéros de ligne sont ceux du commit `3945251`.

<div class="pb"></div>

## 1. Résumé exécutif

**Ce qu'est réellement l'application.** GestStock est une **application Angular 21 sans backend réel**. Toute la logique métier (stock, ventes, achats, caisse, crédit client, permissions) est exécutée **dans le navigateur**, par un intercepteur HTTP qui simule une API (`MBI`, 69 routes). Les données sont **en mémoire** : elles sont perdues à chaque rechargement de page et ne sont pas partagées entre postes. En production (`environment.prod.ts`), les mocks sont désactivés et l'application pointe vers `https://api.example.com/api`, **qui n'existe pas** : l'application de production est donc non fonctionnelle.

**Ce qui est solide.** Le périmètre fonctionnel couvert par l'interface est large et cohérent pour un commerce d'optique : produits, stock multi-dépôts, ventes détail/gros avec crédit client, commandes fournisseurs (réception, facture, paiements partiels), caisse (ouverture, opérations, clôture avec écart), inventaire, dépenses, rapports, journal d'audit, utilisateurs. L'architecture front (composants standalone, lazy loading, pattern *Feature → Facade → ApiService*) est propre et réutilisable. Le contrat d'API est déjà esquissé, et des schémas PostgreSQL/MongoDB existent (`src/app/core/mocks/seeds/`, `DATABASE_SCHEMA.md`).

**Ce qui bloque.**

1. **Aucun backend, aucune persistance** : c'est le chantier n°1, préalable à tout le reste.
2. **Sécurité inexistante dans les faits** : aucune route n'est protégée par un guard. En mode mock, toutes les requêtes s'exécutent avec les droits **admin**, car l'intercepteur JWT est placé après le mock. Le mot de passe est `admin` pour tous les comptes.
3. **Bug de stock critique** : la réception d'une commande fournisseur **n'augmente pas** le stock réellement utilisé (stock par dépôt). Le stock affiché et celui contrôlé à la vente divergent dès la première réception.
4. **Intégrité métier fragile** : prix et prix d'achat d'une vente envoyés par le client (marge falsifiable). Stock modifiable directement depuis la fiche produit, sans mouvement. Mouvements, ventes et inventaires sans dépôt rattaché. Ni annulation ni retour.
5. **Traçabilité de façade** : l'écran d'audit est riche, mais seules 2 actions sur 69 écrivent réellement dans le journal. Les 50 entrées visibles sont des données de démonstration.
6. **Tests quasi inexistants** : 2 tests, dont 1 en échec.

**Verdict.** L'existant est une **excellente maquette fonctionnelle** et une bonne base front. Il **n'est pas une application de gestion exploitable**. Une réécriture n'est pas nécessaire : il faut **construire le backend** (en transposant les règles déjà codées dans `MBI`), **brancher le front dessus** et **corriger le modèle de stock**. Effort estimé pour une V1 exploitable (phases 0 à 2) : **12 à 17 semaines-développeur**.

**Prochaine étape concrète** : valider la stack backend (recommandation : NestJS + PostgreSQL + Prisma, cohérent avec TypeScript et avec `sql-seed.sql`), puis réaliser en 2 semaines le « socle » (auth réelle, produits, stock par dépôt avec mouvements, transactions).

<div class="pb"></div>

## 2. Présentation de l'application

| Élément | Constat | Preuve |
|---|---|---|
| Domaine | Magasin d'optique (montures, verres, lentilles, accessoires, solutions) en Côte d'Ivoire, montants en FCFA | `src/app/core/mocks/mock-db.ts:29-35`, données clients/fournisseurs |
| Type | SPA Angular, interface en français | `package.json`, templates |
| Utilisateurs cibles | Admin, Gestionnaire, Caissier | `src/app/core/models/role.model.ts` |
| Multi-dépôts | 2 dépôts de démonstration (`wh_1` Magasin principal, `wh_2` Dépôt secondaire), sélecteur dans l'en-tête | `layout-shell.component.html`, `warehouse.interceptor.ts` |
| Backend | **Simulé** dans le navigateur (intercepteur HTTP) | MBI:388-392 |
| Persistance | **Mémoire uniquement** (variables `let mock…`), réinitialisée au rechargement | MBI:49-329 |
| Production | `useMocks: false` + `apiUrl: https://api.example.com/api` (factice) | `src/environments/environment.prod.ts` |
| Historique Git | 8 commits du 26/04/2026 au 12/05/2026 | `git log` |
| Documentation | `README.md` (générique Angular CLI), `TECHNICAL_AUDIT.md` (audit antérieur, mai 2026), `DATABASE_SCHEMA.md` (schéma MongoDB *reconstruit*) | racine du dépôt |

> **Note sur l'audit antérieur (`TECHNICAL_AUDIT.md`).** Il a été relu mais **pas pris pour acquis**. Chaque point a été revérifié. Plusieurs bugs qu'il signale sont **toujours présents** (B1, B3, B5, B6, B8, B10, B11, B12, B14, A1, A4, A5). D'autres ont évolué : `transactionsCount` est désormais renseigné (MBI:1865, mais non filtré par date), et `isAuthenticated()` vérifie maintenant l'expiration (`auth/services/auth.service.ts:77-86`), sans qu'aucun guard ne l'utilise.

<div class="pb"></div>

## 3. Architecture actuelle

### 3.1 Stack technique

| Couche | Technologie | Version installée | Remarque |
|---|---|---|---|
| Framework | Angular (standalone, control flow `@if/@for`) | 21.2.10 | Récent ; **vulnérabilités HIGH** signalées par `npm audit` pour < 21.2.19 |
| UI | Angular Material + CDK | 21.2.8 | Tables, paginator, sort, drawers, dialogs |
| État | RxJS `BehaviorSubject` + `combineLatest` (ViewModel observable) | rxjs 7.8 | Pas de store global ; signals marginaux |
| Graphiques | Chart.js | 4.4.x | Dashboard, rapports |
| Exports | xlsx (SheetJS) 0.18.5, jsPDF 4.2.1 | — | **xlsx : vulnérabilités HIGH sans correctif npm** |
| Tests | Vitest + jsdom via `@angular/build:unit-test` | vitest 4 | 1 fichier de test |
| Backend | **Aucun** — intercepteur `mockBackendInterceptor` | — | 69 routes simulées |
| Base de données | **Aucune** — schémas proposés non branchés | — | `sql-seed.sql` (20 tables, 11 index), `mongo-seed.js` |

### 3.2 Schéma d'architecture actuel

<div class="diagram">
<pre>
┌───────────────────────────── NAVIGATEUR ────────────────────────────────┐
│                                                                         │
│  Pages (15 features, lazy)  ──►  Facades (BehaviorSubject VM)           │
│                                       │                                 │
│                                       ▼                                 │
│                          ApiServices (HttpClient, 14)                   │
│                                       │                                 │
│        Chaîne d'intercepteurs (ordre réel, app.config.ts:21)           │
│        apiError ─► warehouse ─► mockBackend ─╳─► jwt (jamais atteint)   │
│                                       │                                 │
│                                       ▼                                 │
│        MBI : 69 routes, règles métier, RBAC, données EN MÉMOIRE         │
│        (mock-db.ts : 35 produits, 66 ventes, 2 dépôts, 4 utilisateurs)  │
└─────────────────────────────────────────────────────────────────────────┘
        Production : useMocks=false ─► https://api.example.com (inexistant)
</pre>
</div>

### 3.3 Patterns et stratégies

| Sujet | Stratégie actuelle | Évaluation |
|---|---|---|
| Séparation front/back | Contrat HTTP propre, mais le « back » vit dans le front | <span class="b pr">PROBLÉMATIQUE</span> |
| Organisation | `core/` (models, services, guards, interceptors, mocks) + `features/<module>/{data,pages,ui}` | <span class="b ex">EXISTE</span> bonne structure |
| Gestion d'état | Facade par feature, `vm$` combiné | <span class="b ex">EXISTE</span> cohérent mais verbeux |
| Validation | Reactive Forms côté UI + contrôles ad hoc dans MBI | <span class="b pa">PARTIEL</span> pas de schéma partagé |
| Authentification | JWT simulé non signé (`jwt.sim.ts`), tokens en `localStorage`/`sessionStorage` | <span class="b pr">PROBLÉMATIQUE</span> |
| Autorisation | `hasRole()` dans MBI ; guards écrits mais **jamais branchés** | <span class="b pr">PROBLÉMATIQUE</span> |
| Contexte dépôt | En-tête `X-Warehouse-Id` injecté sur toutes les requêtes | <span class="b ex">EXISTE</span> bonne idée, mal exploitée côté données |
| Erreurs | `apiErrorInterceptor` (snackbar global) + `toApiError` dupliqué dans 11 services | <span class="b pa">PARTIEL</span> |
| Persistance | Aucune | <span class="b ab">ABSENT</span> |

<div class="pb"></div>

## 4. Cartographie des modules

| Module | Route | Existence | État | Complétude | Observations (preuves) |
|---|---|---|---|---|---|
| Authentification | `/login`, `/forgot-password` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 35 % | Login fonctionnel en mock ; mot de passe `admin` universel (MBI:485) ; « mot de passe oublié » simulé ; **aucun guard** sur les routes (`layout.routes.ts`) |
| Dashboard | `/dashboard` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 40 % | 3 KPI (CA du jour, marge du jour, unités en stock) ; courbe « évolution du stock » **fictive** (`dashboard.facade.ts:152-165`) |
| Produits | `/products` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 55 % | CRUD + recherche/tri/pagination client ; stock éditable dans la fiche (contourne les mouvements) |
| Catégories | — | <span class="b pa">PARTIEL</span> | Lecture seule | 15 % | Seul `GET /categories` existe (MBI:632) ; 5 catégories figées, pas d'écran |
| Stock / mouvements | `/stock` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 45 % | Historique + saisie manuelle ; mouvements **sans dépôt** ; aucun contrôle de rôle (MBI:1610) |
| Dépôts / transferts | `/warehouses`, `/warehouses/transfer` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 40 % | Création + transfert immédiat mono-produit ; pas de modification/suppression ni d'emplacements |
| Ventes (POS) | `/sales` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 50 % | Panier, détail/gros, crédit, facture PDF ; prix fournis par le client ; ni annulation, ni retour, ni remise, ni TVA |
| Clients | `/clients`, `/clients/:id` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 60 % | CRUD, plafond de crédit, paiements, historique ; surpaiement possible |
| Achats | `/purchases` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 50 % | Commande → réception → facture → paiement ; **réception sans effet sur le stock réel** (MBI:1219-1229) |
| Fournisseurs | `/suppliers`, `/suppliers/:id` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 60 % | CRUD, historique, paiements ; suppression laisse des commandes orphelines (MBI:916-917) |
| Caisse | `/cash-register/{open,close,history}` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 55 % | Session unique **globale** (tous postes, tous dépôts) ; ventes non rattachées à la session |
| Dépenses | `/expenses` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 50 % | Création/suppression ; pas de modification ; catégorie en texte libre |
| Inventaire | `/inventory/{count,history}` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 35 % | Application immédiate, sans brouillon ni validation ; quantités pré-remplies = théorique ; sessions sans dépôt |
| Rapports | `/reports` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 40 % | Jour/mois/année calculés côté client (corrects) ; endpoints `/reports/*` faux mais inutilisés ; export Excel |
| Rendez-vous (optique) | `/appointments` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 50 % | CRUD ; aucun contrôle de rôle ; endpoint statut bogué (MBI:1768) mais non appelé par l'UI |
| Journal d'audit | `/audit-logs` | <span class="b ex">EXISTE</span> | <span class="b pr">PROBLÉMATIQUE</span> | 25 % | Belle UI (filtres, stats, export CSV) ; **2 actions réellement tracées** ; 50 entrées de démonstration |
| Utilisateurs | `/users` | <span class="b ex">EXISTE</span> | <span class="b pa">PARTIEL</span> | 45 % | CRUD + activation ; pas de mot de passe ; un utilisateur désactivé peut se connecter |
| Notifications / alertes | — | <span class="b pa">PARTIEL</span> | Indicateur visuel | 10 % | Uniquement le libellé « Stock faible / Rupture » dans la liste produits |
| Paramètres (société, TVA, numérotation) | — | <span class="b ab">ABSENT</span> | — | 0 % | — |
| Retours clients / fournisseurs | — | <span class="b ab">ABSENT</span> | — | 0 % | — |
| Lots / péremption | — | <span class="b ab">ABSENT</span> | — | 0 % | — |
| Code-barres / QR | — | <span class="b ab">ABSENT</span> | — | 0 % | — |
| Code mort | `ReportsPageComponent`, `SalesPageComponent`, `StockPageComponent`, `UsersPageComponent`, `query.engine`, `network.sim`, `mock-factory`, `mock-db-large`, `core/guards/*`, `CoreModule`, `SharedModule` | <span class="b pr">PROBLÉMATIQUE</span> | — | — | Jamais référencés par le routing ni par d'autres modules |

<div class="pb"></div>

## 5. Audit fonctionnel (métier)

### 5.A Produits

| Attribut / fonction | Statut | Preuve / commentaire |
|---|---|---|
| Création / modification | <span class="b ex">EXISTE</span> | `product-drawer.component.ts`, MBI:638-713 |
| Suppression | <span class="b pr">PROBLÉMATIQUE</span> | Suppression physique, sans contrôle des ventes/mouvements liés, ni audit (MBI:715-729) |
| Référence / SKU | <span class="b pa">PARTIEL</span> | Requis côté UI ; côté API auto-généré `SKU-XXXX` aléatoire, **sans contrôle d'unicité** (MBI:649) |
| Code-barres (EAN/GTIN) | <span class="b ab">ABSENT</span> | Champ inexistant dans `product.model.ts` |
| Nom | <span class="b pa">PARTIEL</span> | Validé côté UI ; l'API accepte un nom vide (défaut « Nouveau produit », MBI:650) |
| Description | <span class="b ab">ABSENT</span> | — |
| Catégorie | <span class="b ex">EXISTE</span> | `categoryId` ; défaut silencieux `cat_1` côté API |
| Marque | <span class="b ab">ABSENT</span> | Présente seulement dans le libellé (« Ray-Ban… ») — critique en optique |
| Unité / conditionnement | <span class="b ab">ABSENT</span> | Pas de notion de boîte de lentilles, de paire, etc. |
| Prix d'achat | <span class="b pr">PROBLÉMATIQUE</span> | Écrasé par le **dernier** prix reçu (MBI:1227) ; pas de CUMP |
| Prix de vente détail / gros | <span class="b ex">EXISTE</span> | `retailPrice`, `wholesalePrice` |
| Marge | <span class="b pa">PARTIEL</span> | Calculée à la vente uniquement ; aucun contrôle « prix de vente < prix d'achat » |
| TVA | <span class="b ab">ABSENT</span> | Aucun champ ni calcul |
| Seuil minimum | <span class="b ex">EXISTE</span> | `alertThreshold` |
| Seuil maximum / surstock | <span class="b ab">ABSENT</span> | — |
| Stock actuel | <span class="b pr">PROBLÉMATIQUE</span> | Champ `stockQuantity` dénormalisé **et** stock par dépôt : deux sources de vérité (voir 5.C) |
| Stock réservé / disponible | <span class="b ab">ABSENT</span> | — |
| Image | <span class="b ab">ABSENT</span> | — |
| Statut actif / inactif | <span class="b ab">ABSENT</span> | Seule la suppression physique existe |
| Variantes (couleur, taille, puissance) | <span class="b ab">ABSENT</span> | Indispensable pour montures et lentilles (dioptrie, rayon, diamètre) |
| Historique des prix | <span class="b ab">ABSENT</span> | Seul l'audit d'un `UPDATE` produit conserve `before/after` (MBI:701) |

### 5.B Catégories

<span class="b pa">PARTIEL</span> — Seule la lecture est possible (`GET /categories`, MBI:632-636). Il n'y a ni création, ni modification, ni suppression, ni hiérarchie, ni contrôle d'unicité, ni activation. Le modèle se limite à `{id, name}` (`category.model.ts`). **Risque** : impossible d'ajouter une gamme sans modifier le code.

### 5.C Stock — analyse approfondie

**Mécanisme réel.** Le stock est **stocké directement** dans une table `Record<warehouseId, Record<productId, qty>>` (MBI:309-327), modifiée par `setStock`/`adjustStock`. Des mouvements sont **en plus** journalisés, mais le stock **n'est jamais recalculé** à partir d'eux. Parallèlement, `Product.stockQuantity` existe comme champ propre. Il est mis à jour par la réception (seulement), puis **écrasé à l'affichage** par la valeur du dépôt courant (MBI:530).

| Opération | Statut | Effet sur stock dépôt | Mouvement créé | Problème |
|---|---|---|---|---|
| Stock initial | <span class="b pa">PARTIEL</span> | Oui (dépôt courant) | **Non** | Pas de mouvement « stock initial » → historique incomplet (MBI:665-668) |
| Entrée par réception fournisseur | <span class="b pr">PROBLÉMATIQUE</span> | **Non** | Oui (`SUPPLY`) | **Bug critique** : seul `product.stockQuantity` est incrémenté (MBI:1224-1229), valeur ignorée ensuite. Le mouvement existe, mais pas le stock. |
| Sortie par vente | <span class="b ex">EXISTE</span> | Oui | Oui (`SALE`) | Mouvement sans `warehouseId` (dépôt seulement dans la note) |
| Mouvement manuel (entrée, perte, ajustement) | <span class="b pa">PARTIEL</span> | Oui | Oui | Aucun contrôle de rôle ; motif `LOSS`/`ADJUSTMENT` sans justification obligatoire (MBI:1610-1648) |
| Modification via fiche produit | <span class="b pr">PROBLÉMATIQUE</span> | Oui (`setStock`) | **Non** | Contournement total de la traçabilité (MBI:692-695, champ `stockQuantity` du formulaire) |
| Transfert inter-dépôts | <span class="b pa">PARTIEL</span> | Oui (2 dépôts) | Oui (2 × `ADJUSTMENT`) | Motif `TRANSFER` absent ; immédiat (pas de « en transit ») ; mono-produit |
| Inventaire | <span class="b pa">PARTIEL</span> | Oui (`setStock`) | Oui (`ADJUSTMENT`) | Voir 5.H |
| Stock réservé / théorique / disponible | <span class="b ab">ABSENT</span> | — | — | — |
| Utilisateur responsable | <span class="b pr">PROBLÉMATIQUE</span> | — | `createdByUserId` | En mock, toujours `u_admin` (voir sécurité S2) |
| Date / heure | <span class="b ex">EXISTE</span> | — | `createdAt` ISO | — |

**Risques d'incohérence identifiés.**

1. Divergence **stock affiché / stock vendable** après chaque réception (critique).
2. Σ mouvements ≠ stock (stock initial et modifications par fiche sans mouvement) : **aucune réconciliation possible**.
3. Mouvements non rattachés à un dépôt : impossible de reconstituer le stock d'un dépôt ou de filtrer l'historique par dépôt.
4. Aucune atomicité : en backend réel, une vente multi-lignes pourrait décrémenter une partie du stock puis échouer.
5. Concurrence non gérée (deux caisses vendant le dernier article).
6. Suppression d'un produit : ventes et mouvements orphelins (le nom n'est plus résolu, `stock.facade.ts:112`).

### 5.D Entrepôts / magasins

| Capacité | Statut | Commentaire |
|---|---|---|
| Plusieurs dépôts | <span class="b ex">EXISTE</span> | Création par nom (MBI:553-575) ; modèle `{id, name}` seulement |
| Stock par dépôt | <span class="b ex">EXISTE</span> | Mais vue globale « tous dépôts » absente |
| Transfert entre dépôts | <span class="b pa">PARTIEL</span> | Immédiat, sans bon de transfert, validation ni réception |
| Emplacements, zones, rayons | <span class="b ab">ABSENT</span> | — |
| Restriction utilisateur ↔ dépôt | <span class="b ab">ABSENT</span> | `User.magasin` est un libellé libre jamais utilisé pour filtrer ; le sélecteur d'en-tête est libre |
| Modifier / désactiver un dépôt | <span class="b ab">ABSENT</span> | — |
| Ventes, caisse, inventaires par dépôt | <span class="b pr">PROBLÉMATIQUE</span> | `Sale`, `InventorySession`, `CashRegisterSession` n'ont pas de `warehouseId` |

**Intérêt d'aller plus loin** : pour un opticien à 2 sites, les emplacements fins (rayons) sont **P3**. En revanche, le rattachement systématique au dépôt de chaque document (vente, mouvement, inventaire, caisse) et la vue consolidée sont **P0/P1**.

### 5.E Achats

Processus cible : *Fournisseur → commande → réception → contrôle → stock → facture → paiement*.

| Étape | Statut | Commentaire |
|---|---|---|
| Fournisseurs | <span class="b ex">EXISTE</span> | CRUD, délai de livraison |
| Commande d'achat + lignes | <span class="b ex">EXISTE</span> | Statuts `PENDING → DELIVERED` uniquement |
| Modification / annulation de commande | <span class="b ab">ABSENT</span> | Pas de statut `CANCELLED`, ni de brouillon |
| Réception complète | <span class="b pr">PROBLÉMATIQUE</span> | Sans effet sur le stock dépôt (bug critique) ; dépôt de réception non choisi |
| Réception partielle | <span class="b ab">ABSENT</span> | Tout ou rien |
| Contrôle qualité / écarts à réception | <span class="b ab">ABSENT</span> | — |
| Prix d'achat / historique | <span class="b pr">PROBLÉMATIQUE</span> | Dernier prix écrase l'ancien ; pas d'historique ni de CUMP |
| Facture fournisseur | <span class="b pa">PARTIEL</span> | Numéro + date ; montant = total commande (pas d'écart facture/commande, ni de TVA) |
| Paiements partiels | <span class="b ex">EXISTE</span> | Contrôle « ≤ reste à payer » |
| Dettes fournisseurs | <span class="b pa">PARTIEL</span> | Calculables par commande ; pas de balance âgée ni d'échéances |
| Retours fournisseurs / avoirs | <span class="b ab">ABSENT</span> | — |
| Commande déclenchée par seuil | <span class="b ab">ABSENT</span> | — |

### 5.F Ventes

| Fonction | Statut | Commentaire |
|---|---|---|
| Clients | <span class="b ex">EXISTE</span> | Nom, téléphone, email, plafond de crédit |
| Vente comptoir (panier → paiement) | <span class="b ex">EXISTE</span> | `sales.facade.ts`, MBI:1657-1753 |
| Détail / gros | <span class="b ex">EXISTE</span> | Re-tarification du panier au changement de type |
| Vente à crédit + plafond | <span class="b pa">PARTIEL</span> | Plafond contrôlé ; **crédit sans client accepté par l'API** (UI seule bloque, `sales-shell-page.component.ts:181`) |
| Modes de paiement | <span class="b pa">PARTIEL</span> | `CASH`, `MOBILE_MONEY`, `BANK_TRANSFER` ; pas de paiement mixte |
| Prix de vente | <span class="b pr">PROBLÉMATIQUE</span> | `unitPrice` et `purchasePrice` **viennent du client** (MBI:1663-1676) : prix et marge falsifiables |
| Facture | <span class="b pa">PARTIEL</span> | PDF généré côté navigateur (jsPDF) ; pas de numérotation légale séquentielle, de mentions légales ni de TVA |
| Commande client / devis / préparation / livraison | <span class="b ab">ABSENT</span> | Pas de cycle commande → livraison |
| Remise (ligne / globale) | <span class="b ab">ABSENT</span> | — |
| TVA | <span class="b ab">ABSENT</span> | — |
| Annulation de vente | <span class="b ab">ABSENT</span> | Aucune route `DELETE`/`cancel` |
| Retours | <span class="b ab">ABSENT</span> | — |
| Marge / bénéfice | <span class="b pa">PARTIEL</span> | Calculés sur le prix d'achat envoyé par le client |
| Stock après vente | <span class="b ex">EXISTE</span> | Décrément dépôt + mouvement `SALE` |
| Lien vente ↔ session de caisse | <span class="b ab">ABSENT</span> | Une vente cash est possible caisse fermée ; rattachement par fenêtre horaire seulement (MBI:273-279) |
| Ordonnance / prescription (optique) | <span class="b ab">ABSENT</span> | À considérer : verres correcteurs sur prescription |

### 5.G Clients et crédit

<span class="b pa">PARTIEL</span> — La dette est calculée à la volée : Σ ventes − Σ payé à la vente − Σ paiements (MBI:1687-1691). Points faibles :

- **surpaiement accepté**, aucune comparaison avec la dette (MBI:1571) ;
- la **suppression d'un client efface ses paiements** mais conserve ses ventes, ce qui fausse les historiques (MBI:1528-1529) ;
- pas d'échéance, de relance ni de balance âgée ;
- le paiement d'une dette en espèces n'entre pas dans la caisse.

### 5.H Inventaire

| Exigence | Statut | Commentaire |
|---|---|---|
| Inventaire manuel | <span class="b ex">EXISTE</span> | Saisie des quantités physiques dans un tableau |
| Inventaire global | <span class="b pr">PROBLÉMATIQUE</span> | Tous les produits sont listés **et pré-remplis avec la quantité théorique** (`inventory-count-page.component.ts:61`). Un article non compté est réputé conforme, ce qui masque les pertes. |
| Inventaire partiel (catégorie, zone) | <span class="b ab">ABSENT</span> | — |
| Écart théorique / réel | <span class="b ex">EXISTE</span> | `difference` par ligne |
| Ouverture → comptage → validation | <span class="b ab">ABSENT</span> | Une seule action applique immédiatement les ajustements (MBI:789-805) |
| Gel du stock / ventes pendant comptage | <span class="b ab">ABSENT</span> | — |
| Justification des écarts | <span class="b ab">ABSENT</span> | Note globale uniquement |
| Valorisation de l'écart | <span class="b ab">ABSENT</span> | — |
| Historique / responsable / date | <span class="b pa">PARTIEL</span> | Oui, mais **dépôt non enregistré** dans la session (`inventory.model.ts`) |
| Double comptage / validation par un tiers | <span class="b ab">ABSENT</span> | — |

### 5.I Retours

<span class="b ab">ABSENT</span> — Aucun retour client (total ou partiel, motif, remboursement, avoir, remise en stock, produit défectueux), aucun retour fournisseur. Le motif de mouvement `RETURN` n'existe pas (`stock-movement.model.ts`).

### 5.J Alertes

| Alerte | Statut |
|---|---|
| Stock faible (≤ seuil) | <span class="b pa">PARTIEL</span> — libellé dans la liste produits, pour le dépôt courant seulement ; ni notification ni liste dédiée |
| Rupture | <span class="b pa">PARTIEL</span> — libellé « Rupture » |
| Surstock | <span class="b ab">ABSENT</span> |
| Produit expiré / proche expiration | <span class="b ab">ABSENT</span> |
| Commande fournisseur en retard | <span class="b ab">ABSENT</span> (le `deliveryLeadTimeDays` existe mais n'est pas exploité) |
| Paiement client en retard | <span class="b ab">ABSENT</span> |
| Inventaire nécessaire | <span class="b ab">ABSENT</span> |

### 5.K Lots et dates d'expiration

<span class="b ab">ABSENT</span> — Il n'y a ni numéro de lot, ni dates de fabrication ou de péremption, ni quantité par lot, ni FIFO/FEFO. **Pertinence élevée pour ce commerce** : les lentilles de contact et les solutions d'entretien sont périmables et soumises à traçabilité (rappels de lots fabricant). Ailleurs, c'est indispensable en pharmacie, agroalimentaire, cosmétique et pièces détachées réglementées. **Recommandation : P2**, limitée aux catégories « Lentilles » et « Solutions » (flag `trackBatches` par produit), avec sortie FEFO.

### 5.L Code-barres / QR

<span class="b ab">ABSENT</span> — Il n'y a ni champ, ni scan, ni impression d'étiquettes. **Stratégie réaliste** :

1. ajouter `barcode` (EAN-13) sur le produit, avec index unique ;
2. au POS et à l'inventaire, utiliser une **douchette USB/Bluetooth en émulation clavier** (aucun SDK, un champ texte focalisé suffit) ;
3. générer des étiquettes internes (Code 128) pour les produits sans EAN, en PDF A4 multi-étiquettes ;
4. la caméra mobile (lib `@zxing/browser`) vient seulement en phase 5.

### 5.M Utilisateurs, rôles, permissions

| Aspect | Statut | Commentaire |
|---|---|---|
| CRUD utilisateurs | <span class="b ex">EXISTE</span> | Admin uniquement côté API |
| Mot de passe | <span class="b ab">ABSENT</span> | Aucun champ ; `admin` pour tous (MBI:485) |
| Rôles | <span class="b pr">PROBLÉMATIQUE</span> | **Deux modèles concurrents** : `Role = ADMIN/CAISSIER/GESTIONNAIRE` (`core/models/role.model.ts`) et `UserRole = ADMIN/MANAGER/EMPLOYEE` (`auth/models/user.model.ts`), ponts via `as unknown as any` (`core/services/auth.service.ts:40`) |
| Permissions fines (lecture/création/modif/suppression/validation) | <span class="b ab">ABSENT</span> | Rôles codés en dur par route |
| Accès par module (menu) | <span class="b ab">ABSENT</span> | Menu identique pour tous (`layout-shell.component.ts:62-78`) |
| Restriction par dépôt / entreprise | <span class="b ab">ABSENT</span> | — |
| Désactivation effective | <span class="b pr">PROBLÉMATIQUE</span> | `isActive` non vérifié au login (MBI:482-489) |
| Auto-suppression de l'admin | <span class="b pr">PROBLÉMATIQUE</span> | Rien n'empêche de supprimer le dernier admin (MBI:1438-1449) |

### 5.N Audit et traçabilité

<span class="b pr">PROBLÉMATIQUE</span>. Le modèle `AuditLogEntry` est bien conçu (utilisateur, rôle, action, entité, `before/after`, `changes`, IP, statut). L'écran est complet. **Mais** :

- `appendAudit()` n'est appelé que **2 fois** : mise à jour produit (MBI:701) et création de vente (MBI:1741) ;
- les 50 entrées affichées sont **codées en dur** (MBI:70-121) ;
- l'IP vaut `127.0.0.1` et le rôle `ADMIN` par défaut ;
- le journal est plafonné à 500 entrées en mémoire ;
- il n'y a ni immuabilité, ni horodatage serveur ;
- connexions, déconnexions, suppressions, réceptions, paiements, inventaires et transferts **ne sont pas tracés**.

### 5.O Tableau de bord

| KPI | Statut | Fiabilité |
|---|---|---|
| CA du jour | <span class="b ex">EXISTE</span> | Moyenne : calcul client sur **toutes** les ventes, tous dépôts confondus, date UTC |
| Marge du jour | <span class="b ex">EXISTE</span> | Faible : dépend du prix d'achat envoyé par le client |
| Unités en stock | <span class="b ex">EXISTE</span> | Faible : dépôt courant seulement, en unités (pas en valeur), faussé par le bug de réception |
| Ventes 14 jours, top 8 produits | <span class="b ex">EXISTE</span> | Correct sur les données disponibles |
| Évolution du stock | <span class="b pr">PROBLÉMATIQUE</span> | **Fictive** : stock actuel × (1 − 0,02·i) (`dashboard.facade.ts:160`). Trompeuse, à retirer. |
| Valeur du stock, ruptures, produits sous seuil, achats, créances, dettes, rotation | <span class="b ab">ABSENT</span> | — |

### 5.P Rapports

<span class="b pa">PARTIEL</span>. La page `/reports` filtre correctement par jour, mois ou année **côté client** (`reports.facade.ts:110-121`). Elle affiche CA, marge brute, nombre de transactions et top produits, avec export Excel. Les dépenses ne sont **pas déduites** : il n'y a pas de bénéfice net. Les endpoints `/api/reports/daily|monthly|yearly` sont **faux** (totaux non filtrés, `lossCount: 0`, MBI:1862-1970) mais **inutilisés** : le seul consommateur, `ReportsPageComponent`, n'est pas routé. Absents : état et valorisation du stock, mouvements, achats, inventaires, produits dormants, rotation, créances, dettes, historique des prix, performance par dépôt ou par vendeur.

### 5.Q Finance / gestion commerciale

| Élément | Statut |
|---|---|
| Chiffre d'affaires, marge brute | <span class="b pa">PARTIEL</span> |
| Coût d'achat (CUMP / FIFO) | <span class="b ab">ABSENT</span> (dernier prix) |
| TVA, remises | <span class="b ab">ABSENT</span> |
| Paiements clients / fournisseurs | <span class="b ex">EXISTE</span> |
| Crédits clients, dettes fournisseurs | <span class="b pa">PARTIEL</span> |
| Dépenses | <span class="b ex">EXISTE</span> (simples) |
| Caisse | <span class="b pa">PARTIEL</span> (globale, non rattachée aux ventes) |
| Bénéfice net (marge − dépenses) | <span class="b ab">ABSENT</span> dans l'UI |

**Frontière recommandée.** Restent **dans le périmètre (gestion commerciale)** : CA, marge, CUMP, TVA collectée/déductible *calculée*, remises, encaissements, créances, dettes, caisse, dépenses opérationnelles, exports. Restent **hors périmètre (comptabilité)** : plan comptable, écritures en partie double, grand livre, bilan, liasse fiscale, rapprochement bancaire. Prévoir plutôt un **export comptable** (journal des ventes, achats et encaissements au format CSV/FEC-like) vers le logiciel du cabinet comptable.

### 5.R Multi-entreprise / multi-magasin

**Multi-magasin** : l'en-tête `X-Warehouse-Id` est une bonne base. Il manque le rattachement des documents au dépôt, les droits par dépôt et la consolidation. L'évolution est **faisable** sans refonte. **Multi-entreprise** : rien n'existe (pas de `companyId`, pas d'isolation). C'est faisable si le backend est conçu **dès le départ** avec un `companyId` sur chaque table et un filtrage systématique (row-level security PostgreSQL ou middleware). Ce n'est **pas prioritaire** pour un opticien mono-société : **P3**, mais la colonne est à prévoir dès la phase 1 pour éviter une migration lourde.

<div class="pb"></div>

## 6. Audit technique

| Constat | Gravité | Preuve |
|---|---|---|
| Logique métier exécutée dans le navigateur (intercepteur de 1 976 lignes, 69 routes en `if` successifs) | CRITIQUE | MBI |
| Données en mémoire, perdues au rechargement, non partagées entre postes | CRITIQUE | MBI:49-329 |
| Build de production sans backend (`api.example.com`) | CRITIQUE | `environment.prod.ts` |
| Données mock (noms, emails, téléphones) **incluses dans le bundle de production** | MOYEN | Bundle `main-*.js` contient `optivision.ci` (import statique de `mock-db.ts` par MBI) |
| Ordre des intercepteurs : `jwt` après `mockBackend` | ÉLEVÉ | `app.config.ts:21` |
| Deux `AuthService`, deux modèles `User`, deux jeux de guards | MOYEN | `auth/services`, `core/services`, `auth/guards`, `core/guards` |
| Aucune transaction ni atomicité dans les opérations multi-étapes | ÉLEVÉ (en backend réel) | Vente, réception, inventaire |
| Identifiants générés par `Date.now()` : collisions possibles en rafale | FAIBLE | Ex. MBI:609 et 617 (in/out même ms) |
| Gestion des dates en UTC via `toISOString().slice(0,10)` : décalage possible hors GMT | FAIBLE (GMT en CI) | `dashboard.facade.ts:102`, `reports.facade.ts:113` |
| Build OK ; avertissements CommonJS (jspdf/canvg) | FAIBLE | `ng build` |

<div class="pb"></div>

## 7. Audit base de données

Il n'y a **pas de base de données**. L'analyse porte sur les **modèles TypeScript** (le contrat de fait) et sur les **schémas proposés mais non branchés** (`sql-seed.sql` : 20 tables, 11 index, extension `pgcrypto` ; `mongo-seed.js` ; `DATABASE_SCHEMA.md`, « reconstruit depuis le code source »).

| Problème structurel | Gravité | Détail |
|---|---|---|
| Pas de `warehouseId` sur `StockMovement`, `Sale`, `InventorySession`, `CashRegisterSession` | CRITIQUE | Traçabilité par dépôt impossible |
| Double source de vérité du stock (`Product.stockQuantity` vs table dépôt) | CRITIQUE | Cause directe du bug de réception |
| Lignes de vente sans snapshot (nom/SKU) | MOYEN | Historique illisible après suppression produit |
| Aucune contrainte d'unicité appliquée (SKU, nom de catégorie, n° facture) | ÉLEVÉ | Doublons possibles |
| Suppressions physiques en cascade incohérentes (client → paiements supprimés, ventes conservées ; fournisseur → historique supprimé, commandes conservées) | ÉLEVÉ | MBI:1528, 916 |
| Pas de soft delete, pas de `updatedAt`/`updatedBy` | MOYEN | — |
| Montants en `number` JS (flottants) | MOYEN | En SQL : `NUMERIC(14,2)` ou entiers en FCFA |
| Énumérations incomplètes (`TRANSFER`, `RETURN`, `INITIAL`, `CANCELLED`) | MOYEN | `stock-movement.model.ts`, `purchase-order.model.ts` |
| Mot de passe par défaut `password123` dans le seed SQL | ÉLEVÉ si exécuté en prod | `sql-seed.sql:51` |
| `DATABASE_SCHEMA.md` décrit MongoDB, `sql-seed.sql` décrit PostgreSQL | FAIBLE | Choix de SGBD non tranché |

**Recommandation** : **PostgreSQL**. Les données sont fortement relationnelles et transactionnelles (stock, argent), avec besoin de contraintes, de `SELECT … FOR UPDATE` et d'agrégations de reporting. Le `sql-seed.sql` existant est un bon point de départ, à corriger selon la section 17.

<div class="pb"></div>

## 8. Audit API

Contrat actuel : REST JSON, préfixe `/api`, réponses de liste `{items, total}`, erreurs `{message}` avec codes 400/401/403/404. **69 routes** simulées, **32 contrôles de rôle**.

| Domaine | Endpoints existants | Problèmes |
|---|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/forgot-password`, `GET /auth/me` | Pas de logout serveur ni de révocation ; refresh sans vérification d'expiration ni de signature ; énumération d'emails via forgot-password (404 si inconnu, MBI:514) |
| Produits | `GET/POST /products`, `GET/PUT/DELETE /products/:id` | Pas de pagination, recherche ni filtre serveur ; `PUT` modifie le stock ; `POST` sans validation |
| Catégories | `GET /categories` | CRUD manquant |
| Dépôts | `GET/POST /warehouses`, `POST /warehouses/transfer` | `PUT/DELETE` manquants ; transfert non idempotent |
| Stock | `GET/POST /stock/movements` | Pas de filtre dépôt ni de pagination ; **pas de contrôle de rôle** sur `POST` ; pas de `GET /stock` (niveaux par dépôt) |
| Ventes | `GET/POST /sales` | **Prix fournis par le client** ; pas de `GET /sales/:id`, `cancel`, `returns` ; pas de pagination |
| Clients | CRUD + `/customers/:id/sales`, `/payments` | Pas de `GET /customers/:id/balance` ; surpaiement |
| Fournisseurs | CRUD + `/purchases`, `/payments` | Suppression destructive |
| Achats | `GET/POST /purchases/orders`, `/:id`, `/:id/receive`, `/:id/invoice`, `/:id/pay` | Pas d'annulation ni de réception partielle (payload `deliveredAtIso` ignoré) ; **deux routes de paiement** (`/purchases/orders/:id/pay` et `/suppliers/:id/payments` avec `orderId`) : doublon |
| Caisse | `current`, `sessions`, `open`, `operations`, `close` | Session globale, non liée à l'utilisateur ni au dépôt |
| Inventaire | `GET/POST /inventory/sessions`, `GET /:id` | Pas de cycle ouverture/validation |
| Dépenses | `GET/POST /expenses`, `DELETE /:id` | Pas de `PUT` ni de filtres de période |
| Rapports | `GET /reports/daily|monthly|yearly` | **Résultats faux** (non filtrés) ; inutilisés |
| Utilisateurs | CRUD + `PATCH /:id/active` | Pas de gestion de mot de passe |
| Audit | `GET /audit-logs`, `/:id`, `/stats`, `/export` | Seul domaine paginé ; export ignore `search` |
| RDV | CRUD + `PATCH /:id/status` | Aucun contrôle de rôle ; `PATCH status` extrait l'id au mauvais index (`split('/')[4]` = `"status"`) → toujours 404 (MBI:1768) |

**Endpoints manquants prioritaires** : `GET /stock/levels?warehouseId=`, `POST /sales/:id/cancel`, `POST /sales/:id/returns`, `POST /purchases/orders/:id/receipts` (partielle), `POST /purchases/orders/:id/cancel`, CRUD `/categories`, `PUT/DELETE /warehouses/:id`, cycle `/inventory/sessions/:id/{lines,validate}`, `/transfers` (cycle), `/reports/stock-valuation`, `/reports/receivables`, `/reports/payables`, `POST /auth/logout`, `POST /users/:id/password`.

**Règles transverses à imposer côté backend** : pagination `?page&size&sort&q`, validation par DTO (class-validator/Zod), prix et coûts toujours relus en base, clés d'idempotence sur les écritures financières, codes d'erreur métier stables (`STOCK_INSUFFICIENT`, `CREDIT_LIMIT_EXCEEDED`…).

<div class="pb"></div>

## 9. Audit UX/UI

**Points forts.**

- Interface Angular Material cohérente, avec thème global (`styles.scss`, 586 lignes).
- Navigation latérale repliable et sélecteur de magasin visible dans l'en-tête.
- Drawers latéraux pour création et détail, qui conservent le contexte de la liste.
- Dialogues de confirmation pour les suppressions (produits, clients, fournisseurs, dépenses, utilisateurs, RDV) et la réception.
- Tables avec tri et pagination (8 écrans), recherche avec debounce, snackbar d'erreur global.
- Facture PDF et export Excel.

**Points faibles.**

| Constat | Impact | Recommandation |
|---|---|---|
| Menu identique pour tous les rôles ; un caissier voit « Utilisateurs », « Audit »… | Confusion, erreurs 403 | Menu filtré par permission |
| Sidenav en `mode="side"` toujours ouverte, pas de `BreakpointObserver` | Inutilisable sur mobile/tablette (inventaire en rayon, vente tablette) | Mode `over` < 960 px |
| Inventaire : un tableau de **tous** les produits sans pagination ni recherche, pré-rempli | Ingérable au-delà de ~200 articles ; erreurs silencieuses | Comptage par scan ou recherche, lignes « non comptées » distinctes |
| POS : recherche produit par liste, sans scan ni raccourcis clavier | Lenteur en caisse | Champ scan focalisé, raccourcis (F2 paiement, Échap annuler) |
| Stock modifiable depuis la fiche produit | Erreur de manipulation non tracée | Champ en lecture seule + bouton « Ajuster » qui crée un mouvement motivé |
| Pas d'annulation ni de correction de vente | Les erreurs de caisse sont irréparables | Annulation motivée avec droit dédié |
| Graphique d'évolution du stock fictif | Décision sur de fausses données | Retirer ou baser sur les mouvements |
| Pas d'actions groupées ni d'export sur les listes | Productivité | Export CSV/Excel par liste, sélection multiple |
| Messages techniques bruts (« Articles invalides. ») | Compréhension | Messages métier contextualisés |

**Montée en charge des écrans** (toutes les listes chargent l'intégralité des données puis filtrent dans le navigateur) :

| Écran | 10 produits | 1 000 produits | 10 000 produits | 100 000 mouvements |
|---|---|---|---|---|
| Produits | OK | OK | Lent (chargement complet + filtre client) | — |
| POS (sélection produit) | OK | Difficile (liste déroulante) | Inutilisable | — |
| Inventaire | OK | Inutilisable (1 000 champs) | Inutilisable | — |
| Stock / mouvements | OK | OK | Lent | Inutilisable (tout chargé) |
| Dashboard / rapports | OK | OK (ventes chargées en totalité) | — | Lent à inutilisable (agrégations client sur toutes les ventes) |

**Solutions** : pagination et recherche **serveur**, filtres avancés persistés dans l'URL, autocomplete avec scan au POS, vues compactes, export serveur, agrégations pré-calculées pour le reporting.

<div class="pb"></div>

## 10. Audit sécurité

| # | Problème | Gravité | Preuve | Recommandation |
|---|---|---|---|---|
| S1 | **Aucune route protégée** : aucun `canActivate`/`canMatch` n'est déclaré, toute l'application est accessible sans connexion | CRITIQUE | `routing.ts`, `layout.routes.ts`, `features/*/*.routes.ts` | Brancher `authGuard` sur le layout + `permissionGuard` par route |
| S2 | En mock, **toutes les requêtes sont exécutées en admin** : l'intercepteur JWT est après le mock, donc aucun token n'est transmis et le fallback `mockUsers[0]` s'applique. Contrôles de rôle inopérants, audit toujours au nom de `admin`. | CRITIQUE | `app.config.ts:21`, MBI:377-382 | Placer `jwt` avant `mockBackend` ; supprimer le fallback |
| S3 | Pas de backend : toute règle de sécurité côté client est contournable (console, modification du JS) | CRITIQUE | Architecture | Backend avec autorisation serveur |
| S4 | Mot de passe universel `admin`, affiché sur l'écran de login | CRITIQUE (si déployé) | MBI:485, `login.component.html:129-130` | Hash Argon2/bcrypt, politique de mot de passe |
| S5 | JWT non signé (signature factice) ; refresh accepté sans vérification d'expiration | ÉLEVÉ | `jwt.sim.ts:128`, MBI:497-499 | JWT signé côté serveur, rotation des refresh tokens |
| S6 | Tokens en `localStorage`/`sessionStorage` (exposés en cas de XSS) | ÉLEVÉ | `auth/services/auth.service.ts:40-47` | Refresh token en cookie `HttpOnly; Secure; SameSite=Strict`, access token en mémoire |
| S7 | Prix de vente et prix d'achat fournis par le client | ÉLEVÉ | MBI:1663-1676 | Relire les prix en base ; remise soumise à droit et plafond |
| S8 | Utilisateur désactivé peut se connecter ; pas de verrouillage après échecs | ÉLEVÉ | MBI:482-489 | Contrôle `isActive`, rate limiting, verrouillage temporaire |
| S9 | Mouvement de stock créable par tout utilisateur authentifié ; RDV sans contrôle de rôle | ÉLEVÉ | MBI:1610, 1756-1849 | Permissions explicites par action |
| S10 | Dépendances vulnérables : `@angular/*` < 21.2.19 (HIGH), `xlsx` 0.18.5 (HIGH, pas de correctif npm), `dompurify`, `fflate` (MODERATE) — 10 vulnérabilités | ÉLEVÉ | `npm audit --omit=dev` | Mettre à jour Angular ; remplacer `xlsx` npm par la distribution SheetJS CDN ≥ 0.20.2 ou par `exceljs` |
| S11 | Énumération des comptes via « mot de passe oublié » (404 si email inconnu) | MOYEN | MBI:514 | Réponse identique dans tous les cas |
| S12 | Données de démonstration (emails, téléphones) embarquées dans le bundle de production | MOYEN | Bundle `main-*.js` | Charger les mocks via import dynamique conditionné à l'environnement |
| S13 | Suppression du dernier administrateur possible | MOYEN | MBI:1438-1449 | Garde-fou serveur |
| S14 | Pas de CSP, ni d'en-têtes de sécurité, ni de config CORS (pas de serveur) | MOYEN | — | À définir avec le backend (helmet, CORS restreint) |
| S15 | Seed SQL avec mot de passe par défaut `password123` | MOYEN | `sql-seed.sql:51` | Seed de dev uniquement, forcer le changement au 1er login |
| S16 | Pas d'upload de fichiers aujourd'hui | — | — | À sécuriser lors de l'ajout des images (type MIME, taille, stockage objet) |

<div class="pb"></div>

## 11. Audit performance

| Risque | Gravité | Détail |
|---|---|---|
| Listes non paginées côté serveur (produits, ventes, mouvements, clients, commandes) | ÉLEVÉ | Tout est chargé puis filtré par `MatTableDataSource` |
| Dashboard et rapports agrègent **toutes les ventes** dans le navigateur | ÉLEVÉ | `dashboard.facade.ts:82`, `reports.facade.ts:42-45` |
| Recherches linéaires `find()` dans des boucles (enrichissement des mouvements, O(n×m)) | MOYEN | `stock.facade.ts:111-112` |
| Double appel API au rafraîchissement de l'inventaire | FAIBLE | `inventory.facade.ts:41-45` |
| Souscriptions sans désabonnement dans des constructeurs | FAIBLE | `inventory-count-page.component.ts:58` |
| `OnPush` sur 16 composants sur 51 | FAIBLE | — |
| Bundle initial raisonnable (lazy loading par feature) ; xlsx/jspdf chargés à la demande | OK | `reports-shell-page.component.ts:95`, `invoice-drawer.component.ts:31` |
| Index base de données | À CONCEVOIR | Prévoir `(warehouse_id, product_id)` unique sur les niveaux de stock ; `(product_id, created_at)` et `(warehouse_id, created_at)` sur les mouvements ; `(created_at)`, `(customer_id)` sur les ventes ; `sku` et `barcode` uniques |

<div class="pb"></div>

## 12. Audit tests

| Type | Existant | Résultat |
|---|---|---|
| Unitaires | `src/app/app.spec.ts` (2 tests générés par le CLI) | **1 échec** : attend un `<h1>Hello, gestion-stock</h1>` qui n'existe plus |
| Intégration / API | Aucun | — |
| Frontend (composants, facades) | Aucun | — |
| E2E | Aucun (pas de framework installé) | — |

**Zones critiques sans tests** : calcul et contrôle du stock (vente, réception, transfert, inventaire), crédit client, paiement fournisseur (reste à payer), réconciliation de caisse, permissions.

**Stratégie proposée** :

1. tests unitaires des **services de domaine backend** (règles de stock et d'argent), objectif ≥ 80 % sur ces modules ;
2. tests d'**intégration API** sur base PostgreSQL éphémère (Testcontainers), incluant la concurrence (deux ventes simultanées du dernier article) ;
3. tests de facades front (Vitest, déjà configuré) ;
4. **5 à 8 parcours E2E Playwright** : connexion, vente cash, vente à crédit, réception, inventaire, clôture de caisse ;
5. exécution en CI à chaque PR.

<div class="pb"></div>

## 13. Audit qualité du code

| Constat | Mesure | Gravité |
|---|---|---|
| Intercepteur monolithique : 69 handlers en `if` successifs, logique métier + données + RBAC mélangées | 1 976 lignes | ÉLEVÉ (dette, mais destiné à être remplacé) |
| Mutations typées `unknown`, puis castées `as any` à l'usage | 27 méthodes ; 33 `any` | MOYEN |
| Fonction `toApiError` copiée dans 11 services | 11 copies | FAIBLE |
| Doublons d'authentification (2 services, 2 modèles, 2 guards) | — | MOYEN |
| Code mort (4 pages non routées, moteur de mock non utilisé, `CoreModule`/`SharedModule` vides) | ~1 000 lignes | FAIBLE |
| Mutation directe d'objet partagé (RDV) | MBI:1772, 1786 | FAIBLE |
| Conventions homogènes, TypeScript `strict`, templates stricts, nommage clair (FR métier / EN technique) | — | Point fort |
| Pattern Facade/VM régulier et lisible d'une feature à l'autre | — | Point fort |

**Pas de refonte front justifiée.** La structure des features est saine. La dette se concentre dans `MBI` (à remplacer par le backend), dans le double système d'auth et dans le typage des facades.

<div class="pb"></div>

## 14. Fonctionnalités manquantes

Complexité : S (≤ 3 j), M (≤ 2 sem.), L (≤ 1 mois), XL (> 1 mois).

| # | Fonctionnalité | Priorité | Justification (pourquoi / problème résolu / impact métier) | Complexité | Dépendances |
|---|---|---|---|---|---|
| 1 | Backend API + base PostgreSQL | **P0** | Sans persistance ni serveur, aucune donnée n'est conservée ni partagée : l'outil est inutilisable | XL | — |
| 2 | Authentification réelle (hash, JWT signé, refresh HttpOnly, guards) | **P0** | Accès libre et droits admin pour tous aujourd'hui | M | 1 |
| 3 | Modèle de stock unique par dépôt + mouvements obligatoires et transactionnels | **P0** | Corrige le bug de réception et rend le stock auditable | L | 1 |
| 4 | Prix et coûts calculés côté serveur | **P0** | Empêche la falsification du CA et des marges | S | 1 |
| 5 | Rattachement au dépôt de toutes les pièces (vente, mouvement, inventaire, caisse) | **P0** | Traçabilité et reporting par magasin | M | 3 |
| 6 | Journal d'audit réel, systématique, immuable | **P0** | Lutte contre la fraude et litiges | M | 1 |
| 7 | Permissions RBAC (rôle → permissions) + menu filtré | **P1** | Séparation des tâches caissier/gestionnaire/admin | M | 2 |
| 8 | Annulation de vente et retours clients (avoir, remise en stock) | **P1** | Situations quotidiennes en boutique, impossibles aujourd'hui | M | 3, 6 |
| 9 | Réception partielle et annulation de commande fournisseur | **P1** | Les livraisons partielles sont la norme | M | 3 |
| 10 | CUMP (coût unitaire moyen pondéré) + historique des prix | **P1** | Marge exacte, valorisation du stock | M | 3 |
| 11 | Inventaire en workflow (ouverture → comptage → validation) | **P1** | Fiabilité du stock, contrôle des écarts | M | 3, 5 |
| 12 | Caisse par poste/utilisateur/dépôt, liée aux ventes et encaissements | **P1** | Réconciliation fiable, responsabilité des caissiers | M | 5 |
| 13 | TVA et remises (avec plafond par rôle) | **P1** | Factures conformes, gestion commerciale | M | 4 |
| 14 | CRUD catégories + marques + statut actif produit | **P1** | Autonomie de gestion du catalogue | S | 1 |
| 15 | Pagination, recherche et filtres serveur | **P1** | Tenue à la volumétrie | M | 1 |
| 16 | Code-barres (champ + scan POS/inventaire + étiquettes) | **P2** | Vitesse en caisse, fiabilité inventaire | M | 14 |
| 17 | Alertes (seuil, rupture, retard fournisseur, créance échue) | **P2** | Anticipation des ruptures et impayés | M | 3, 12 |
| 18 | Tableau de bord fiable + rapports (valorisation, rotation, dormants, créances, dettes) | **P2** | Pilotage | L | 3, 10 |
| 19 | Transferts en workflow (demande → expédition → réception) | **P2** | Gestion du stock en transit | M | 5 |
| 20 | Lots et péremption (lentilles, solutions), FEFO | **P2** | Rappels fabricant, pertes sur périmés | L | 3 |
| 21 | Variantes produit (couleur, taille, dioptrie) | **P2** | Catalogue optique réaliste | L | 14 |
| 22 | Fiche patient / ordonnance liée à la vente (optique) | **P2** | Cœur de métier opticien | M | 8 |
| 23 | Export comptable (ventes, achats, encaissements) | **P2** | Lien avec le cabinet comptable | S | 13 |
| 24 | Proposition de réapprovisionnement automatique | **P3** | Gain de temps achats | M | 17, 18 |
| 25 | Multi-entreprise (isolation `companyId`) | **P3** | Commercialisation SaaS éventuelle | L | 1 (à prévoir dès le schéma) |
| 26 | Emplacements fins (zones, rayons) | **P3** | Utile en entrepôt, peu en boutique | M | 5 |
| 27 | PWA / mode hors-ligne POS, scan caméra mobile | **P3** | Coupures réseau, mobilité | L | 15, 16 |
| 28 | Notifications (email/SMS/WhatsApp) | **P3** | Relances clients, alertes | M | 17 |

## 15. Recommandations

Chaque recommandation répond à : *Pourquoi ? Quel problème ? Impact métier ? Complexité ? Dépendance ? Priorité ?*

**R1 — Construire le backend en transposant `MBI`, pas en repartant de zéro.** *Pourquoi* : les 69 routes et leurs règles sont un cahier des charges exécutable. *Problème résolu* : absence de persistance et de sécurité. *Impact* : l'outil devient exploitable. *Complexité* : XL. *Dépendance* : aucune. *Priorité* : P0. Garder le mock comme environnement de démo, après avoir corrigé l'ordre des intercepteurs.

**R2 — Un seul modèle de stock.** La table `stock_levels(warehouse_id, product_id, quantity)` est mise à jour **uniquement** par un service `StockService.applyMovement()` transactionnel, qui écrit toujours un `stock_movement` (avec `warehouse_id`, motif, document source, utilisateur, coût unitaire). Supprimer `Product.stockQuantity` du modèle persistant. *Problème* : bug de réception et divergences. *Impact* : confiance dans le stock. *Complexité* : L. *Dépendance* : R1. *P0*.

**R3 — Le serveur fait foi pour les prix.** La vente envoie `productId`, `quantity` et éventuellement `discount`. Le serveur relit prix, coût (CUMP) et TVA. *Problème* : fraude et marges fausses. *Complexité* : S. *P0*.

**R4 — Sécurité de base.** Guards sur toutes les routes, RBAC serveur, mots de passe hachés, refresh token en cookie HttpOnly, contrôle `isActive`, rate limiting du login, mise à jour d'Angular et remplacement de `xlsx`. *Complexité* : M. *P0*.

**R5 — Audit systématique** par intercepteur ou middleware serveur sur toute écriture, plus événements métier (vente, réception, paiement, inventaire, connexion). Table en ajout seul. *Complexité* : M. *P0*.

**R6 — Pièces commerciales à états.** Vente : `DRAFT → CONFIRMED → CANCELLED/RETURNED`. Commande : `DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED → CLOSED/CANCELLED`. Inventaire : `OPEN → COUNTING → VALIDATED`. Pas de suppression physique des pièces : annulation motivée. *Complexité* : M à L. *P1*.

**R7 — Nettoyage front ciblé** (sans refonte) : un seul `AuthService`, un seul modèle `User`, typage `Observable<T>` des facades, `toApiError` mutualisé, suppression du code mort, menu par permission, sidenav responsive. *Complexité* : S à M. *P1*.

**R8 — Retirer les indicateurs trompeurs** (évolution de stock fictive) et corriger les libellés (« marge brute » au lieu de « bénéfice »). *Complexité* : S. *P0* (quick win).

<div class="pb"></div>

## 16. Architecture cible

Principe : **conserver le front Angular** (structure, features, facades, Material) et **ajouter un backend modulaire** qui reprend le contrat d'API existant, enrichi.

<div class="diagram">
<pre>
┌──────────── Front Angular 21 (existant, nettoyé) ───────────┐
│ Features ─► Facades ─► ApiServices ─► Interceptors          │
│ (auth ─► warehouse ─► error)  ·  Guards auth + permissions  │
│ Mode démo : mockBackend conservé (env. "demo" uniquement)   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS · JSON · JWT court + cookie refresh
┌───────────────────────────▼─────────────────────────────────┐
│ API NestJS (TypeScript) — monolithe modulaire               │
│ Modules : auth · users/rbac · catalog · inventory(stock)    │
│           sales · purchasing · cash · customers · suppliers │
│           reporting · audit · notifications · settings      │
│ Transverse : validation DTO · transactions · idempotence    │
│              audit middleware · pagination · OpenAPI        │
├──────────────┬───────────────┬───────────────┬──────────────┤
│ PostgreSQL   │ Stockage objet│ Jobs planifiés│ Emails/SMS   │
│ (Prisma ORM, │ (images,      │ (BullMQ/cron :│ (alertes,    │
│ migrations,  │ PDF factures) │ alertes, agré-│ relances)    │
│ vues/agrégats)│              │ gats, backups)│              │
└──────────────┴───────────────┴───────────────┴──────────────┘
</pre>
</div>

| Brique | Choix recommandé | Justification |
|---|---|---|
| Backend | **NestJS** (TypeScript) | Même langage que le front, modèles partageables, structure modulaire proche des features Angular |
| ORM / migrations | Prisma (ou TypeORM) | Migrations versionnées, typage |
| Base | **PostgreSQL 16** | Transactions, contraintes, `NUMERIC`, verrous, vues matérialisées pour le reporting |
| Auth | JWT d'accès 15 min + refresh rotatif en cookie HttpOnly ; Argon2id | Standard, résistant au vol de token XSS |
| Permissions | RBAC rôle → permissions (`stock.adjust`, `sales.cancel`…) + portée dépôt | Souplesse sans multiplier les rôles |
| Fichiers | Stockage S3-compatible (MinIO en local) | Images produits, factures PDF archivées |
| Rapports | Requêtes SQL agrégées + vues matérialisées rafraîchies par job ; PDF de facture générés **côté serveur** | Exactitude, numérotation légale, performance |
| Audit | Table `audit_logs` en ajout seul, écrite dans la même transaction que l'action | Non-répudiation |
| Tâches planifiées | Alertes de seuil, retards fournisseurs, créances échues, sauvegardes | Automatisation |
| Intégrations | Export comptable CSV ; Mobile Money (P3) ; SMS/WhatsApp (P3) | Selon besoin |
| Déploiement | Docker Compose (api, db, minio) ; CI GitHub Actions (lint, tests, build) | Simple à exploiter pour une PME |

<div class="pb"></div>

## 17. Modèle métier cible

| Entité | Statut | Commentaire / changements |
|---|---|---|
| User | <span class="b ex">EXISTANTE</span> → À MODIFIER | + `passwordHash`, `lastLoginAt`, `failedAttempts` ; un seul modèle |
| Role | <span class="b ex">EXISTANTE</span> (type) → À MODIFIER | Devient une table, liée à des permissions |
| Permission | À CRÉER | Codes `module.action` |
| UserWarehouseAccess | À CRÉER | Portée par dépôt |
| Company | À CRÉER (colonne seulement) | `companyId` prévu, sans UI multi-société (P3) |
| Warehouse (magasin/dépôt) | <span class="b ex">EXISTANTE</span> → À MODIFIER | + `code`, `type` (boutique/dépôt), `address`, `isActive` |
| Location (emplacement) | NON NÉCESSAIRE à court terme | P3 |
| Product | <span class="b ex">EXISTANTE</span> → À MODIFIER | + `barcode`, `brandId`, `unit`, `vatRate`, `isActive`, `trackBatches`, `maxThreshold`, `description`, `imageUrl`, `avgCost` ; − `stockQuantity` |
| ProductVariant | À CRÉER (P2) | Couleur/taille/dioptrie |
| Category | <span class="b ex">EXISTANTE</span> → À MODIFIER | + `parentId`, `isActive`, unicité du nom |
| Brand | À CRÉER | Clé en optique |
| StockLevel | <span class="b pa">PARTIELLE</span> (map mock) → À CRÉER | `(warehouseId, productId)` unique, `quantity`, `reserved` |
| StockMovement | <span class="b ex">EXISTANTE</span> → À MODIFIER | + `warehouseId`, `unitCost`, `sourceType/sourceId`, motifs `INITIAL/TRANSFER_IN/TRANSFER_OUT/RETURN/INVENTORY` |
| StockTransfer (+ lignes) | À CRÉER | Workflow avec état « en transit » |
| Inventory / InventoryLine | <span class="b ex">EXISTANTES</span> → À MODIFIER | + `warehouseId`, `status`, `countedBy`, `validatedBy`, justification par ligne |
| ProductBatch | À CRÉER (P2) | Lot, dates de fabrication et de péremption, quantité par dépôt |
| Supplier | <span class="b ex">EXISTANTE</span> | + `isActive`, conditions de paiement |
| PurchaseOrder / PurchaseOrderLine | <span class="b ex">EXISTANTES</span> → À MODIFIER | Statuts étendus, `warehouseId`, `receivedQty` par ligne |
| GoodsReceipt (+ lignes) | À CRÉER | Réceptions partielles multiples |
| SupplierInvoice | <span class="b pa">PARTIELLE</span> (objet imbriqué) → À MODIFIER | Entité propre, montants HT/TVA/TTC, échéance |
| Customer | <span class="b ex">EXISTANTE</span> → À MODIFIER | + adresse, type (particulier/institution), `isActive` |
| Patient / Prescription | À CRÉER (P2, optique) | Lien client ↔ ordonnance ↔ vente |
| Sale / SaleItem | <span class="b ex">EXISTANTES</span> → À MODIFIER | + `number` séquentiel, `warehouseId`, `cashSessionId`, `status`, remises, TVA, snapshot produit |
| Return (+ lignes) | À CRÉER | Client et fournisseur, motif, destination (stock/rebut) |
| Payment | <span class="b pa">PARTIELLE</span> (2 modèles) → À MODIFIER | Unifier `CustomerPayment`/`SupplierPayment` ou garder deux tables cohérentes ; + mode et session de caisse |
| Invoice / CreditNote | À CRÉER | Facture et avoir numérotés, générés côté serveur |
| CashRegisterSession / CashOperation | <span class="b ex">EXISTANTES</span> → À MODIFIER | + `warehouseId`, `registerId`, opérateur |
| Expense | <span class="b ex">EXISTANTE</span> → À MODIFIER | Catégories référencées, `warehouseId`, modification |
| Appointment | <span class="b ex">EXISTANTE</span> | Lier au `Customer` (aujourd'hui nom libre) |
| Notification / Alert | À CRÉER (P2) | — |
| AuditLog | <span class="b ex">EXISTANTE</span> (modèle) | Modèle conservé ; alimentation à généraliser |
| Setting (société, TVA, numérotation) | À CRÉER | — |

## 18. Workflows recommandés

<div class="flow"><strong>Achat</strong> : Fournisseur → Commande (brouillon) → Commande envoyée → Réception(s) partielle(s) au dépôt choisi (contrôle des quantités et écarts) → Mouvements <code>SUPPLY</code> + recalcul CUMP → Facture fournisseur (rapprochement commande/réception/facture) → Paiement(s) → Clôture</div>

<div class="flow"><strong>Vente comptoir</strong> : Caisse ouverte (poste, dépôt) → Panier (scan) → Prix et TVA serveur, remise selon droit → Paiement (mixte possible) ou crédit si client et plafond OK → Sortie de stock transactionnelle → Facture numérotée → Rattachement à la session de caisse</div>

<div class="flow"><strong>Vente sur commande (optique)</strong> : Client + ordonnance → Devis → Commande (acompte) → Commande fournisseur des verres → Réception → Montage → Retrait par le client → Solde → Facture</div>

<div class="flow"><strong>Retour client</strong> : Vente d'origine → Sélection des lignes et quantités → Motif → Destination (remise en stock / rebut / retour fournisseur) → Avoir ou remboursement (caisse) → Mouvement <code>RETURN</code> → Audit</div>

<div class="flow"><strong>Inventaire</strong> : Ouverture (dépôt, périmètre, gel optionnel) → Comptage (scan, lignes non comptées distinctes) → Comparaison et valorisation des écarts → Justification des écarts significatifs → Validation par un responsable → Ajustements <code>INVENTORY</code> → Historique</div>

<div class="flow"><strong>Transfert</strong> : Demande (dépôt B) → Validation → Expédition depuis A (<code>TRANSFER_OUT</code>, stock « en transit ») → Réception en B (<code>TRANSFER_IN</code>, écarts signalés) → Clôture</div>

<div class="flow"><strong>Caisse</strong> : Ouverture (fond, opérateur, poste) → Ventes et encaissements de créances rattachés → Entrées et sorties motivées → Comptage → Écart → Validation de l'écart au-delà d'un seuil par un responsable → Clôture</div>

<div class="pb"></div>

## 19. Matrice Existant / Cible

| Domaine | Existant | Problème | Cible | Priorité |
|---|---|---|---|---|
| Backend & données | Mock en mémoire dans le navigateur | Rien n'est persistant ni partagé | API NestJS + PostgreSQL | P0 |
| Authentification | JWT simulé, mot de passe `admin`, routes non protégées | Accès libre | Auth réelle + guards | P0 |
| Permissions | 3 rôles codés en dur, inopérants en mock | Tout le monde est admin | RBAC permissions + portée dépôt | P0/P1 |
| Stock | Map par dépôt + champ produit + mouvements non réconciliés | Réception sans effet, incohérences | Stock unique, mouvements transactionnels | P0 |
| Traçabilité | 2 actions auditées, logs de démo | Pas de preuve | Audit systématique immuable | P0 |
| Ventes | POS détail/gros, crédit | Prix client, ni annulation ni retour, ni TVA ni remise | Pièces à états, prix serveur, TVA, remises, avoirs | P0/P1 |
| Achats | Commande → réception totale → facture → paiement | Réception KO, pas de partiel ni d'annulation | Réceptions partielles, CUMP, rapprochement | P1 |
| Inventaire | Saisie globale appliquée immédiatement | Pertes masquées, pas de validation | Workflow ouverture/comptage/validation | P1 |
| Caisse | Session unique globale | Pas de responsabilité par poste | Session par poste, opérateur et dépôt | P1 |
| Catalogue | Produit simple, catégories figées | Ni marque, ni variantes, ni code-barres | Catalogue optique complet | P1/P2 |
| Reporting | KPI du jour, rapports côté client, courbe fictive | Indicateurs partiels ou trompeurs | Rapports serveur fiables, valorisation | P2 |
| Alertes | Libellé stock faible | Aucune anticipation | Alertes planifiées et notifications | P2 |
| Lots / péremption | Absent | Rappels et périmés non gérés | Lots + FEFO (lentilles, solutions) | P2 |
| UX | Material cohérent, desktop | Pas de mobile, pas de scan, listes non paginées | Responsive, scan, pagination serveur | P1/P2 |
| Tests | 2 tests (1 KO) | Aucune protection contre les régressions | Pyramide de tests + CI | P0/P1 |
| Multi-société | Absent | — | `companyId` prévu dès le schéma | P3 |

<div class="pb"></div>

## 20. Score de maturité

**Méthode.** Chaque domaine est noté de 0 à 100 selon une grille simple : 0–20 absent ou non fonctionnel ; 21–40 ébauche avec défauts bloquants ; 41–60 fonctionnel partiel ; 61–80 solide avec manques ; 81–100 niveau production. La note globale est la **moyenne pondérée** ci-dessous. Les pondérations reflètent l'importance pour un outil de gestion manipulant stock et argent : la sécurité et le fonctionnel pèsent plus lourd. Le score mesure la **maturité pour un usage en production**, pas la qualité de la maquette.

| Domaine | Poids | Score /100 | Pondéré | Commentaire |
|---|---:|---:|---:|---|
| Fonctionnel | 20 % | 45 | 9,0 | Large couverture d'écrans ; bug de réception, ni retours ni annulations, inventaire fragile |
| Architecture | 10 % | 40 | 4,0 | Front bien structuré ; backend absent, logique dans le navigateur |
| Base de données | 10 % | 15 | 1,5 | Aucune base ; modèles incomplets (dépôt manquant) ; schémas non branchés |
| API | 10 % | 30 | 3,0 | Contrat cohérent ; pas de pagination, prix client, endpoints manquants ou erronés |
| UX/UI | 10 % | 55 | 5,5 | Interface soignée desktop ; pas de mobile, de scan ni de menu par rôle |
| Sécurité | 15 % | 10 | 1,5 | Aucune route protégée, tout le monde admin, mot de passe unique |
| Performance | 5 % | 35 | 1,75 | Lazy loading OK ; tout chargé et agrégé côté client |
| Tests | 5 % | 3 | 0,15 | 1 test utile, 1 en échec |
| Maintenabilité | 5 % | 45 | 2,25 | Conventions et structure saines ; doublons, `unknown/any`, code mort |
| Traçabilité | 10 % | 25 | 2,5 | Modèle d'audit bon, alimentation quasi nulle |
| **Total** | **100 %** | — | **31,15** | **Maturité actuelle : 31 / 100** |

> En tant que **prototype fonctionnel front-end**, l'application se situerait autour de 65/100 : le travail d'interface et de modélisation est réel et réutilisable.

<div class="pb"></div>

## 21. Registre des risques

| # | Risque | Gravité | Probabilité | Impact | Recommandation |
|---|---|---|---|---|---|
| 1 | Mise en service en l'état (données perdues au rechargement) | Critique | Élevée si déployé | Perte totale de ventes et de stock | Ne pas déployer avant le backend (phase 1) |
| 2 | Accès non authentifié à toutes les fonctions | Critique | Certaine | Fraude, fuite de données | Guards + auth serveur (phase 0/1) |
| 3 | Stock faux après réceptions | Critique | Certaine | Ventes refusées à tort, ruptures non vues, achats inutiles | Modèle de stock unique (phase 1) |
| 4 | Falsification des prix et marges | Élevée | Moyenne | Pertes financières non détectées | Prix serveur (phase 1) |
| 5 | Ajustements de stock non tracés (fiche produit) | Élevée | Élevée | Démarque inconnue, vols masqués | Ajustement motivé et audité |
| 6 | Inventaire pré-rempli masquant les écarts | Élevée | Élevée | Pertes invisibles | Workflow d'inventaire |
| 7 | Vulnérabilités de dépendances (Angular, xlsx) | Élevée | Moyenne | XSS, déni de service | Mises à jour (phase 0) |
| 8 | Caisse globale sans responsabilité individuelle | Élevée | Élevée (multi-postes) | Écarts non attribuables | Session par poste et opérateur |
| 9 | Absence de tests lors de la construction du backend | Élevée | Élevée | Régressions sur stock et argent | Tests dès la phase 1 |
| 10 | Dérive de périmètre vers la comptabilité complète | Moyenne | Moyenne | Retard, complexité | S'en tenir à la gestion commerciale + export |
| 11 | Choix de SGBD non tranché (Mongo vs SQL dans la doc) | Moyenne | Moyenne | Perte de temps | Décider PostgreSQL en phase 0 |
| 12 | Perte de connaissance (mono-développeur, doc générique) | Moyenne | Moyenne | Maintenance difficile | README réel, ADR, OpenAPI |
| 13 | Produits périmés vendus (lentilles, solutions) | Moyenne | Moyenne | Santé du client, image | Lots + FEFO (phase 3) |
| 14 | Dates en UTC dans les rapports | Faible (GMT) | Faible | Ventes de minuit mal datées | Fuseau configuré côté serveur |

<div class="pb"></div>

## 22. Roadmap

Estimations en semaines-développeur (1 développeur full-stack confirmé), indicatives.

### Phase 0 — Stabilisation (1 à 2 semaines)

- **Objectifs** : sécuriser la base front et préparer le backend.
- **Fonctionnalités** :
    - corriger l'ordre des intercepteurs et supprimer le fallback admin ;
    - brancher les guards ;
    - unifier `AuthService` et `User` ;
    - mettre à jour Angular et remplacer `xlsx` ;
    - retirer la courbe de stock fictive ;
    - rendre le stock non éditable dans la fiche produit ;
    - corriger le test cassé, mettre en place la CI (lint, build, test) ;
    - acter les choix (NestJS, PostgreSQL) en ADR.
- **Dépendances** : aucune. **Complexité** : faible.
- **Risques** : faibles.
- **Résultat attendu** : un prototype honnête et sécurisable, une base saine.

### Phase 1 — Fondations (6 à 8 semaines)

- **Objectifs** : backend, persistance, stock fiable, utilisateurs.
- **Fonctionnalités** :
    - API NestJS + PostgreSQL + migrations ;
    - auth réelle et RBAC ;
    - catalogue (produits, catégories, marques, dépôts) ;
    - modèle de stock unique avec mouvements transactionnels et `warehouseId` partout ;
    - audit systématique ;
    - pagination serveur ;
    - branchement des facades existantes sur l'API réelle ;
    - tests unitaires et d'intégration du domaine stock.
- **Dépendances** : phase 0. **Complexité** : élevée.
- **Risques** : sous-estimation de la migration des règles de `MBI`.
- **Résultat attendu** : **V1 interne utilisable** pour le catalogue et le stock.

### Phase 2 — Gestion commerciale (5 à 7 semaines)

- **Objectifs** : ventes, achats, clients, fournisseurs, caisse en conditions réelles.
- **Fonctionnalités** :
    - ventes avec prix serveur, TVA, remises, numérotation, annulation, retours et avoirs ;
    - achats avec réceptions partielles, annulation et CUMP ;
    - créances et dettes ;
    - caisse par poste et opérateur ;
    - factures PDF côté serveur.
- **Dépendances** : phase 1. **Complexité** : élevée.
- **Risques** : règles fiscales locales à valider avec le comptable.
- **Résultat attendu** : **V1 exploitable en boutique**.

### Phase 3 — Stock avancé (4 à 6 semaines)

- **Objectifs** : fiabilité physique du stock.
- **Fonctionnalités** :
    - inventaire en workflow ;
    - transferts en workflow ;
    - code-barres (scan POS et inventaire, étiquettes) ;
    - lots et péremption sur les catégories concernées, FEFO.
- **Dépendances** : phases 1 et 2. **Complexité** : moyenne à élevée.
- **Résultat attendu** : écarts d'inventaire mesurés et justifiés.

### Phase 4 — Reporting (3 à 4 semaines)

- **Objectifs** : pilotage fiable.
- **Fonctionnalités** :
    - dashboard serveur (valeur du stock, ruptures, sous seuil, CA, marge, créances, dettes) ;
    - rapports : valorisation, rotation, dormants, top ventes, achats, inventaires, performance par dépôt et par vendeur ;
    - exports ;
    - export comptable.
- **Dépendances** : phases 1 à 3. **Complexité** : moyenne.
- **Résultat attendu** : décisions basées sur des chiffres exacts.

### Phase 5 — Optimisation (3 à 4 semaines)

- **Objectifs** : performance, UX et mobilité.
- **Fonctionnalités** :
    - responsive et tablette ;
    - raccourcis clavier au POS ;
    - vues matérialisées ;
    - alertes planifiées ;
    - PWA (lecture hors-ligne) ;
    - scan caméra ;
    - E2E Playwright complets.
- **Dépendances** : phases 1 à 4. **Complexité** : moyenne.

### Phase 6 — Fonctionnalités avancées (selon pertinence)

- Dossier patient et ordonnances (optique) — **recommandé en priorité dans cette phase**.
- Notifications SMS/WhatsApp, réapprovisionnement automatique, Mobile Money, API externe, multi-entreprise (si projet SaaS).

<div class="diagram">
<pre>
Semaines  0 2       10     17    23  27  31
Phase 0   ██
Phase 1     ████████
Phase 2             ███████
Phase 3                    ██████
Phase 4                          ████
Phase 5                              ████
Phase 6                                  ░░░░░ (à la demande)
          Jalons : S2 V0 sécurisée · S10 V1 stock · S17 V1 boutique · S27 pilotage
</pre>
</div>

<div class="pb"></div>

## 23. Priorisation Impact × Effort

<div class="matrix">
<div class="q q1"><h4>Quick wins — fort impact, faible effort</h4><ul>
<li>Ordre des intercepteurs + suppression du fallback admin</li>
<li>Brancher les guards existants</li>
<li>Stock non éditable dans la fiche produit</li>
<li>Retirer la courbe de stock fictive ; libellé « marge brute »</li>
<li>Contrôle <code>isActive</code> au login</li>
<li>Mise à jour Angular, remplacement de <code>xlsx</code></li>
<li>Bloquer le crédit sans client côté API, le surpaiement client</li>
<li>Menu filtré par rôle</li>
<li>Corriger le test cassé + CI</li>
</ul></div>
<div class="q q2"><h4>Projets prioritaires — fort impact, effort moyen à élevé</h4><ul>
<li>Backend + PostgreSQL + auth réelle</li>
<li>Modèle de stock unique et transactionnel</li>
<li>Prix et coûts serveur, CUMP</li>
<li>Audit systématique</li>
<li>Annulation, retours, avoirs</li>
<li>Réceptions partielles</li>
<li>Workflow d'inventaire</li>
<li>Caisse par poste</li>
<li>Pagination serveur</li>
</ul></div>
<div class="q q3"><h4>Améliorations secondaires — impact moyen</h4><ul>
<li>Code-barres et étiquettes</li>
<li>Alertes planifiées</li>
<li>Rapports avancés, export comptable</li>
<li>Transferts en workflow</li>
<li>Variantes produit, marques</li>
<li>Responsive tablette</li>
<li>Lots et péremption (lentilles, solutions)</li>
</ul></div>
<div class="q q4"><h4>À reporter — faible impact ou effort élevé</h4><ul>
<li>Multi-entreprise (prévoir seulement la colonne)</li>
<li>Emplacements fins (zones, rayons)</li>
<li>Mode hors-ligne complet</li>
<li>Réapprovisionnement automatique</li>
<li>API publique externe</li>
</ul></div>
</div>

<div class="pb"></div>

## 24. Conclusion

1. **Niveau réel de maturité** : **31/100**. C'est un prototype fonctionnel front-end avancé (environ 65/100 dans cette catégorie), sans backend ni persistance. Il n'est pas utilisable en production.
2. **Points forts** :
    - périmètre fonctionnel large et pertinent pour un opticien ;
    - front Angular moderne, bien structuré et homogène ;
    - règles métier déjà formalisées dans le mock (crédit, caisse, paiements partiels) ;
    - contrat d'API esquissé ;
    - modèle d'audit bien pensé.
3. **Principaux problèmes** :
    - absence de backend et de base de données ;
    - sécurité inopérante (routes ouvertes, tout le monde admin) ;
    - stock incohérent (réception sans effet, double source, mouvements sans dépôt) ;
    - prix falsifiables ;
    - traçabilité de façade ;
    - ni annulation ni retours ;
    - tests inexistants.
4. **Fonctionnalités indispensables** : backend persistant, authentification et RBAC, stock unique transactionnel par dépôt, prix serveur, audit, annulation et retours, réceptions partielles, inventaire validé, caisse par poste.
5. **Risques à corriger immédiatement** : routes non protégées, fallback admin et ordre des intercepteurs, édition directe du stock, dépendances vulnérables, indicateur fictif. Et surtout : **ne pas mettre l'application en service** dans son état actuel.
6. **Architecture cible** : front Angular conservé, API NestJS modulaire, PostgreSQL, JWT et refresh HttpOnly, RBAC à permissions, audit transactionnel, jobs planifiés, stockage objet.
7. **Roadmap** : phase 0 (stabilisation, 1–2 sem.) → phase 1 (fondations, 6–8 sem.) → phase 2 (gestion commerciale, 5–7 sem.) = **V1 boutique en ~12–17 semaines** ; puis stock avancé, reporting, optimisation, fonctions avancées.
8. **Évolution ou refonte ?** **Évolution** pour le front. Pour le backend, il s'agit d'une **création**, pas d'une refonte : `MBI` sert de spécification et sera conservé comme mode démo. Seule une **refonte partielle du modèle de données** (stock, rattachement au dépôt, états des pièces) est nécessaire.
9. **Prochaine étape concrète** : valider cette feuille de route et la stack, puis lancer la phase 0. Premier lot de 2 semaines : corrections de sécurité front + squelette NestJS/PostgreSQL avec le module `auth` et le module `inventory` (stock par dépôt, `applyMovement` transactionnel, tests), branché sur l'écran Produits/Stock existant.

<div class="pb"></div>

## 25. Annexes

### 25.1 Méthode et vérifications effectuées

- Lecture de l'intégralité des modèles, services, intercepteurs, guards, routes, du backend simulé et des facades et pages principales.
- `ng build` (production, sortie hors projet) : **succès**, avertissements CommonJS (jspdf/canvg/html2canvas).
- `ng test --watch=false` : **2 tests, 1 échec** (`app.spec.ts:21`).
- `npm audit --omit=dev` : **10 vulnérabilités** (5 high, 5 moderate).
- Inspection du bundle de production : présence des données mock.
- `git status` en fin d'audit : **arbre de travail propre**, aucun fichier du projet modifié.

### 25.2 Points À CONFIRMER

| Point | Raison |
|---|---|
| Comportement d'une future API réelle | Inexistante ; seul le contrat simulé est vérifiable |
| Exigences fiscales locales (TVA, mentions de facture, numérotation) | Hors code ; à valider avec un expert-comptable (Côte d'Ivoire, d'après les données) |
| Volumétrie réelle attendue (références, ventes/jour, postes) | Non documentée ; les recommandations de performance supposent 1 000 à 10 000 références |
| Besoin réel du module Rendez-vous et d'un dossier patient | Domaine optique déduit des données de démonstration |
| Usage visé des fichiers `seeds/*.sql|js` | Présents dans `src/` mais non exécutés par l'application |

### 25.3 Index des preuves principales

| Constat | Fichier : ligne |
|---|---|
| Réception sans mise à jour du stock dépôt | MBI:1219-1229 |
| Produits renvoyés avec le stock du dépôt | MBI:530 |
| Fallback admin sans token | MBI:377-382 |
| Ordre des intercepteurs | `src/app/app.config.ts:21` |
| Routes sans guard | `src/app/routing.ts`, `src/app/layout/layout.routes.ts` |
| Mot de passe universel | MBI:485 ; `login.component.html:129` |
| Prix de vente fournis par le client | MBI:1663-1676 |
| Stock modifiable via PUT produit | MBI:692-695 ; `product-drawer.component.ts` (champ `stockQuantity`) |
| Mouvement manuel sans contrôle de rôle | MBI:1610-1648 |
| Audit : 2 appels réels | MBI:701, 1741 |
| Rapports API non filtrés | MBI:1862-1970 |
| Évolution du stock fictive | `features/dashboard/data/dashboard.facade.ts:152-165` |
| Inventaire pré-rempli | `features/inventory/pages/inventory-count-page.component.ts:58-63` |
| Inventaire appliqué immédiatement | MBI:789-805 |
| Login sans contrôle `isActive` | MBI:482-489 |
| Deux modèles de rôles | `core/models/role.model.ts`, `auth/models/user.model.ts` |
| PATCH statut RDV : mauvais index | MBI:1768 |
