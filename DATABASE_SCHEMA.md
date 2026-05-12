# Base de données MongoDB — Gestion Stock
## Schéma complet reconstruit depuis le code source

---

## Diagramme Logique de Données

```
┌─────────────┐         ┌───────────────────────────┐         ┌──────────────┐
│    users    │         │         products           │         │  categories  │
│─────────────│         │───────────────────────────│         │──────────────│
│ _id         │         │ _id                        │────────►│ _id          │
│ username    │         │ sku (unique)               │         │ name         │
│ fullName    │         │ name                       │         └──────────────┘
│ email       │         │ categoryId (ref)           │
│ phone       │         │ supplierId (ref, nullable) │◄──┐     ┌──────────────┐
│ passwordHash│         │ purchasePrice              │   │     │  suppliers   │
│ roles[]     │         │ retailPrice                │   └─────│ _id          │
│ isActive    │         │ wholesalePrice             │         │ name         │
│ magasin     │         │ alertThreshold             │         │ phone        │
│ avatar      │         └──────────────┬─────────────┘         │ email        │
│ createdAt   │                        │ (N:N)                  │ address      │
└──────┬──────┘                        ▼                        │ leadTimeDays │
       │               ┌────────────────────────┐              └──────┬───────┘
       │               │    warehouse_stocks     │                     │
       │               │────────────────────────│              ┌──────▼──────────────┐
       │               │ warehouseId (ref)       │              │  supplier_payments  │
       │               │ productId (ref)         │              │─────────────────────│
       │               │ quantity               │              │ supplierId (ref)     │
       │               └────────────────────────┘              │ orderId (ref,null)   │
       │                                                        │ amount               │
       │               ┌────────────────────────┐              │ paymentDate          │
       │               │      warehouses        │              └─────────────────────-┘
       │               │────────────────────────│
       │               │ _id                    │◄──────────────┐
       │               │ name                   │               │
       │               └────────────────────────┘      ┌────────────────────────────┐
       │                                                │      purchase_orders       │
       │  createdByUserId                               │────────────────────────────│
       ├──────────────────────────────────────────────►│ _id                        │
       │                                                │ supplierId (ref)           │
       │               ┌────────────────────────┐      │ supplierName (denorm)      │
       │               │    stock_movements     │      │ status: PENDING|DELIVERED  │
       │               │────────────────────────│      │ lines[] (embedded)         │
       │  createdByUserId                        │      │   └ productId, qty, price  │
       ├──────────────────────────────────────►  │      │ totalAmount                │
       │               │ productId (ref)         │      │ paidAmount                 │
       │               │ warehouseId (ref)       │      │ invoice (embedded, null)   │
       │               │ quantity (±)            │      │   └ number, date, total    │
       │               │ reason: SUPPLY|SALE|    │      │ createdAt                  │
       │               │         LOSS|ADJUSTMENT │      │ deliveredAt (null)         │
       │               └────────────────────────┘      └────────────────────────────┘
       │
       │               ┌────────────────────────┐      ┌─────────────────────────────┐
       │               │        sales           │      │         customers           │
       │               │────────────────────────│      │─────────────────────────────│
       │  createdByUserId                        │      │ _id                         │
       ├──────────────────────────────────────►  │      │ name                        │
       │               │ customerId (ref,null)  │◄─────│ phone                       │
       │               │ warehouseId (ref)       │      │ email                       │
       │               │ type: RETAIL|WHOLESALE  │      │ creditLimit                 │
       │               │ paymentMethod           │      └──────────────┬──────────────┘
       │               │ items[] (embedded)      │                     │
       │               │   └ productId,qty,price │      ┌──────────────▼──────────────┐
       │               │ total, profit           │      │     customer_payments       │
       │               │ paidAmount              │      │─────────────────────────────│
       │               └────────────────────────┘      │ customerId (ref)            │
       │                                                │ amount                      │
       │               ┌────────────────────────┐      │ paymentDate                 │
       │               │   inventory_sessions   │      │ note                        │
       │               │────────────────────────│      └─────────────────────────────┘
       │  createdByUserId
       ├──────────────────────────────────────►  │
       │               │ warehouseId (ref)       │
       │               │ lines[] (embedded)      │
       │               │ itemsCount              │
       │               │ totalDifference         │
       │               └────────────────────────┘
       │
       │               ┌──────────────────────────────┐
       │               │   cash_register_sessions     │
       │               │──────────────────────────────│
       │  openedByUserId                              │
       ├──────────────────────────────────────────►   │
       │  closedByUserId                              │
       ├──────────────────────────────────────────►   │
       │               │ warehouseId (ref)            │
       │               │ status: OPEN|CLOSED          │
       │               │ openingBalance               │
       │               └──────────────┬───────────────┘
       │                              │ (1:N)
       │               ┌──────────────▼──────────────┐
       │               │     cash_operations          │
       │               │─────────────────────────────│
       │  createdByUserId                             │
       ├──────────────────────────────────────────►   │
       │               │ sessionId (ref)             │
       │               │ type: IN|OUT                │
       │               │ amount                      │
       │               └─────────────────────────────┘
       │
       │  createdByUserId
       ├───────────────────────►┌──────────────┐
       │                        │   expenses   │
       │                        │──────────────│
       │                        │ category     │
       │                        │ label        │
       │                        │ amount       │
       │                        │ expenseDate  │
       │                        └──────────────┘
       │
       │  userId
       └───────────────────────►┌──────────────┐    ┌─────────────────┐
                                 │  audit_logs  │    │  appointments   │
                                 │──────────────│    │─────────────────│
                                 │ action       │    │ customerName    │
                                 │ entityType   │    │ phone           │
                                 │ entityId     │    │ dateTime        │
                                 │ status       │    │ status          │
                                 │ changes[]    │    └─────────────────┘
                                 └──────────────┘
```

---

## Collections MongoDB Complètes

### 1. `users`

**Rôle** : Comptes utilisateurs du système avec RBAC.

**Règles métier détectées** :
- `username` est unique (vérifié avant création/mise à jour)
- Un user peut avoir plusieurs rôles (tableau)
- Seul un ADMIN peut créer/modifier/désactiver/supprimer des users
- Rôles disponibles : `ADMIN`, `CAISSIER`, `GESTIONNAIRE`
- `isActive = false` désactive l'accès sans supprimer le compte
- Le champ `magasin` est informatif (pas d'isolation de données par magasin dans v1)

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "fullName", "roles", "isActive", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        username: {
          bsonType: "string",
          description: "Identifiant de connexion unique",
          minLength: 3,
          maxLength: 50
        },
        fullName: {
          bsonType: "string",
          description: "Nom complet affiché",
          minLength: 2
        },
        email: { bsonType: ["string", "null"] },
        phone: { bsonType: ["string", "null"] },
        passwordHash: {
          bsonType: "string",
          description: "Hash bcrypt du mot de passe"
        },
        roles: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "string",
            enum: ["ADMIN", "CAISSIER", "GESTIONNAIRE"]
          },
          description: "Au moins un rôle requis"
        },
        isActive: {
          bsonType: "bool",
          description: "Compte actif ou suspendu"
        },
        magasin: { bsonType: ["string", "null"] },
        avatar: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] }
      },
      additionalProperties: false
    }
  }
});

db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { sparse: true });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ roles: 1 });
```

**Document exemple** :
```json
{
  "_id": { "$oid": "..." },
  "username": "admin",
  "fullName": "Admin Principal",
  "email": "admin@geststock.com",
  "phone": null,
  "passwordHash": "$2b$10$...",
  "roles": ["ADMIN"],
  "isActive": true,
  "magasin": "Dépôt Central",
  "avatar": null,
  "createdAt": { "$date": "2025-01-01T00:00:00Z" },
  "updatedAt": null
}
```

---

### 2. `refresh_tokens`

**Rôle** : Tokens de renouvellement JWT (impliqué par auth service).

**Règles métier** :
- Un token de refresh est invalidé après usage (rotation)
- Expiration automatique via TTL index MongoDB

```javascript
db.createCollection("refresh_tokens", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "token", "expiresAt", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "Ref → users" },
        token: { bsonType: "string", description: "Valeur du refresh token (hashé)" },
        expiresAt: { bsonType: "date" },
        createdAt: { bsonType: "date" },
        revokedAt: { bsonType: ["date", "null"] },
        ipAddress: { bsonType: ["string", "null"] }
      }
    }
  }
});

db.refresh_tokens.createIndex({ token: 1 }, { unique: true });
db.refresh_tokens.createIndex({ userId: 1 });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-purge
```

---

### 3. `categories`

**Rôle** : Catégorisation des produits (Verres, Montures, Lentilles…).

**Règles métier** :
- Nom unique
- Pas de sous-catégories dans v1

```javascript
db.createCollection("categories", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1, maxLength: 100 },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.categories.createIndex({ name: 1 }, { unique: true });
```

---

### 4. `warehouses`

**Rôle** : Dépôts / magasins physiques. Contexte de toutes les opérations de stock.

**Règles métier** :
- Nom unique
- Tout appel API reçoit `X-Warehouse-Id` header pour contextualiser le stock
- Default warehouse : `wh_1` (stocké dans localStorage côté client)
- ADMIN et GESTIONNAIRE seulement peuvent créer un dépôt
- À la création d'un dépôt, le stock de chaque produit existant est initialisé à 0

```javascript
db.createCollection("warehouses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1, maxLength: 100 },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.warehouses.createIndex({ name: 1 }, { unique: true });
```

---

### 5. `products`

**Rôle** : Catalogue produits avec triple prix (achat / détail / gros).

**Règles métier détectées** :
- `sku` est unique (identifiant métier du produit)
- 3 niveaux de prix : `purchasePrice`, `retailPrice`, `wholesalePrice`
- `purchasePrice` est **mis à jour automatiquement** lors de la réception d'une commande fournisseur (`deliveredAt`)
- `stockQuantity` dans ce document est la **somme globale** (non contextualisée par dépôt) — le stock réel par dépôt est dans `warehouse_stocks`
- `alertThreshold` déclenche l'alerte visuelle : `stockQuantity <= alertThreshold` → "Stock faible"
- `stockQuantity <= 0` → "Rupture"
- `supplierId` est facultatif (produit sans fournisseur attitré)
- Seul ADMIN peut supprimer un produit
- ADMIN + GESTIONNAIRE peuvent créer/modifier

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "name", "categoryId", "purchasePrice", "retailPrice", "wholesalePrice", "alertThreshold", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        sku: { bsonType: "string", description: "Code article unique", minLength: 1 },
        name: { bsonType: "string", minLength: 1 },
        categoryId: { bsonType: "objectId", description: "Ref → categories" },
        categoryName: { bsonType: ["string", "null"], description: "Dénormalisé pour performance" },
        supplierId: { bsonType: ["objectId", "null"], description: "Ref → suppliers, optionnel" },
        purchasePrice: { bsonType: "double", minimum: 0 },
        retailPrice: { bsonType: "double", minimum: 0 },
        wholesalePrice: { bsonType: "double", minimum: 0 },
        alertThreshold: { bsonType: "int", minimum: 0 },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] }
      }
    }
  }
});

db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ categoryId: 1 });
db.products.createIndex({ supplierId: 1 }, { sparse: true });
db.products.createIndex({ name: "text", sku: "text" }); // recherche full-text
```

---

### 6. `warehouse_stocks`

**Rôle** : Stock de chaque produit dans chaque dépôt (table pivot N:N avec quantité).

**Règles métier** :
- **Clé composite unique** : `(warehouseId, productId)`
- Lors d'une **vente** : `quantity -= item.quantity` (par dépôt)
- Lors d'une **réception commande** : `quantity += line.quantity`
- Lors d'un **transfert** : `from.quantity -= qty`, `to.quantity += qty`
- Lors d'un **inventaire** : `quantity = physicalQuantity` (correction directe)
- Lors d'un **mouvement manuel** : `quantity += delta`
- Contrainte : `quantity >= 0` SAUF si `reason=ADJUSTMENT` (peut devenir négatif en inventaire différentiel)
- Stock insuffisant → rejet de la vente ou du transfert

```javascript
db.createCollection("warehouse_stocks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["warehouseId", "productId", "quantity", "updatedAt"],
      properties: {
        _id: { bsonType: "objectId" },
        warehouseId: { bsonType: "objectId", description: "Ref → warehouses" },
        productId: { bsonType: "objectId", description: "Ref → products" },
        quantity: { bsonType: "int", minimum: 0 },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.warehouse_stocks.createIndex({ warehouseId: 1, productId: 1 }, { unique: true });
db.warehouse_stocks.createIndex({ productId: 1 });
db.warehouse_stocks.createIndex({ warehouseId: 1 });
```

---

### 7. `stock_movements`

**Rôle** : Journal immuable de tous les mouvements de stock (tracabilité complète).

**Règles métier** :
- `quantity > 0` = entrée (SUPPLY, ADJUSTMENT positif)
- `quantity < 0` = sortie (SALE, LOSS, ADJUSTMENT négatif)
- Jamais modifié après création (append-only)
- `reason` values :
  - `SUPPLY` : réception commande fournisseur
  - `SALE` : vente client
  - `LOSS` : perte/casse manuelle
  - `ADJUSTMENT` : inventaire ou transfert inter-dépôts
- `warehouseId` est **obligatoire** en base (absent du modèle frontend — incohérence corrigée ici)
- Lors d'un transfert : 2 enregistrements créés (OUT du source, IN vers destination)
- La note contient le contexte : `"Vente s_123 (wh_1)"`, `"Transfert wh_1 -> wh_2"`, `"Inventaire (wh_1)"`

```javascript
db.createCollection("stock_movements", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["productId", "warehouseId", "quantity", "reason", "createdAt", "createdByUserId"],
      properties: {
        _id: { bsonType: "objectId" },
        productId: { bsonType: "objectId", description: "Ref → products" },
        warehouseId: { bsonType: "objectId", description: "Ref → warehouses" },
        quantity: { bsonType: "int", description: "Positif = entrée, Négatif = sortie" },
        reason: {
          bsonType: "string",
          enum: ["SUPPLY", "SALE", "LOSS", "ADJUSTMENT"]
        },
        saleId: { bsonType: ["objectId", "null"], description: "Ref → sales si reason=SALE" },
        orderId: { bsonType: ["objectId", "null"], description: "Ref → purchase_orders si reason=SUPPLY" },
        inventorySessionId: { bsonType: ["objectId", "null"], description: "Ref → inventory_sessions si reason=ADJUSTMENT (inventaire)" },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.stock_movements.createIndex({ productId: 1, createdAt: -1 });
db.stock_movements.createIndex({ warehouseId: 1, createdAt: -1 });
db.stock_movements.createIndex({ reason: 1 });
db.stock_movements.createIndex({ createdAt: -1 });
db.stock_movements.createIndex({ saleId: 1 }, { sparse: true });
db.stock_movements.createIndex({ orderId: 1 }, { sparse: true });
```

---

### 8. `suppliers`

**Rôle** : Répertoire des fournisseurs avec délai de livraison.

**Règles métier** :
- `deliveryLeadTimeDays >= 0` obligatoire
- Suppression en cascade sur `supplier_payments` et `supplier_purchase_history`
- Seul ADMIN peut supprimer

```javascript
db.createCollection("suppliers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "deliveryLeadTimeDays", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        phone: { bsonType: ["string", "null"] },
        email: { bsonType: ["string", "null"] },
        address: { bsonType: ["string", "null"] },
        deliveryLeadTimeDays: { bsonType: "int", minimum: 0 },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] }
      }
    }
  }
});

db.suppliers.createIndex({ name: 1 });
db.suppliers.createIndex({ name: "text" });
```

---

### 9. `purchase_orders`

**Rôle** : Commandes d'achat auprès des fournisseurs.

**Règles métier** :
- Statuts : `PENDING` → `DELIVERED` (transition unique, irréversible)
- `lines[]` : tableau embarqué (snapshot des produits au moment de la commande)
- `supplierName` dénormalisé (snapshot au moment de la commande)
- `totalAmount = sum(line.lineTotal)` calculé à la création
- `paidAmount` incrémenté à chaque paiement partiel
- Règle paiement : `paidAmount + newAmount <= totalAmount`
- À la réception : `product.purchasePrice` mis à jour = `line.unitPurchasePrice`
- `invoice` est un sous-document embarqué, créé séparément (un seul par commande)
- ADMIN + GESTIONNAIRE seulement

```javascript
db.createCollection("purchase_orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["supplierId", "supplierName", "status", "lines", "totalAmount", "paidAmount", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        supplierId: { bsonType: "objectId", description: "Ref → suppliers" },
        supplierName: { bsonType: "string", description: "Snapshot dénormalisé" },
        status: {
          bsonType: "string",
          enum: ["PENDING", "DELIVERED"]
        },
        lines: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["productId", "productSku", "productName", "quantity", "unitPurchasePrice", "lineTotal"],
            properties: {
              productId: { bsonType: "objectId" },
              productSku: { bsonType: "string", description: "Snapshot SKU" },
              productName: { bsonType: "string", description: "Snapshot nom" },
              quantity: { bsonType: "int", minimum: 1 },
              unitPurchasePrice: { bsonType: "double", minimum: 0 },
              lineTotal: { bsonType: "double", minimum: 0 }
            }
          }
        },
        totalAmount: { bsonType: "double", minimum: 0 },
        paidAmount: { bsonType: "double", minimum: 0 },
        invoice: {
          bsonType: ["object", "null"],
          description: "Facture fournisseur (embarquée, optionnelle)",
          properties: {
            invoiceNumber: { bsonType: "string" },
            invoiceDateIso: { bsonType: "string" },
            totalAmount: { bsonType: "double" }
          }
        },
        createdAt: { bsonType: "date" },
        deliveredAt: { bsonType: ["date", "null"] },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.purchase_orders.createIndex({ supplierId: 1, createdAt: -1 });
db.purchase_orders.createIndex({ status: 1 });
db.purchase_orders.createIndex({ createdAt: -1 });
db.purchase_orders.createIndex({ "lines.productId": 1 });
```

---

### 10. `supplier_payments`

**Rôle** : Paiements effectués vers les fournisseurs (partiels ou totaux).

**Règles métier** :
- `amount > 0` obligatoire
- Si `orderId` fourni : `amount <= (order.totalAmount - order.paidAmount)` (sinon rejeté)
- Un paiement peut être global (sans orderId) ou lié à une commande spécifique
- Mise à jour de `purchase_orders.paidAmount += amount` si orderId fourni

```javascript
db.createCollection("supplier_payments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["supplierId", "amount", "paymentDate", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        supplierId: { bsonType: "objectId", description: "Ref → suppliers" },
        orderId: { bsonType: ["objectId", "null"], description: "Ref → purchase_orders, optionnel" },
        amount: { bsonType: "double", exclusiveMinimum: 0 },
        paymentDate: { bsonType: "date" },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.supplier_payments.createIndex({ supplierId: 1, paymentDate: -1 });
db.supplier_payments.createIndex({ orderId: 1 }, { sparse: true });
```

---

### 11. `customers`

**Rôle** : Base clients avec gestion de crédit.

**Règles métier critiques** :
- `creditLimit = 0` → aucun crédit autorisé (paiement intégral obligatoire)
- `creditLimit > 0` → ventes à crédit autorisées jusqu'à la limite
- Calcul de la dette en temps réel :
  ```
  dette_courante = sum(sale.total) - sum(sale.paidAmount) - sum(customerPayment.amount)
  ```
- Si `dette_courante + (vente.total - vente.paidAmount) > creditLimit` → vente refusée
- Une vente à crédit (`paidAmount < total`) **requiert** un `customerId` (règle UI + backend)
- Suppression en cascade sur `customer_payments`

```javascript
db.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "creditLimit", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        phone: { bsonType: ["string", "null"] },
        email: { bsonType: ["string", "null"] },
        creditLimit: { bsonType: "double", minimum: 0 },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] }
      }
    }
  }
});

db.customers.createIndex({ name: "text", phone: "text" });
db.customers.createIndex({ name: 1 });
```

---

### 12. `customer_payments`

**Rôle** : Règlements reçus des clients (remboursements de crédit).

**Règles métier** :
- `amount > 0` obligatoire
- Réduit la dette courante du client
- ADMIN + GESTIONNAIRE + CAISSIER peuvent enregistrer

```javascript
db.createCollection("customer_payments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "amount", "paymentDate", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        customerId: { bsonType: "objectId", description: "Ref → customers" },
        amount: { bsonType: "double", exclusiveMinimum: 0 },
        paymentDate: { bsonType: "date" },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.customer_payments.createIndex({ customerId: 1, paymentDate: -1 });
```

---

### 13. `sales`

**Rôle** : Transactions de vente (POS). Collection centrale du chiffre d'affaires.

**Règles métier critiques** :
- `items[]` embarqué : snapshot des prix au moment de la vente
- `total = sum(item.unitPrice * item.quantity)` (calculé, non saisi)
- `profit = sum((item.unitPrice - item.purchasePrice) * item.quantity)`
- Prix selon type de vente :
  - `RETAIL` → `product.retailPrice`
  - `WHOLESALE` → `product.wholesalePrice`
- `paidAmount <= total` (règle backend — paiement ne peut pas dépasser le total)
- `paidAmount < total` → vente à crédit → `customerId` **obligatoire**
- `dueAmount = total - paidAmount` (montant restant dû)
- `changeAmount = paidAmount - total` (rendu de monnaie, si paidAmount > total — bloqué par backend)
- Validation stock par dépôt avant enregistrement
- `warehouseId` déduit du header `X-Warehouse-Id` (à stocker explicitement)
- Après création : génère des `stock_movements` (reason=SALE) + décrémente `warehouse_stocks`

```javascript
db.createCollection("sales", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "items", "paymentMethod", "paidAmount", "total", "profit", "warehouseId", "createdAt", "createdByUserId"],
      properties: {
        _id: { bsonType: "objectId" },
        type: {
          bsonType: "string",
          enum: ["RETAIL", "WHOLESALE"]
        },
        customerId: { bsonType: ["objectId", "null"], description: "Ref → customers, null si vente anonyme" },
        warehouseId: { bsonType: "objectId", description: "Ref → warehouses (déduit du header)" },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["productId", "quantity", "unitPrice", "purchasePrice"],
            properties: {
              productId: { bsonType: "objectId", description: "Ref → products" },
              quantity: { bsonType: "int", minimum: 1 },
              unitPrice: { bsonType: "double", minimum: 0, description: "Prix de vente au moment de la vente" },
              purchasePrice: { bsonType: "double", minimum: 0, description: "Prix d'achat au moment de la vente (pour calcul marge)" }
            }
          }
        },
        paymentMethod: {
          bsonType: "string",
          enum: ["CASH", "MOBILE_MONEY", "BANK_TRANSFER"]
        },
        paidAmount: { bsonType: "double", minimum: 0 },
        total: { bsonType: "double", minimum: 0 },
        profit: { bsonType: "double", description: "Peut être négatif (vente à perte)" },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users (caissier)" }
      }
    }
  }
});

db.sales.createIndex({ createdAt: -1 });
db.sales.createIndex({ customerId: 1, createdAt: -1 }, { sparse: true });
db.sales.createIndex({ warehouseId: 1, createdAt: -1 });
db.sales.createIndex({ paymentMethod: 1 });
db.sales.createIndex({ type: 1 });
db.sales.createIndex({ createdByUserId: 1 });
db.sales.createIndex({ "items.productId": 1 });
// Index composé pour calcul de dette client
db.sales.createIndex({ customerId: 1, paidAmount: 1, total: 1 }, { sparse: true });
```

---

### 14. `inventory_sessions`

**Rôle** : Sessions d'inventaire physique avec comparaison système vs réalité.

**Règles métier** :
- `lines[]` comparent `systemQuantity` (stock MongoDB au moment du comptage) vs `physicalQuantity` (saisi)
- `difference = physicalQuantity - systemQuantity`
- `totalDifference = sum(line.difference)`
- Après création : pour chaque ligne avec `difference != 0` :
  - `warehouse_stocks[warehouseId][productId] = physicalQuantity`
  - Crée un `stock_movement` (reason=ADJUSTMENT)
- `warehouseId` est **obligatoire** (absent du modèle frontend — corrigé ici)
- ADMIN + GESTIONNAIRE seulement

```javascript
db.createCollection("inventory_sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["warehouseId", "lines", "itemsCount", "totalDifference", "createdAt", "createdByUserId"],
      properties: {
        _id: { bsonType: "objectId" },
        warehouseId: { bsonType: "objectId", description: "Ref → warehouses" },
        note: { bsonType: ["string", "null"] },
        lines: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["productId", "productSku", "productName", "systemQuantity", "physicalQuantity", "difference"],
            properties: {
              productId: { bsonType: "objectId" },
              productSku: { bsonType: "string", description: "Snapshot" },
              productName: { bsonType: "string", description: "Snapshot" },
              systemQuantity: { bsonType: "int", minimum: 0 },
              physicalQuantity: { bsonType: "int", minimum: 0 },
              difference: { bsonType: "int", description: "physicalQuantity - systemQuantity (peut être négatif)" }
            }
          }
        },
        itemsCount: { bsonType: "int", minimum: 0 },
        totalDifference: { bsonType: "int" },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.inventory_sessions.createIndex({ warehouseId: 1, createdAt: -1 });
db.inventory_sessions.createIndex({ createdAt: -1 });
```

---

### 15. `cash_register_sessions`

**Rôle** : Sessions d'ouverture/fermeture de caisse avec réconciliation.

**Règles métier critiques** :
- **Une seule session OPEN à la fois** (contrainte applicative + index)
- `openingBalance >= 0`
- `cashSalesTotal` = agrégation dynamique des ventes CASH pendant la plage horaire
- `expectedCash = openingBalance + cashSalesTotal + totalIn - totalOut`
- `difference = countedCash - expectedCash` (écart de caisse)
- `difference != 0` → à justifier (audit)
- Tous les rôles peuvent ouvrir/fermer (ADMIN, GESTIONNAIRE, CAISSIER)
- `warehouseId` est implicite (corrigé ici)

```javascript
db.createCollection("cash_register_sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["warehouseId", "status", "openingBalance", "openedAt", "openedByUserId", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        warehouseId: { bsonType: "objectId", description: "Ref → warehouses" },
        status: { bsonType: "string", enum: ["OPEN", "CLOSED"] },
        openingBalance: { bsonType: "double", minimum: 0 },
        openedAt: { bsonType: "date" },
        openedByUserId: { bsonType: "objectId", description: "Ref → users" },
        closedAt: { bsonType: ["date", "null"] },
        closedByUserId: { bsonType: ["objectId", "null"], description: "Ref → users" },
        countedCash: { bsonType: ["double", "null"], minimum: 0 },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// Garantit une seule caisse ouverte à la fois
db.cash_register_sessions.createIndex(
  { warehouseId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } }
);
db.cash_register_sessions.createIndex({ openedAt: -1 });
db.cash_register_sessions.createIndex({ warehouseId: 1, openedAt: -1 });
```

---

### 16. `cash_operations`

**Rôle** : Mouvements manuels de caisse (appoints, retraits).

**Règles métier** :
- `amount > 0` toujours positif (le `type` IN/OUT détermine le sens)
- Lié à une session OPEN uniquement
- Contribue à `totalIn` et `totalOut` de la session

```javascript
db.createCollection("cash_operations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sessionId", "type", "amount", "createdAt", "createdByUserId"],
      properties: {
        _id: { bsonType: "objectId" },
        sessionId: { bsonType: "objectId", description: "Ref → cash_register_sessions" },
        type: { bsonType: "string", enum: ["IN", "OUT"] },
        amount: { bsonType: "double", exclusiveMinimum: 0 },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.cash_operations.createIndex({ sessionId: 1, createdAt: -1 });
```

---

### 17. `expenses`

**Rôle** : Charges et dépenses de l'entreprise.

**Règles métier** :
- `amount > 0`
- `category` est une chaîne libre (à normaliser — incohérence signalée)
- `expenseDate` est la date comptable (peut différer de `createdAt`)
- ADMIN + GESTIONNAIRE peuvent créer
- Seul ADMIN peut supprimer

```javascript
db.createCollection("expenses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["category", "label", "amount", "expenseDate", "createdAt", "createdByUserId"],
      properties: {
        _id: { bsonType: "objectId" },
        category: { bsonType: "string", minLength: 1 },
        label: { bsonType: "string", minLength: 1 },
        amount: { bsonType: "double", exclusiveMinimum: 0 },
        expenseDate: { bsonType: "date" },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        createdByUserId: { bsonType: "objectId", description: "Ref → users" }
      }
    }
  }
});

db.expenses.createIndex({ expenseDate: -1 });
db.expenses.createIndex({ category: 1 });
db.expenses.createIndex({ createdAt: -1 });
```

---

### 18. `appointments`

**Rôle** : Rendez-vous clients (module CRM léger).

**Règles métier** :
- `customerName` est une chaîne libre (pas de FK vers `customers` — incohérence)
- Statuts : `SCHEDULED` → `COMPLETED` ou `CANCELLED`
- Filtres supportés : search (nom), status, dateFrom, dateTo
- Tous les utilisateurs authentifiés peuvent gérer les RDV

```javascript
db.createCollection("appointments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerName", "phone", "dateTime", "status", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        customerName: { bsonType: "string", minLength: 1 },
        customerId: { bsonType: ["objectId", "null"], description: "Ref optionnelle → customers (à implémenter)" },
        phone: { bsonType: "string" },
        dateTime: { bsonType: "date" },
        status: {
          bsonType: "string",
          enum: ["SCHEDULED", "COMPLETED", "CANCELLED"]
        },
        note: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] }
      }
    }
  }
});

db.appointments.createIndex({ dateTime: 1 });
db.appointments.createIndex({ status: 1, dateTime: 1 });
db.appointments.createIndex({ customerName: "text" });
```

---

### 19. `audit_logs`

**Rôle** : Journal d'audit système immuable (traçabilité totale).

**Règles métier** :
- **Append-only** (jamais modifié ni supprimé via l'API)
- `userId`, `username`, `userRole` sont snapshotés au moment de l'action
- `before` / `after` : états JSON avant/après modification (pour UPDATE)
- `changes[]` : diff champ par champ
- `status = FAILURE` : action tentée mais échouée (ex: mot de passe incorrect)
- Seul ADMIN peut lire les logs
- Purge automatique après 90 jours via TTL index
- Limité à 500 entrées en mémoire (mock) → en prod : illimité avec TTL
- Actions trackées : CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, RECEIVE, PAY, TRANSFER, OPEN, CLOSE

```javascript
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "username", "userRole", "action", "entityType", "entityId", "entityLabel", "ipAddress", "status", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "Ref → users (snapshot, peut pointer un user supprimé)" },
        username: { bsonType: "string", description: "Snapshot username au moment de l'action" },
        userRole: { bsonType: "string", description: "Snapshot rôle principal" },
        action: {
          bsonType: "string",
          enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "RECEIVE", "PAY", "TRANSFER", "OPEN", "CLOSE"]
        },
        entityType: {
          bsonType: "string",
          enum: ["PRODUCT", "SALE", "SUPPLIER", "PURCHASE_ORDER", "EXPENSE", "INVENTORY_SESSION", "CASH_REGISTER_SESSION", "WAREHOUSE_TRANSFER", "CUSTOMER", "USER", "SYSTEM"]
        },
        entityId: { bsonType: "string", description: "ID stringifié de l'entité affectée" },
        entityLabel: { bsonType: "string", description: "Libellé lisible (ex: 'Ciment 50kg', 'Vente #001')" },
        ipAddress: { bsonType: "string" },
        status: { bsonType: "string", enum: ["SUCCESS", "FAILURE"] },
        changes: {
          bsonType: ["array", "null"],
          items: {
            bsonType: "object",
            properties: {
              field: { bsonType: "string" },
              oldValue: {},
              newValue: {}
            }
          }
        },
        details: { bsonType: ["string", "null"] },
        before: {},
        after: {},
        meta: { bsonType: ["object", "null"] },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.audit_logs.createIndex({ createdAt: -1 });
db.audit_logs.createIndex({ userId: 1, createdAt: -1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ entityType: 1, entityId: 1 });
db.audit_logs.createIndex({ status: 1 });
// TTL : purge automatique après 90 jours
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

---

## Champs Calculés (Computed Fields)

Ces valeurs ne sont **jamais stockées** en base, toujours calculées à la lecture :

| Entité | Champ calculé | Formule |
|---|---|---|
| `Product` | `stockQuantity` | Lookup `warehouse_stocks` par warehouseId |
| `Product` | `isLowStock` | `stockQuantity <= alertThreshold` |
| `Product` | `availabilityLabel` | `stockQuantity <= 0` → "Rupture" / `isLowStock` → "Faible" |
| `Sale` | `dueAmount` | `max(0, total - paidAmount)` |
| `Sale` | `changeAmount` | `max(0, paidAmount - total)` |
| `Customer` | `currentDebt` | `sum(sales.total) - sum(sales.paidAmount) - sum(customerPayments.amount)` |
| `CashRegisterSession` | `cashSalesTotal` | `sum(sales[paymentMethod=CASH, createdAt ∈ [openedAt, closedAt]].paidAmount)` |
| `CashRegisterSession` | `totalIn` | `sum(cashOperations[type=IN, sessionId=X].amount)` |
| `CashRegisterSession` | `totalOut` | `sum(cashOperations[type=OUT, sessionId=X].amount)` |
| `CashRegisterSession` | `expectedCash` | `openingBalance + cashSalesTotal + totalIn - totalOut` |
| `CashRegisterSession` | `difference` | `countedCash - expectedCash` |
| `PurchaseOrder` | `remainingAmount` | `totalAmount - paidAmount` |
| `InventorySession` | `totalDifference` | `sum(lines[].difference)` |
| `StockMovement` | `uiType` | `quantity >= 0 ? "IN" : "OUT"` |

---

## Règles Métier Cachées (extraites des services et composants)

### Ventes
1. **Vente à crédit** : `paidAmount < total` → `customerId` est obligatoire (règle UI ligne 181 `sales-shell-page.component.ts`)
2. **Limite de crédit** : Calculée dynamiquement avant chaque vente — pas stockée, toujours recalculée
3. **Prix auto** : Le prix est switché automatiquement selon `saleType` (RETAIL/WHOLESALE) via `setSaleType()` dans `sales.facade.ts`
4. **Quantité entière** : `Math.floor(quantity)` — impossible de vendre des fractions (`stock.facade.ts`)
5. **Profit à la ligne** : `lineProfit = (unitPrice - purchasePrice) * quantity` calculé côté client dans le panier

### Achats
6. **Mise à jour du prix d'achat** : À chaque réception de commande, `product.purchasePrice` est mis à jour avec `line.unitPurchasePrice` — le prix d'achat du produit est donc **toujours le dernier prix fournisseur**
7. **Stock mis à jour par dépôt** : La réception incrémente le stock du dépôt courant (header `X-Warehouse-Id`), pas un dépôt global
8. **Paiement partiel** : `purchaseOrder.paidAmount` est incrémental, jamais remplacé

### Stock
9. **Signe de quantité** : `quantity >= 0` → entrée (IN), `quantity < 0` → sortie (OUT) — pas de champ `direction`, tout est dans le signe
10. **Transfert = 2 mouvements** : Toujours deux `stock_movements` créés simultanément (OUT source + IN destination, même timestamp)

### Inventaire  
11. **Inventaire = correction immédiate** : À la validation, le stock est immédiatement corrigé — pas de workflow de validation
12. **Snapshot au moment du comptage** : `systemQuantity` est la valeur au moment de la création de la session, pas une valeur recalculée

### Caisse
13. **`cashSalesTotal` calculé à la lecture** : Jamais stocké. Calculé à chaque `GET /cash-register/current` en filtrant les ventes CASH dans la plage horaire de la session
14. **Une seule caisse ouverte** : Règle stricte — une tentative d'ouverture quand une session est déjà OPEN retourne une erreur 400

### Permissions RBAC (extraites du mock-backend)
| Action | ADMIN | GESTIONNAIRE | CAISSIER |
|---|:---:|:---:|:---:|
| Créer produit | ✅ | ✅ | ❌ |
| Modifier produit | ✅ | ✅ | ❌ |
| **Supprimer produit** | ✅ | ❌ | ❌ |
| Créer vente | ✅ | ✅ | ✅ |
| Créer client | ✅ | ✅ | ✅ |
| **Supprimer client** | ✅ | ❌ | ❌ |
| Paiement client | ✅ | ✅ | ✅ |
| Créer fournisseur | ✅ | ✅ | ❌ |
| **Supprimer fournisseur** | ✅ | ❌ | ❌ |
| Créer commande achat | ✅ | ✅ | ❌ |
| Réceptionner commande | ✅ | ✅ | ❌ |
| Payer fournisseur | ✅ | ✅ | ❌ |
| Créer dépôt | ✅ | ✅ | ❌ |
| Transfert inter-dépôts | ✅ | ✅ | ❌ |
| Session inventaire | ✅ | ✅ | ❌ |
| Créer dépense | ✅ | ✅ | ❌ |
| **Supprimer dépense** | ✅ | ❌ | ❌ |
| Ouvrir/Fermer caisse | ✅ | ✅ | ✅ |
| Opération caisse | ✅ | ✅ | ✅ |
| **Journal d'audit** | ✅ | ❌ | ❌ |
| **Gestion utilisateurs** | ✅ | ❌ | ❌ |

---

## Résumé des Index Critiques pour Performance

```javascript
// Requêtes fréquentes identifiées dans les services
// 1. Stock par dépôt pour un produit
db.warehouse_stocks.createIndex({ warehouseId: 1, productId: 1 }, { unique: true });

// 2. Mouvements par produit + date (filtres dans stock.facade.ts)
db.stock_movements.createIndex({ productId: 1, createdAt: -1 });

// 3. Ventes d'un client (calcul crédit)
db.sales.createIndex({ customerId: 1, createdAt: -1 });

// 4. Ventes CASH pour réconciliation caisse
db.sales.createIndex({ paymentMethod: 1, createdAt: -1, warehouseId: 1 });

// 5. Commandes par fournisseur
db.purchase_orders.createIndex({ supplierId: 1, status: 1 });

// 6. Paiements d'un fournisseur
db.supplier_payments.createIndex({ supplierId: 1, paymentDate: -1 });

// 7. Opérations d'une session caisse
db.cash_operations.createIndex({ sessionId: 1, createdAt: -1 });

// 8. Caisse courante (unique OPEN par dépôt)
db.cash_register_sessions.createIndex(
  { warehouseId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } }
);

// 9. Logs d'audit (admin dashboard)
db.audit_logs.createIndex({ createdAt: -1 });
db.audit_logs.createIndex({ userId: 1, createdAt: -1 });
```
