# Tron USDT 自动兑换 TRX 机器人（带黑名单 + 防刷）

## 功能
- 黑名单拒绝兑换请求
- 每人最小冷却（COOLDOWN_MINUTES）
- 实时汇率 + 可设置利润
- 记录历史，支持 `/rate` `/history`

## 安装部署（Ubuntu VPS 示例）

```bash
# 安装依赖
apt update && apt install curl git sqlite3 -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

# 获取项目
git clone https://github.com/你的用户名/tron-usdt-auto-trx-swap-bot.git
cd tron-usdt-auto-trx-swap-bot
npm install

# 配置环境
cp .env.example .env
nano .env

# 初始化数据库
npm run db:init

# 启动程序
pm2 start index.js --name tron-swap
