const { Bot, GrammyError, HttpError } = require('grammy');
const api = require('./api');
const fmt = (n, c = 'usd') => (c === 'ngn' ? '₦' : '$') + Number(n).toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 8 : 2 });
const pct = n => n == null ? '' : `${n >= 0 ? '🟢 +' : '🔴 '}${n.toFixed(2)}%`;
const errMsg = e => e.message === 'RATE_LIMIT' ? '⏳ Price API is busy, try again in a minute.' : '⚠️ Something went wrong, try again.';

async function priceText(q) {
  const id = await api.resolveCoin(q);
  if (!id) return `❓ Couldn't find "${q}".`;
  const [p, ngn] = await Promise.all([api.price(id), api.usdNgn()]);
  if (!p) return `❓ No price for "${q}".`;
  return `💰 *${id}*\nUSD: ${fmt(p.usd)}\nNGN: ${fmt(p.usd * ngn, 'ngn')}\n24h: ${pct(p.usd_24h_change)}`;
}
const HELP = `*PriceAndPrices Bot* 📊
/price <coin> — USD + NGN price (e.g. /price sol)
/p <coin> — shortcut
/convert <amount> <coin> [ngn|usd]
/top — top 10 by market cap
/trending — trending on CoinGecko
/sol <address> — SOL balance (read-only)
/news [coin] — latest SOL (or coin) news
Or just type \`$sol\`, \`$btc\`…`;
function createBot(token) {
const bot = new Bot(token);
bot.command('start', c => c.reply(`👋 Welcome to *PriceAndPrices Bot*!\nLive crypto prices in USD & Naira.\n\nMade by Promise (@promiseishere)\n\n${HELP}`, { parse_mode: 'Markdown' }));
bot.command('help', c => c.reply(HELP, { parse_mode: 'Markdown' }));
const priceCmd = async c => {
  const q = c.match.trim();
  if (!q) return c.reply('Usage: /price <coin>, e.g. /price sol');
  try { await c.reply(await priceText(q), { parse_mode: 'Markdown' }); } catch (e) { c.reply(errMsg(e)); }
};
bot.command('price', priceCmd); bot.command('p', priceCmd);
bot.command('convert', async c => {
  const [a, coin, to = 'ngn'] = c.match.trim().split(/\s+/);
  const amt = parseFloat(a);
  if (!amt || !coin) return c.reply('Usage: /convert <amount> <coin> [ngn|usd]');
  try {
    const id = await api.resolveCoin(coin); if (!id) return c.reply(`❓ Couldn't find "${coin}".`);
    const [p, ngn] = await Promise.all([api.price(id), api.usdNgn()]);
    const usd = amt * p.usd; const cur = to.toLowerCase() === 'usd' ? 'usd' : 'ngn';
    c.reply(`🔁 ${amt} ${coin.toUpperCase()} = ${cur === 'usd' ? fmt(usd) : fmt(usd * ngn, 'ngn')}`);
  } catch (e) { c.reply(errMsg(e)); }
});
bot.command('top', async c => {
  try { const t = await api.top();
    c.reply('🏆 *Top 10 by market cap*\n' + t.map((x, i) => `${i + 1}. ${x.symbol.toUpperCase()} ${fmt(x.current_price)} ${pct(x.price_change_percentage_24h)}`).join('\n'), { parse_mode: 'Markdown' });
  } catch (e) { c.reply(errMsg(e)); }
});
bot.command('trending', async c => {
  try { const t = await api.trending();
    c.reply('🔥 *Trending on CoinGecko*\n' + t.coins.slice(0, 10).map((x, i) => `${i + 1}. ${x.item.name} (${x.item.symbol}) #${x.item.market_cap_rank ?? '-'}`).join('\n'), { parse_mode: 'Markdown' });
  } catch (e) { c.reply(errMsg(e)); }
});
bot.command('sol', async c => {
  const addr = c.match.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return c.reply('Usage: /sol <solana address>');
  try { const [b, p] = await Promise.all([api.solBalance(addr), api.price('solana')]);
    c.reply(`◎ Balance: ${b} SOL (~${fmt(b * p.usd)})`);
  } catch (e) { c.reply('⚠️ Could not fetch balance (invalid address or RPC busy).'); }
});
const { news, ago } = require('./news');
const esc = t => t.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
bot.command('news', async c => {
  const q = c.match.trim().toLowerCase() || 'sol';
  try {
    const id = (await api.resolveCoin(q)) || 'solana';
    const words = q === 'sol' || id === 'solana' ? ['solana', 'sol'] : [id.replace(/-/g, ' '), q];
    const [p, ngn, items] = await Promise.all([api.price(id), api.usdNgn(), news(words)]);
    let out = p ? `💰 <b>${esc(id)}</b> ${fmt(p.usd)} | ${fmt(p.usd * ngn, 'ngn')} | 24h ${pct(p.usd_24h_change)}\n\n` : '';
    out += `📰 <b>Latest ${esc(q.toUpperCase())} news</b>\n` + (items.length ? items.map((i, n) => `${n + 1}. <a href="${esc(i.link)}">${esc(i.title)}</a>\n   <i>${i.src} · ${ago(i.date)}</i>`).join('\n') : 'No recent headlines found.');
    c.reply(out, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  } catch (e) { c.reply(errMsg(e)); }
});
bot.on('message:text', async c => {
  const m = c.message.text.match(/\$([a-zA-Z][a-zA-Z0-9]{1,14})\b/);
  if (!m) return;
  try { await c.reply(await priceText(m[1]), { parse_mode: 'Markdown' }); } catch (e) { c.reply(errMsg(e)); }
});
bot.catch(err => {
  const e = err.error;
  if (e instanceof GrammyError) console.error('Telegram error:', e.description);
  else if (e instanceof HttpError) console.error('Network error:', e.message);
  else console.error('Error:', e);
});
return bot;
}
const COMMANDS = [
  { command: 'price', description: 'Coin price in USD + NGN' }, { command: 'p', description: 'Price shortcut' },
  { command: 'convert', description: 'Convert amount of coin to NGN/USD' }, { command: 'top', description: 'Top 10 by market cap' },
  { command: 'trending', description: 'Trending coins' }, { command: 'news', description: 'Latest SOL news (or /news <coin>)' }, { command: 'sol', description: 'SOL balance of an address' },
  { command: 'help', description: 'How to use' }];
async function setupProfile(api) {
  await api.setMyCommands(COMMANDS);
  await api.setMyShortDescription('Live crypto prices in USD & Naira. Made by Promise (@promiseishere)').catch(() => {});
  await api.setMyDescription('Type $sol or /price btc for live prices in USD & NGN. Top 10, trending, converter and Solana balance checks.').catch(() => {});
}
const ALLOWED_UPDATES = ['message'];
module.exports = { createBot, setupProfile, COMMANDS, ALLOWED_UPDATES };
