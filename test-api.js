const BASE = process.env.BASE_URL || 'http://localhost:3000';

function req(path, options = {}) {
  return fetch(BASE + path, options).then(async (res) => ({
    status: res.status,
    body: await res.json()
  }));
}

let failures = 0;
function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label);
  if (!cond) failures++;
}

(async () => {
  const home = await fetch(BASE + '/').then((r) => r.text());
  check('Page d\'accueil servie', home.includes('Stylo'));

  const cats = await req('/api/categories');
  check('3 catégories (homme/femme/enfant)', cats.status === 200 && cats.body.length === 3);

  const femme = await req('/api/products?category=femme&sort=price-asc');
  check('Catalogue femme trié par prix', femme.status === 200 && femme.body.length === 8 &&
    femme.body[0].price <= femme.body[7].price);

  const search = await req('/api/products?search=jean');
  check('Recherche "jean" retourne des résultats', search.status === 200 && search.body.length >= 2);

  const badCat = await req('/api/products?category=xyz');
  check('Catégorie inconnue rejetée (400)', badCat.status === 400);

  const detail = await req('/api/products/9');
  check('Fiche produit + suggestions', detail.status === 200 && detail.body.related.length === 4);

  const missing = await req('/api/products/999');
  check('Produit inexistant → 404', missing.status === 404);

  const emptyOrder = await req('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer: { firstName: 'A' }, items: [] })
  });
  check('Commande vide rejetée (400)', emptyOrder.status === 400);

  const badEmail = await req('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Léa', lastName: 'Martin', email: 'pas-un-email', address: '1 rue Test', city: 'Paris', zip: '75001' },
      items: [{ productId: 9, size: 'M', quantity: 1 }]
    })
  });
  check('E-mail invalide rejeté (400)', badEmail.status === 400);

  const order = await req('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Léa', lastName: 'Martin', email: 'lea@example.com', address: '1 rue de la Mode', city: 'Paris', zip: '75001' },
      items: [
        { productId: 9, size: 'M', quantity: 1 },
        { productId: 3, size: 'L', quantity: 2 }
      ]
    })
  });
  const expectedTotal = 79.9 + 19.9 * 2;
  check('Commande créée (201)', order.status === 201);
  check('Total exact (' + expectedTotal + ' €, livraison offerte ≥ 60 €)', order.body.total === expectedTotal);
  check('Numéro de commande généré', typeof order.body.id === 'string' && order.body.id.startsWith('CMD-'));

  const fetched = await req('/api/orders/' + order.body.id);
  check('Commande relisible par son numéro', fetched.status === 200 && fetched.body.total === expectedTotal);

  const detailAfter = await req('/api/products/9');
  check('Stock décrémenté après commande (25 → 24)', detailAfter.body.stock === 24);

  const unknownRoute = await req('/api/inconnu');
  check('Route API inconnue → 404 JSON', unknownRoute.status === 404);

  console.log(failures ? `\n${failures} test(s) en échec` : '\nTous les tests passent ✔');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('Erreur de test :', e.message);
  process.exit(1);
});
