const { tronWeb, publicAddress } = require('./config');
const { sendTRX } = require('./tron');
const seenTxs = new Set(); // 防止重复处理

async function watchUSDTTransfers() {
  const usdtContract = await tronWeb.contract().at(process.env.USDT_CONTRACT);

  // 获取最近 50 条 transfer 事件
  const events = await tronWeb.getEventResult(process.env.USDT_CONTRACT, {
    eventName: 'Transfer',
    size: 50,
    onlyConfirmed: true,
  });

  for (const e of events) {
    const txID = e.transaction_id;
    if (seenTxs.has(txID)) continue;

    const to = tronWeb.address.fromHex(e.result.to);
    const from = tronWeb.address.fromHex(e.result.from);
    const value = parseInt(e.result.value) / 1e6;

    if (to === publicAddress && value >= 1) {
      console.log(`✅ 收到 ${value} USDT 来自 ${from}`);
      seenTxs.add(txID);

      // ⚠️ 设置自动兑换比例：1 USDT = 17.5 TRX（举例）
      const amountTRX = value * 17.5;
      await sendTRX(from, amountTRX);
      console.log(`🚀 已发送 ${amountTRX} TRX 给 ${from}`);
    }
  }
}

module.exports = { watchUSDTTransfers };
