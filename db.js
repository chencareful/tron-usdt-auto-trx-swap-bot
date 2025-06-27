const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');

function hasTx(txid, cb) {
  db.get('SELECT txid FROM swaps WHERE txid = ?', [txid], (err, row) => {
    cb(err, !!row);
  });
}

function insertTx(data) {
  const stmt = db.prepare(`INSERT INTO swaps(txid, from_address, usdt_amount, trx_sent, rate_used, profit_percent, time)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(data.txid, data.from, data.usdt, data.trx, data.rate, data.profit, Date.now());
}

function getLastSwapTime(address, cb) {
  db.get(
    'SELECT time FROM swaps WHERE from_address = ? ORDER BY time DESC LIMIT 1',
    [address],
    (err, row) => cb(err, row ? row.time : 0)
  );
}

function getRecent(limit = 10, cb) {
  db.all('SELECT * FROM swaps ORDER BY time DESC LIMIT ?', [limit], cb);
}

function getByAddress(addr, cb) {
  db.all('SELECT * FROM swaps WHERE from_address = ? ORDER BY time DESC', [addr], cb);
}

// 黑名单操作
function isBlacklisted(address, cb) {
  db.get('SELECT address FROM blacklist WHERE address = ?', [address], (err, row) => {
    cb(null, !!row);
  });
}

function addBlacklist(address) {
  db.run('INSERT OR IGNORE INTO blacklist(address) VALUES (?)', [address]);
}

function removeBlacklist(address) {
  db.run('DELETE FROM blacklist WHERE address = ?', [address]);
}

function listBlacklist(cb) {
  db.all('SELECT address FROM blacklist', cb);
}

module.exports = {
  hasTx,
  insertTx,
  getLastSwapTime,
  getRecent,
  getByAddress,
  isBlacklisted,
  addBlacklist,
  removeBlacklist,
  listBlacklist
};
