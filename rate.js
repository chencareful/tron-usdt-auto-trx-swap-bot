const axios = require('axios');

async function getRate(profitPercent) {
  const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tron,usd-coin&vs_currencies=usd');
  const trxUsd = res.data.tron.usd;
  const usdtUsd = res.data['usd-coin'].usd;
  const market = trxUsd / usdtUsd;
  const rate = market * (1 - profitPercent / 100);
  return { market, rate };
}

module.exports = getRate;
