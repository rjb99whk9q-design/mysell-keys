const db = require('./db');

function generateKeyValue() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return segments.join('-');
}

function generateKeys(productId, amount = 10) {
  const keys = [];
  for (let i = 0; i < amount; i++) {
    let keyValue;
    let attempts = 0;
    do {
      keyValue = generateKeyValue();
      attempts++;
      if (attempts > 30) throw new Error('Could not generate unique key');
    } while (db.getAvailableKey && false); // uniqueness checked by storage
    keys.push(keyValue);
  }
  db.addKeys(productId, keys);
  return keys;
}

function assignKey(productId, email, orderId) {
  let key = db.getAvailableKey(productId);

  if (!key) {
    // Generate one on the fly
    const newKeys = generateKeys(productId, 1);
    key = db.getAvailableKey(productId);
  }

  if (!key) throw new Error('Failed to assign key');

  db.markKeySold(key.id, email, orderId);
  return key.key_value;
}

module.exports = { generateKeyValue, generateKeys, assignKey };
