/* Stylo.boutique — SPA e-commerce (vanilla JS) */

const API = '/api';
const CART_KEY = 'stylo_cart';
const app = document.getElementById('app');

let cart = loadCart();

/* ---------- Utilitaires ---------- */

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function eur(value) {
  return value.toFixed(2).replace('.', ',') + ' €';
}

async function api(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur serveur');
  return res.json();
}

function thumbStyle(p) {
  return `background:linear-gradient(135deg, ${p.theme}, ${p.theme}cc)`;
}

function productCard(p) {
  const sale = p.oldPrice ? '<span class="badge-sale">Promo</span>' : '';
  return `
    <a class="product-card" href="#/produit/${p.id}">
      <div class="thumb" style="${thumbStyle(p)}">${p.emoji}</div>
      <div class="product-body">
        <span class="sub">${p.subcategory}</span>
        <h3>${p.name}</h3>
        <span class="rating">★ ${p.rating.toFixed(1)}</span>
        <div class="price-row">
          <span class="price">${eur(p.price)}</span>
          ${p.oldPrice ? `<span class="old-price">${eur(p.oldPrice)}</span>` : ''}
          ${sale}
        </div>
      </div>
    </a>`;
}

function setNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + route);
  });
}

/* ---------- Pages ---------- */

async function renderHome() {
  setNav('');
  const [cats, promos] = await Promise.all([
    api('/categories'),
    api('/products?sort=rating')
  ]);
  const promoList = promos.filter((p) => p.oldPrice).slice(0, 4);
  app.innerHTML = `
    <section class="hero">
      <h1>La mode pour toute la famille 👨‍👩‍👧‍👦</h1>
      <p>Des vêtements de qualité pour hommes, femmes et enfants. Livraison offerte dès 60 €, retours gratuits sous 30 jours.</p>
      <a class="btn btn-primary" href="#/homme">Découvrir la boutique</a>
    </section>
    <section class="cat-grid">
      ${cats
        .map(
          (c) => `
        <a class="cat-card" href="#/${c.id}">
          <div class="cat-emoji">${c.emoji}</div>
          <h3>${c.label}</h3>
          <p>${c.description}</p>
          <span class="count">${c.productCount} articles →</span>
        </a>`
        )
        .join('')}
    </section>
    <section>
      <div class="page-head">
        <h1>Les mieux notés & promos</h1>
        <a class="back-link" href="#/femme">Tout voir →</a>
      </div>
      <div class="product-grid">${promoList.map(productCard).join('')}</div>
    </section>`;
}

async function renderCatalog(category, params) {
  setNav(category || '');
  const query = new URLSearchParams();
  if (params.get('q')) query.set('search', params.get('q'));
  if (params.get('sub')) query.set('subcategory', params.get('sub'));
  if (params.get('sort')) query.set('sort', params.get('sort'));
  if (category) query.set('category', category);

  const [cats, items] = await Promise.all([
    api('/categories'),
    api('/products?' + query.toString())
  ]);

  const cat = cats.find((c) => c.id === category);
  const subs = [...new Set(items.map((p) => p.subcategory))];
  const title = params.get('q')
    ? `Résultats pour « ${params.get('q')} »`
    : cat
      ? cat.label
      : 'Tous nos articles';

  const sortSel = `
    <select id="sort-select" aria-label="Trier">
      <option value="">Trier par…</option>
      <option value="price-asc" ${params.get('sort') === 'price-asc' ? 'selected' : ''}>Prix croissant</option>
      <option value="price-desc" ${params.get('sort') === 'price-desc' ? 'selected' : ''}>Prix décroissant</option>
      <option value="rating" ${params.get('sort') === 'rating' ? 'selected' : ''}>Mieux notés</option>
    </select>`;

  const chips = subs.length
    ? `<div class="chips">
        <button class="chip ${!params.get('sub') ? 'active' : ''}" data-sub="">Tout</button>
        ${subs
          .map(
            (s) =>
              `<button class="chip ${params.get('sub') === s ? 'active' : ''}" data-sub="${s}">${s}</button>`
          )
          .join('')}
      </div>`
    : '';

  app.innerHTML = `
    <div class="page-head">
      <h1>${title}</h1>
      <span class="muted">${items.length} article${items.length > 1 ? 's' : ''}</span>
    </div>
    <div class="toolbar">${chips}${sortSel}</div>
    ${
      items.length
        ? `<div class="product-grid">${items.map(productCard).join('')}</div>`
        : `<div class="empty">😕 Aucun article ne correspond à votre recherche.<br><br><a class="btn btn-dark" href="#/">Retour à l'accueil</a></div>`
    }`;

  const base = category ? `#/${category}` : '#/recherche';
  const q = params.get('q') ? `?q=${encodeURIComponent(params.get('q'))}` : '';

  document.getElementById('sort-select').addEventListener('change', (e) => {
    const p = new URLSearchParams();
    if (q) p.set('q', params.get('q'));
    if (params.get('sub')) p.set('sub', params.get('sub'));
    if (e.target.value) p.set('sort', e.target.value);
    location.hash = base + (p.toString() ? '?' + p.toString() : '');
  });

  app.querySelectorAll('.chip[data-sub]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const p = new URLSearchParams();
      if (q) p.set('q', params.get('q'));
      if (chip.dataset.sub) p.set('sub', chip.dataset.sub);
      if (params.get('sort')) p.set('sort', params.get('sort'));
      location.hash = base + (p.toString() ? '?' + p.toString() : '');
    });
  });
}

async function renderProduct(id) {
  setNav('');
  let p;
  try {
    p = await api('/products/' + id);
  } catch {
    app.innerHTML = `<div class="empty">Produit introuvable. <a href="#/">Retour à la boutique</a></div>`;
    return;
  }

  app.innerHTML = `
    <a class="back-link" href="#/${p.category}">← Retour au catalogue</a>
    <div class="detail">
      <div class="thumb" style="${thumbStyle(p)}">${p.emoji}</div>
      <div>
        <span class="sub" style="color:var(--muted);text-transform:uppercase;font-size:0.8rem;letter-spacing:0.5px">${p.subcategory}</span>
        <h1>${p.name}</h1>
        <span class="rating">★ ${p.rating.toFixed(1)}</span>
        <div class="price-row" style="margin:10px 0 0">
          <span class="price" style="font-size:1.5rem">${eur(p.price)}</span>
          ${p.oldPrice ? `<span class="old-price">${eur(p.oldPrice)}</span><span class="badge-sale">Promo</span>` : ''}
        </div>
        <p class="desc">${p.description}</p>
        <div class="option-group">
          <span class="label">Taille</span>
          <div class="sizes" id="sizes">
            ${p.sizes.map((s, i) => `<button class="size-btn ${i === 0 ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
          </div>
        </div>
        <div class="option-group">
          <span class="label">Coloris</span>
          ${p.colors.map((c) => `<span class="color-dot">● ${c}</span>`).join('')}
        </div>
        <p class="stock-note ${p.stock <= 20 ? 'low' : ''}">${
          p.stock <= 20 ? `⚠ Plus que ${p.stock} en stock !` : `✔ En stock (${p.stock} disponibles)`
        }</p>
        <button class="btn btn-primary" id="add-btn" style="margin-top:16px">Ajouter au panier — ${eur(p.price)}</button>
      </div>
    </div>
    ${
      p.related.length
        ? `<section class="related"><h2>Vous aimerez aussi</h2><div class="product-grid">${p.related.map(productCard).join('')}</div></section>`
        : ''
    }`;

  let selectedSize = p.sizes[0];
  document.getElementById('sizes').addEventListener('click', (e) => {
    const btn = e.target.closest('.size-btn');
    if (!btn) return;
    selectedSize = btn.dataset.size;
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b === btn));
  });

  document.getElementById('add-btn').addEventListener('click', () => {
    const existing = cart.find((i) => i.productId === p.id && i.size === selectedSize);
    if (existing) existing.quantity = Math.min(existing.quantity + 1, 10);
    else cart.push({ productId: p.id, size: selectedSize, quantity: 1 });
    saveCart();
    toast(`✓ ${p.name} (${selectedSize}) ajouté au panier`);
  });
}

function cartDetails() {
  return Promise.all(
    cart.map(async (item) => {
      try {
        const p = await api('/products/' + item.productId);
        return { ...item, product: p };
      } catch {
        return null;
      }
    })
  ).then((list) => list.filter(Boolean));
}

async function renderCart() {
  setNav('');
  if (!cart.length) {
    app.innerHTML = `
      <div class="page-head"><h1>Votre panier</h1></div>
      <div class="empty">🛒 Votre panier est vide.<br><br>
        <a class="btn btn-primary" href="#/">Découvrir nos collections</a></div>`;
    return;
  }

  const items = await cartDetails();
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal >= 60 ? 0 : 4.99;

  app.innerHTML = `
    <div class="page-head"><h1>Votre panier</h1><span class="muted">${items.length} article${items.length > 1 ? 's' : ''}</span></div>
    <div class="cart-layout">
      <div>
        ${items
          .map(
            (i) => `
          <div class="cart-item">
            <a href="#/produit/${i.product.id}"><div class="mini-thumb" style="${thumbStyle(i.product)}">${i.product.emoji}</div></a>
            <div>
              <h3><a href="#/produit/${i.product.id}" style="color:inherit;text-decoration:none">${i.product.name}</a></h3>
              <div class="meta">Taille ${i.size} · ${eur(i.product.price)} / pièce</div>
              <button class="remove-btn" data-remove="${i.productId}|${i.size}">Retirer</button>
            </div>
            <div class="qty-controls">
              <button data-dec="${i.productId}|${i.size}" aria-label="Diminuer">−</button>
              <span>${i.quantity}</span>
              <button data-inc="${i.productId}|${i.size}" aria-label="Augmenter">+</button>
            </div>
            <strong>${eur(i.product.price * i.quantity)}</strong>
          </div>`
          )
          .join('')}
      </div>
      <aside class="summary">
        <h2>Récapitulatif</h2>
        <div class="summary-row"><span>Sous-total</span><span>${eur(subtotal)}</span></div>
        <div class="summary-row"><span>Livraison</span><span>${shipping === 0 ? 'Offerte 🎉' : eur(shipping)}</span></div>
        ${
          shipping > 0
            ? `<p class="free-ship-note">Plus que ${eur(60 - subtotal)} pour la livraison offerte !</p>`
            : ''
        }
        <div class="summary-row total"><span>Total</span><span>${eur(subtotal + shipping)}</span></div>
        <a href="#/commande" class="btn btn-primary btn-block" style="margin-top:14px">Passer commande</a>
      </aside>
    </div>`;

  app.querySelectorAll('[data-inc]').forEach((b) =>
    b.addEventListener('click', () => {
      const [id, size] = b.dataset.inc.split('|');
      const item = cart.find((i) => i.productId === Number(id) && i.size === size);
      if (item) item.quantity = Math.min(item.quantity + 1, 10);
      saveCart();
      renderCart();
    })
  );
  app.querySelectorAll('[data-dec]').forEach((b) =>
    b.addEventListener('click', () => {
      const [id, size] = b.dataset.dec.split('|');
      const idx = cart.findIndex((i) => i.productId === Number(id) && i.size === size);
      if (idx === -1) return;
      cart[idx].quantity -= 1;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      saveCart();
      renderCart();
    })
  );
  app.querySelectorAll('[data-remove]').forEach((b) =>
    b.addEventListener('click', () => {
      const [id, size] = b.dataset.remove.split('|');
      cart = cart.filter((i) => !(i.productId === Number(id) && i.size === size));
      saveCart();
      renderCart();
    })
  );
}

async function renderCheckout() {
  setNav('');
  if (!cart.length) {
    location.hash = '#/panier';
    return;
  }
  const items = await cartDetails();
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal >= 60 ? 0 : 4.99;

  app.innerHTML = `
    <div class="page-head"><h1>Finaliser la commande</h1></div>
    <div class="checkout-layout">
      <form class="form-card" id="checkout-form" novalidate>
        <h2>📍 Adresse de livraison</h2>
        <div class="form-grid">
          <div class="field"><label for="firstName">Prénom *</label><input id="firstName" name="firstName" required /></div>
          <div class="field"><label for="lastName">Nom *</label><input id="lastName" name="lastName" required /></div>
          <div class="field full"><label for="email">E-mail *</label><input id="email" name="email" type="email" required /></div>
          <div class="field full"><label for="address">Adresse *</label><input id="address" name="address" required /></div>
          <div class="field"><label for="zip">Code postal *</label><input id="zip" name="zip" required /></div>
          <div class="field"><label for="city">Ville *</label><input id="city" name="city" required /></div>
        </div>
        <p class="form-error" id="form-error"></p>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Confirmer et payer ${eur(subtotal + shipping)}</button>
        <p class="muted" style="font-size:0.8rem;margin-top:10px;text-align:center">Paiement simulé — application de démonstration.</p>
      </form>
      <aside class="summary">
        <h2>Votre panier</h2>
        ${items
          .map(
            (i) => `
          <div class="summary-row"><span>${i.product.emoji} ${i.product.name} <small>(×${i.quantity})</small></span><span>${eur(i.product.price * i.quantity)}</span></div>`
          )
          .join('')}
        <div class="summary-row"><span>Livraison</span><span>${shipping === 0 ? 'Offerte' : eur(shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${eur(subtotal + shipping)}</span></div>
        <a href="#/panier" class="back-link" style="margin-top:12px">← Modifier le panier</a>
      </aside>
    </div>`;

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.textContent = '';
    const form = new FormData(e.target);
    const customer = Object.fromEntries(form.entries());
    try {
      const res = await fetch(API + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: cart })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la commande');
      cart = [];
      saveCart();
      location.hash = '#/confirmation/' + data.id;
    } catch (err) {
      errEl.textContent = '⚠ ' + err.message;
    }
  });
}

async function renderConfirmation(id) {
  setNav('');
  let order;
  try {
    order = await api('/orders/' + id);
  } catch {
    app.innerHTML = `<div class="empty">Commande introuvable. <a href="#/">Retour à la boutique</a></div>`;
    return;
  }

  app.innerHTML = `
    <div class="confirm-card">
      <div class="big">🎉</div>
      <h1>Merci ${order.customer.firstName} !</h1>
      <p>Votre commande <span class="order-id">${order.id}</span> est confirmée.</p>
      <p class="muted">Un e-mail de confirmation a été envoyé à ${order.customer.email}.</p>
      <div class="confirm-items">
        ${order.items
          .map(
            (i) => `
          <div class="confirm-item"><span>${i.emoji} ${i.name} — taille ${i.size} × ${i.quantity}</span><span>${eur(i.price * i.quantity)}</span></div>`
          )
          .join('')}
        <div class="confirm-item"><span>Livraison</span><span>${order.shipping === 0 ? 'Offerte' : eur(order.shipping)}</span></div>
        <div class="confirm-item"><strong>Total payé</strong><strong>${eur(order.total)}</strong></div>
      </div>
      <p class="muted">Livraison à : ${order.customer.address}, ${order.customer.zip} ${order.customer.city}</p>
      <div class="confirm-actions">
        <a class="btn btn-primary" href="#/">Continuer mes achats</a>
      </div>
    </div>`;
}

/* ---------- Routeur ---------- */

async function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  const parts = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);

  try {
    if (parts.length === 0) return await renderHome();
    if (['homme', 'femme', 'enfant', 'recherche'].includes(parts[0])) {
      return await renderCatalog(parts[0] === 'recherche' ? null : parts[0], params);
    }
    if (parts[0] === 'produit' && parts[1]) return await renderProduct(parts[1]);
    if (parts[0] === 'panier') return await renderCart();
    if (parts[0] === 'commande') return await renderCheckout();
    if (parts[0] === 'confirmation' && parts[1]) return await renderConfirmation(parts[1]);
    app.innerHTML = `<div class="empty">Page introuvable. <a href="#/">Retour à l'accueil</a></div>`;
  } catch (err) {
    app.innerHTML = `<div class="empty">⚠ ${err.message}</div>`;
  }
}

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  if (q) location.hash = '#/recherche?q=' + encodeURIComponent(q);
});

window.addEventListener('hashchange', route);
updateCartCount();
route();
