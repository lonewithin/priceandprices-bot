# PriceAndPrices Bot 📊

Telegram bot ([@PriceAndPricesBot](https://t.me/PriceAndPricesBot)) for live crypto prices in **USD and Naira (NGN)**. Made by Promise ([@promiseishere](https://x.com/promiseishere)).

## Commands
| Command | What it does |
|---|---|
| `/start`, `/help` | Welcome + help |
| `/price <coin>` / `/p <coin>` | USD + NGN price, 24h change (symbol or name: `sol`, `btc`, `bonk`) |
| `/convert <amount> <coin> [ngn\|usd]` | e.g. `/convert 2 sol ngn` |
| `/top` | Top 10 by market cap |
| `/trending` | CoinGecko trending |
| `/news [coin]` | SOL price + 5-8 latest Solana headlines (Cointelegraph, CoinDesk, Decrypt RSS, 10-min cache); optional coin filter |
| `/sol <address>` | SOL balance (read-only) |
| `$sol` in any message | Inline price |

Free APIs only: CoinGecko, open.er-api.com (USD→NGN), Solana public RPC. Prices cached ~60s; rate limits fall back to cached data.

## Run locally
```bash
npm install
cp .env.example .env   # put your BotFather token in .env
npm start
```
Keep it running: `npm i -g pm2 && pm2 start src/bot.js --name priceandprices-bot`

## Deploy free
Uses long polling, so it needs an always-on **worker** (no web port).
- **Railway**: New Project → Deploy from GitHub → add variable `TELEGRAM_BOT_TOKEN` → start command `npm start`.
- **Render**: New → Background Worker → this repo → build `npm install`, start `npm start`, env `TELEGRAM_BOT_TOKEN`. (Free tier may need a paid worker; Railway/Fly are easier.)
- **Fly.io**: `fly launch --no-deploy`, `fly secrets set TELEGRAM_BOT_TOKEN=...`, `fly deploy`.

Only run **one** instance at a time (Telegram allows one long-polling client per token).

Never commit `.env`.

## Serverless on Vercel (free Hobby)
- `api/telegram.js` is the webhook (grammY `webhookCallback`); it rejects requests whose `X-Telegram-Bot-Api-Secret-Token` header doesn't match `WEBHOOK_SECRET`.
- Env vars: `BOT_TOKEN`, `WEBHOOK_SECRET`; optional Upstash Redis (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) for a shared price cache.
- Switch-over: `BOT_TOKEN=... WEBHOOK_SECRET=... npm run set-webhook -- https://<project>.vercel.app/api/telegram`, then stop the local `npm start`. `--delete` reverts to polling.
