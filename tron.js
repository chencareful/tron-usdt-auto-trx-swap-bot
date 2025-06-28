const { tronWeb } = require('./config');

async function sendTRX(toAddress, amount) {
  const tx = await tronWeb.transactionBuilder.sendTrx(toAddress, amount * 1e6);
  const signedTx = await tronWeb.trx.sign(tx);
  const receipt = await tronWeb.trx.sendRawTransaction(signedTx);
  return receipt;
}

module.exports = {
  getBalance: require('./tron').getBalance,
  sendTRX
};
