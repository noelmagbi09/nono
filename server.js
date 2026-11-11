const path = require('path');
const fs = require('fs');
const express = require('express');
const { CATEGORIES, products } = require('./src/products');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

app.get('/api/categories', (req, res) => {
  const counts = {};
  for (const p of products) counts[p.category] = (counts[p.category] || 0) + 1;
  res.json(CATEGORIES.map((c) => ({ ...c, productCount: counts[c.id] || 0 })));
});

app.get('/api/products', (req, res) => {
  const { category, subcategory, search, sort } = req.query;
  let result = [...products];

  if (category) {
    if (!CATEGORIES.some((c) => c.id === category)) {
      return res.status(400).json({ error: 'Catégorie inconnue' });
    }
    result = result.filter((p) => p.category === category);
  }
  if (subcategory) result = result.filter((p) => p.subcategory === subcategory);
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);

  res.json(result);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  res.json({ ...product, related });
});

app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};

  if (!customer || typeof customer !== 'object') {
    return res.status(400).json({ error: 'Informations client manquantes' });
  }
  const required = ['firstName', 'lastName', 'email', 'address', 'city', 'zip'];
  for (const field of required) {
    if (!customer[field] || !String(customer[field]).trim()) {
      return res.status(400).json({ error: `Champ requis manquant : ${field}` });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Le panier est vide' });
  }

  const orderItems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === Number(item.productId));
    if (!product) {
      return res.status(400).json({ error: `Produit inconnu : ${item.productId}` });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return res.status(400).json({ error: `Quantité invalide pour ${product.name}` });
    }
    const size = product.sizes.includes(item.size) ? item.size : product.sizes[0];
    if (quantity > product.stock) {
      return res.status(400).json({ error: `Stock insuffisant pour ${product.name}` });
    }
    product.stock -= quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      theme: product.theme,
      size,
      price: product.price,
      quantity
    });
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= 60 ? 0 : 4.99;
  const order = {
    id: 'CMD-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000),
    customer: {
      firstName: String(customer.firstName).trim(),
      lastName: String(customer.lastName).trim(),
      email: String(customer.email).trim(),
      address: String(customer.address).trim(),
      city: String(customer.city).trim(),
      zip: String(customer.zip).trim()
    },
    items: orderItems,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    total: Math.round((subtotal + shipping) * 100) / 100,
    status: 'confirmée',
    createdAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);

  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const order = readOrders().find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route API introuvable' });
});

app.listen(PORT, () => {
  console.log(`Boutique en ligne : http://localhost:${PORT}`);
});
