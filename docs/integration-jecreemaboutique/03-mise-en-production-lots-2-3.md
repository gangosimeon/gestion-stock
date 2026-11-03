# Mise en production des lots 2 et 3 de l'intégration

Ce guide s'adresse à la personne qui déploie GestStock sur Render : le backend est un service web (image Docker), le frontend un **site statique** Render (compilation Angular, sans nginx), les bases sont sur Neon. Il couvre le passage de `main` (lot 1, en ligne) à la branche `feat/integration-lot2` (lots 2 et 3). La règle du projet s'applique : **aucune suppression de données en production, et ce qui est en ligne doit continuer de marcher** (plan § 36).

## 1. Principe : deux temps séparés

| Temps | Ce qui change | Effet visible |
|---|---|---|
| **A. Déployer** | Nouveau code et migrations additives (nouvelles tables, une permission en plus) | **Aucun** : liaisons, publication et maintenance sont désactivées par défaut |
| **B. Activer** | Variables d'environnement, une fonction à la fois | L'intégration s'ouvre progressivement |

On ne passe à B qu'une fois A vérifié. Chaque activation se défait en remettant sa variable à `false`, sans perte de données.

## 2. Avant de déployer

| # | Vérification | Comment |
|---|---|---|
| A1 | Sauvegarde fraîche et restaurable | Lancer à la main le workflow `backup` du dépôt du backend (*Actions > backup > Run workflow*) ; il vérifie la restauration. Il doit finir en vert |
| A2 | Branche déployée par Render | Paramètres du service sur Render. Elle doit rester `main` jusqu'à la fusion |
| A3 | Purge jamais en suppression | Aucune variable `GESTSTOCK_INTEGRATION_PURGE_MODE` égale à `DELETE`, ni aucune `GESTSTOCK_INTEGRATION_PURGE_ENABLED`, sur Render |
| A4 | Répétition sur une copie | Recommandé : créer une **branche Neon** (copie instantanée de la production, sans y toucher) et un service Render de préversion qui la vise ; y déployer la branche ; faire les vérifications du § 4. Supprimer la copie ensuite : elle seule est supprimée, jamais la production |
| A5 | Tests | Le workflow `backend-ci` est vert sur la demande de fusion (suite complète) |

## 3. Déployer (temps A)

1. Pousser la branche `feat/integration-lot2`, ouvrir la demande de fusion vers `main`, attendre `backend-ci` en vert.
2. Fusionner, puis laisser Render déployer `main`.
3. Au démarrage, le backend applique les migrations, toutes additives :

| Base | Migrations | Contenu |
|---|---|---|
| Plateforme | V002, V003, V004 | Clients, demandes, liaisons, codes, compteurs de débit ; audit des liaisons ; bail et état de la maintenance |
| Chaque entreprise | V049 à V052 | Permission `integration:manage` (donnée au rôle `ADMIN`) ; dépôts des liaisons ; drapeau de publication (baissé) ; acquittements |

Aucune table existante n'est modifiée ni vidée. Pendant sa mise à jour, une entreprise peut être brièvement indisponible : c'est le mécanisme normal de mise à jour des bases d'entreprise.

## 4. Vérifier après le déploiement (temps A)

| # | Vérification | Résultat attendu |
|---|---|---|
| V1 | Journaux de démarrage | « Contrôles de production passés » ; aucune erreur de migration |
| V2 | Santé | `GET /actuator/health` répond `UP` |
| V3 | Fonctions en ligne | Connexion, ventes, mouvements de stock, factures : identiques à avant |
| V4 | Routes d'intégration | `POST /internal/integration/maintenance` et les routes `/api/integration/v1/…` répondent `404` (maintenance et liaisons désactivées) |
| V5 | Bases d'entreprise | L'écran de la plateforme ne montre aucune entreprise bloquée en mise à jour (`UPGRADING` ou `FAILED`) |

### En cas de problème au temps A

Redéployer l'image précédente depuis Render (*Rollback*). Les nouvelles tables restent en place, inutilisées et sans effet : **ne lancez pas** les scripts d'annulation `U0xx`, qui suppriment des tables et sont contraires à la règle du § 36. Avant de compter sur ce retour arrière, vérifiez-le lors de la répétition A4 : l'ancienne version doit démarrer sur une base qui a reçu les nouvelles migrations.

## 5. Activer (temps B), dans cet ordre

### B0 — En-têtes de l'écran de consentement (site statique du frontend)

Le frontend est un site statique Render : la configuration nginx du dépôt (`deploy/`) **n'y est pas utilisée**. L'écran où une personne autorise une boutique (`/integrations/…`) a besoin de ses propres en-têtes. À déclarer **avant B1**, dans le site statique du frontend, *Settings > Headers* :

| Chemin | En-tête | Valeur | Pourquoi |
|---|---|---|---|
| `/integrations/*` | `Referrer-Policy` | `no-referrer` | L'adresse de l'écran porte la demande d'autorisation : elle ne doit jamais partir vers un autre site |
| `/integrations/*` | `Cache-Control` | `no-store` | L'écran n'est jamais gardé en cache |
| `/integrations/*` | `X-Frame-Options` | `DENY` | L'écran ne peut pas être affiché dans une page d'un autre site (piège au clic) |
| `/integrations/*` | `X-Content-Type-Options` | `nosniff` | Le navigateur respecte le type annoncé |

Ces règles ne touchent que `/integrations/*`, qui n'est pas utilisé avant B1 : rien ne change pour le reste du site. Vérification : ouvrir `https://<frontend>/integrations/test` et lire les en-têtes de la réponse dans les outils du navigateur (*Réseau*).

Les autres en-têtes du fichier `deploy/security-headers.conf` (dont la politique de sécurité du contenu, CSP) ne sont pas appliqués au site aujourd'hui, et ne l'étaient pas avant. Les ajouter au site entier est une amélioration à faire **séparément**, d'abord sur un site de préversion : une politique trop stricte peut bloquer des polices, des images ou la génération des PDF.

### B1 — Liaisons avec les boutiques

| Variable Render | Valeur |
|---|---|
| `GESTSTOCK_INTEGRATION_CLIENT_IP_HEADER` | En-tête d'IP réelle posé par Render, vérifié avec un `X-Forwarded-For` falsifié (contrôle I1, plan § 29.7) |
| `GESTSTOCK_INTEGRATION_LINKS_TOKEN_CURRENTKID` | Identifiant de clé en minuscules, par exemple `prod1` |
| `GESTSTOCK_INTEGRATION_LINKS_TOKEN_KEYS_PROD1` | Clé de signature des jetons de liaison : `openssl rand -base64 48`. Elle doit être **différente** de `GESTSTOCK_JWT_SECRET` |
| `GESTSTOCK_INTEGRATION_LINKS_ENABLED` | `true` |

Le backend refuse de démarrer si l'en-tête d'IP ou la clé manque, ou si la clé égale le secret des utilisateurs.

### B2 — Client JeCréeMaBoutique

Aucun écran ne crée le client : c'est une insertion SQL dans la base plateforme, à faire une fois. Le secret du client est remis à JeCréeMaBoutique par un canal sûr. Seule son empreinte SHA-256 est enregistrée.

```sql
-- Empreinte : printf %s "<secret du client>" | sha256sum
INSERT INTO platform.integration_client (client_id, name, secret_hash, allowed_scopes)
VALUES ('jecreemaboutique', 'JeCréeMaBoutique', '<empreinte en hexadécimal>', ARRAY['catalog:read']::varchar(30)[]);

INSERT INTO platform.integration_client_redirect_uri (client_id, redirect_uri)
SELECT id, '<adresse de retour fournie par JeCréeMaBoutique>' FROM platform.integration_client WHERE client_id = 'jecreemaboutique';
```

Seules des insertions : rien n'est modifié ni supprimé.

### B3 — Publication des changements et instantané

| Variable Render | Valeur |
|---|---|
| `GESTSTOCK_INTEGRATION_PAGETOKEN_CURRENTKID` | Par exemple `prod1` |
| `GESTSTOCK_INTEGRATION_PAGETOKEN_KEYS_PROD1` | `openssl rand -base64 48`, distincte de la clé de B1 |
| `GESTSTOCK_INTEGRATION_PUBLISH_ENABLED` | `true` |

Une entreprise ne publie ses changements que lorsqu'elle a au moins une liaison active : activer la publication ne change rien pour les entreprises sans liaison.

### B4 — Maintenance

Suivre `02-exploitation-maintenance.md`, § 2 (secret du cron, variables Render et GitHub, premier passage à la main). La purge reste en simulation.

## 6. Arrêter une fonction

| Fonction | Variable à remettre à `false` sur Render |
|---|---|
| Maintenance | `GESTSTOCK_MAINTENANCE_ENABLED` (et la variable GitHub du même nom) |
| Publication | `GESTSTOCK_INTEGRATION_PUBLISH_ENABLED` |
| Liaisons | `GESTSTOCK_INTEGRATION_LINKS_ENABLED` |

Les données déjà enregistrées (liaisons, événements, acquittements) restent intactes. Elles sont reprises à la réactivation.

## 7. À noter

- Les noms de variables des clés suivent la règle de Spring : la propriété en majuscules, les points remplacés par `_`, les tirets supprimés (`page-token.current-kid` donne `PAGETOKEN_CURRENTKID`). L'identifiant de clé doit être en minuscules.
- Si `GESTSTOCK_INTEGRATION_PUBLISH_ENABLED` vaut déjà `true` sur Render (lot 1), le lot 2 cesse d'écrire des événements pour les entreprises sans liaison (drapeau de publication, G13). Ces événements n'étaient lus par personne ; les événements déjà écrits restent en place.
- Ce guide ne remplace pas les contrôles déjà listés dans le plan (§ 29.7 et § 33.10) ; il les ordonne.
- Les valeurs et les adresses réelles (URL Render, secrets) ne figurent jamais dans ce dépôt.
