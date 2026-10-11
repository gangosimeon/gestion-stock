# Front GestStock : production

Ce document complète la référence complète (architecture, variables, checklist) : `gestionStock-backend/docs/production.md`.

## Build

```bash
npm ci
npx ng test --watch=false
npx ng build --configuration production   # → dist/gestion-stock/browser
```

La configuration `production` du fichier `angular.json` :
- remplace `environment.ts` par `environment.prod.ts`, avec `apiUrl: '/api'` (URL relative) et `useMocks: false` ;
- remplace `core/mocks/mock-providers.ts` par `mock-providers.prod.ts`, sans intercepteur simulé. Le backend simulé et ses données ne sont pas embarqués ; la CI vérifie l'absence de `localhost:8080` et du mock dans le bundle ;
- n'insère pas le CSS critique dans `index.html`, car Angular y ajouterait un `onload` bloqué par la Content-Security-Policy.

## Déploiement

L'API est appelée en **même origine** (`/api`). Le serveur qui sert le front doit donc relayer `/api/` vers le backend :
- le conteneur fourni (`Dockerfile` + `deploy/nginx.conf.template`) le fait avec `BACKEND_URL`, qui vaut `http://backend:8080` par défaut ;
- pour un autre hébergement, reproduire ce relais, ou modifier `apiUrl` dans `environment.prod.ts` et autoriser l'origine du front dans `GESTSTOCK_CORS_ALLOWED_ORIGINS` côté backend.

Le Nginx du conteneur :
- sert l'application monopage (toute route inconnue renvoie `index.html`) ;
- met en cache longtemps les fichiers versionnés, jamais `index.html` ;
- pose les en-têtes de sécurité : CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` ;
- expose une santé propre au front sur `/healthz`.

Le HTTPS et HSTS sont gérés par le reverse proxy public (`gestionStock-backend/deploy/reverse-proxy/geststock.conf`).

## Comportement face aux erreurs

| Cas | Comportement |
|---|---|
| 401 | Renouvellement du jeton une seule fois (requêtes concurrentes regroupées), puis requête rejouée. Si le renouvellement est refusé, la session se ferme et l'utilisateur revient à l'écran de connexion. |
| 403 | Message du backend (permission manquante). Routes et menus sont aussi masqués selon les permissions. |
| Réseau coupé (statut 0) | « Serveur injoignable : vérifiez votre connexion puis réessayez. » |
| 502, 503, 504 (proxy, redémarrage) | « Service momentanément indisponible. » |
| 500 | Message du backend accompagné de la `référence` (`traceId`) à communiquer au support. |
