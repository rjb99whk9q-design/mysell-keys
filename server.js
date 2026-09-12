require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const { assignKey, generateKeys } = require('./keys');
const { sendKeyEmail } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname); // all .ejs files are in root
app.use(express.static(__dirname)); // style.css is in root
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.isAdmin = !!req.session.isAdmin;
  next();
});

// ========== PUBLIC ==========

app.get('/', (req, res) => {
  const products = db.getProducts(true);
  res.render('index', { products, title: 'Script Store' });
});

app.get('/product/:id', (req, res) => {
  const product = db.getProduct(req.params.id);
  if (!product || !product.active) return res.status(404).send('Product not found');
  res.render('product', { product, title: product.name });
});

app.post('/checkout', async (req, res) => {
  const { product_id, email, name } = req.body;

  if (!email || !product_id) {
    return res.status(400).send('Missing email or product');
  }

  const product = db.getProduct(product_id);
  if (!product || !product.active) return res.status(404).send('Product not found');

  const order = db.createOrder({
    product_id,
    buyer_email: email.trim().toLowerCase(),
    buyer_name: name || null,
    amount: product.price
  });

  let keyValue;
  try {
    keyValue = assignKey(product_id, email.trim().toLowerCase(), order.id);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to assign key. Contact support.');
  }

  db.completeOrder(order.id, keyValue);

  const emailResult = await sendKeyEmail({
    to: email.trim(),
    productName: product.name,
    keyValue,
    duration: product.duration_days
  });

  res.render('success', {
    title: 'Purchase Complete',
    product,
    keyValue,
    email: email.trim(),
    emailSent: emailResult.success,
    demoMode: emailResult.demo || false
  });
});

// ========== ADMIN ==========

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin-login', { title: 'Admin Login', error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === (process.env.ADMIN_USER || 'admin') &&
    password === (process.env.ADMIN_PASS || 'supersecret123')
  ) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin-login', { title: 'Admin Login', error: 'Invalid credentials' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/admin', requireAdmin, (req, res) => {
  const products = db.getProducts(false);
  const orders = db.getOrders(50);
  const stats = db.getStats();
  res.render('admin', { title: 'Admin Dashboard', products, orders, stats });
});

app.post('/admin/generate-keys', requireAdmin, (req, res) => {
  const { product_id, amount } = req.body;
  const count = parseInt(amount) || 10;
  try {
    generateKeys(parseInt(product_id), count);
    res.redirect('/admin?msg=keys_generated');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/admin/toggle-product', requireAdmin, (req, res) => {
  db.toggleProduct(req.body.id);
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`🚀 MySell Auth store running on port ${PORT}`);
});
