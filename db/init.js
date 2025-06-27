const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS swaps (
    txid TEXT PRIMARY KEY,
    from_address TEXT,
    usdt_amount REAL,
    trx_sent REAL,
    rate_used REAL,
    profit_percent REAL,
    time INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS blacklist (
    address TEXT PRIMARY KEY
  )`);

  console.log('✅ Database initialized.');
  db.close();
});
