require('dotenv').config();
const TronWeb = require('tronweb');
const TelegramBot = require('node-telegram-bot-api');
const getRate = require('./rate');
const db = require('./db');
const axios = require('axios');

const {
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
  WALLET_PRIVATE_KEY, WALLET_ADDRESS,
  USDT_CONTRACT_ADDRESS, TRX_PROFIT_PERCENT,
  COOLDOWN_MINUTES
} = process.env;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io', privateKey: WALLET_PRIVATE_KEY });

const cooldownMs = (+COOLDOWN_MINUTES || 5) * 60 * 1000;

const processedTx = new Set();

async function checkUSDT() {
  try {
    const res = await axios.get(`https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions/trc20?only_confirmed=true`);
    const txs = res.data.data || [];
    for (const tx of txs) {
      if (tx.token_info.address !== USDT_CONTRACT_ADDRESS) continue;
      const txid = tx.transaction_id;
      if (processedTx.has(txid)) continue;

      // 已处理交易检查
      const done = await new Promise(res => db.hasTx(txid, (_, d) => res(d)));
      if (done) {
        processedTx.add(txid);
        continue;
      }

      const from = tx.from;
      const usdt = +tx.value / 1e6;

      // 黑名单检查
      const blacklisted = await new Promise(res => db.isBlacklisted(from, (_, b) => res(b)));
      if (blacklisted) {
        bot.sendMessage(TELEGRAM_CHAT_ID, `⛔ 黑名单拒绝：${from} 尝试兑换 ${usdt} USDT`);
        processedTx.add(txid);
        continue;
      }

      // 冷却检查
      const lastTime = await new Promise(res => db.getLastSwapTime(from, (_, t) => res(t)));
      if (Date.now() - lastTime < cooldownMs) {
        bot.sendMessage(TELEGRAM_CHAT_ID, `⏱️ 冷却中：${from} 再次兑换被忽略`);
        processedTx.add(txid);
        continue;
      }

      // 计算TRX数量
      const { market, rate } = await getRate(+TRX_PROFIT_PERCENT);
      const trx = +(usdt * rate).toFixed(6);

      // 构建转账交易
      const txn = await tronWeb.transactionBuilder.sendTrx(from, tronWeb.toSun(trx), WALLET_ADDRESS);
      const signed = await tronWeb.trx.sign(txn, WALLET_PRIVATE_KEY);
      await tronWeb.trx.sendRawTransaction(signed);

      // 存入数据库
      db.insertTx({ txid, from, usdt, trx, rate, profit: +TRX_PROFIT_PERCENT });
      processedTx.add(txid);

      // Telegram通知
      bot.sendMessage(
        TELEGRAM_CHAT_ID,
        `↩️ Swap:\nFrom: ${from}\nUSDT: ${usdt}\nTRX: ${trx}\nRate: ${rate.toFixed(6)}`
      );
    }
  } catch (e) {
    console.error('checkUSDT error:', e);
  }
}

// Telegram命令：查询汇率
bot.onText(/\/rate/, async (msg) => {
  const { rate } = await getRate(+TRX_PROFIT_PERCENT);
  bot.sendMessage(msg.chat.id, `当前兑换率：1 USDT = ${rate.toFixed(6)} TRX`);
});

// Telegram命令：查询历史记录
bot.onText(/\/history(?: (\S+))?/, (msg, match) => {
  const addr = match[1];
  const cb = (err, rows) => {
    if (err) return bot.sendMessage(msg.chat.id, '查询失败');
    if (!rows.length) return bot.sendMessage(msg.chat.id, '无记录');
    const out = rows.map(r => `${new Date(r.time).toLocaleString()}\nUSDT:${r.usdt_amount} → TRX:${r.trx_sent}\nRate:${r.rate_used.toFixed(6)}\n`).join('\n');
    bot.sendMessage(msg.chat.id, out);
  };
  if (addr) db.getByAddress(addr, cb);
  else db.getRecent(10, cb);
});

// Telegram命令：添加黑名单
bot.onText(/\/blacklist_add (T\w+)/, (msg, match) => {
  db.addBlacklist(match[1]);
  bot.sendMessage(msg.chat.id, `✅ 已加入黑名单：${match[1]}`);
});

// Telegram命令：移除黑名单
bot.onText(/\/blacklist_remove (T\w+)/, (msg, match) => {
  db.removeBlacklist(match[1]);
  bot.sendMessage(msg.chat.id, `✅ 已移除黑名单：${match[1]}`);
});

// Telegram命令：查看黑名单
bot.onText(/\/blacklist_list/, (msg) => {
  db.listBlacklist((err, rows) => {
    if (err || !rows.length) return bot.sendMessage(msg.chat.id, '⚪ 当前没有黑名单地址');
    const list = rows.map(r => `- ${r.address}`).join('\n');
    bot.sendMessage(msg.chat.id, `⛔ 黑名单地址列表：\n${list}`);
  });
});

// 每15秒检查一次钱包USDT转入
setInterval(checkUSDT, 15000);
