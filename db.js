const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.json');

const defaultData = {
  products: [
    {
      id: 1,
      name: '1 Day Key',
      description: 'Full access for 24 hours. Perfect for testing.',
      price: 2.99,
      duration_days: 1,
      stock: 0,
      active: 1
    },
    {
      id: 2,
      name: '7 Day Key',
      description: 'One week of premium access. Best value for casual users.',
      price: 7.99,
      duration_days: 7,
      stock: 0,
      active: 1
    },
    {
      id: 3,
      name: '30 Day Key',
      description: 'Full month of access with priority updates.',
      price: 14.99,
      duration_days: 30,
      stock: 0,
      active: 1
    },
    {
      id: 4,
      name: 'Lifetime Key',
      description: 'Never expires. HWID locked. Best for long-term users.',
      price: 29.99,
      duration_days: null,
      stock: 0,
      active: 1
    }
  ],
  keys: [],
  orders: [],
  nextProductId: 5,
  nextKeyId: 1,
  nextOrderId: 1
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    save(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let data = load();

const db = {
  getProducts(activeOnly = false) {
    let list = data.products;
    if (activeOnly) list = list.filter(p => p.active);
    return list.sort((a, b) => a.price - b.price);
  },
  getProduct(id) {
    return data.products.find(p => p.id === Number(id));
  },
  updateProduct(id, updates) {
    const p = data.products.find(x => x.id === Number(id));
    if (p) Object.assign(p, updates);
    save(data);
  },
  toggleProduct(id) {
    const p = data.products.find(x => x.id === Number(id));
    if (p) {
      p.active = p.active ? 0 : 1;
      save(data);
    }
  },
  getAvailableKey(productId) {
    return data.keys.find(k => k.product_id === Number(productId) && k.status === 'available');
  },
  addKeys(productId, keyValues) {
    for (const kv of keyValues) {
      data.keys.push({
        id: data.nextKeyId++,
        product_id: Number(productId),
        key_value: kv,
        status: 'available',
        sold_to_email: null,
        order_id: null,
        created_at: new Date().toISOString(),
        sold_at: null
      });
    }
    this.recalcStock(productId);
    save(data);
  },
  markKeySold(keyId, email, orderId) {
    const k = data.keys.find(x => x.id === keyId);
    if (k) {
      k.status = 'sold';
      k.sold_to_email = email;
      k.order_id = orderId;
      k.sold_at = new Date().toISOString();
      this.recalcStock(k.product_id);
      save(data);
    }
  },
  recalcStock(productId) {
    const count = data.keys.filter(k => k.product_id === Number(productId) && k.status === 'available').length;
    const p = data.products.find(x => x.id === Number(productId));
    if (p) p.stock = count;
  },
  countAvailableKeys() {
    return data.keys.filter(k => k.status === 'available').length;
  },
  createOrder({ product_id, buyer_email, buyer_name, amount }) {
    const order = {
      id: data.nextOrderId++,
      product_id: Number(product_id),
      buyer_email,
      buyer_name: buyer_name || null,
      key_value: null,
      amount,
      status: 'pending',
      payment_method: 'mock',
      created_at: new Date().toISOString(),
      completed_at: null
    };
    data.orders.push(order);
    save(data);
    return order;
  },
  completeOrder(orderId, keyValue) {
    const o = data.orders.find(x => x.id === orderId);
    if (o) {
      o.status = 'completed';
      o.key_value = keyValue;
      o.completed_at = new Date().toISOString();
      save(data);
    }
  },
  getOrders(limit = 50) {
    return data.orders
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(o => {
        const p = data.products.find(x => x.id === o.product_id);
        return { ...o, product_name: p ? p.name : 'Unknown' };
      });
  },
  getStats() {
    const completed = data.orders.filter(o => o.status === 'completed');
    return {
      totalOrders: completed.length,
      totalRevenue: completed.reduce((s, o) => s + o.amount, 0),
      availableKeys: this.countAvailableKeys()
    };
  }
};

module.exports = db;
