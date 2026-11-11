# 🧵 Stylo.boutique — E-commerce de vêtements

Application e-commerce de démonstration pour vendre des vêtements **Homme**, **Femme** et **Enfant**.

## Fonctionnalités

- **Catalogue** : 24 articles répartis en 3 catégories (homme, femme, enfant) avec tailles, coloris, prix, promos, notes et stock.
- **Navigation** : page d'accueil, catalogue par catégorie, filtres par sous-catégorie (chemises, robes, pantalons…), tri par prix / note, recherche plein texte.
- **Fiche produit** : sélection de taille, suggestions d'articles similaires, indicateur de stock.
- **Panier** : ajout, modification des quantités, suppression, persistant (localStorage).
- **Commande** : tunnel de checkout avec validation (e-mail, champs requis, stock), calcul du total côté serveur, livraison offerte dès 60 €, page de confirmation avec numéro de commande.
- **API REST** : produits, catégories, commandes (persistées dans `data/orders.json`).

## Démarrage

```bash
npm install
npm start
```

L'application est disponible sur http://localhost:3000 (variable d'environnement `PORT` pour changer).

Mode développement avec rechargement automatique :

```bash
npm run dev
```

## Tests

Lancer le serveur puis, dans un autre terminal :

```bash
BASE_URL=http://localhost:3000 node test-api.js
```

15 tests couvrant le catalogue, la recherche, les validations et le passage de commande.

## Structure

```
server.js            Serveur Express + API REST
src/products.js      Données produits et catégories
public/              Frontend (HTML/CSS/JS, SPA sans build)
test-api.js          Tests d'intégration de l'API
data/orders.json     Commandes (créé automatiquement)
```

## API

| Méthode | Route                 | Description                                        |
|---------|-----------------------|----------------------------------------------------|
| GET     | `/api/categories`     | Liste des catégories avec nombre d'articles        |
| GET     | `/api/products`       | Catalogue (`?category=&subcategory=&search=&sort=`)|
| GET     | `/api/products/:id`   | Fiche produit + suggestions                        |
| POST    | `/api/orders`         | Créer une commande (client + articles)             |
| GET     | `/api/orders/:id`     | Consulter une commande                             |

> Application de démonstration : le paiement est simulé.
