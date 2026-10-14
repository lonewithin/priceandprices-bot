try { require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}); } catch {}
// Local development: long polling.
const { createBot, setupProfile, ALLOWED_UPDATES } = require('./bot');
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!token) { console.error('Missing TELEGRAM_BOT_TOKEN'); process.exit(1); }
const bot = createBot(token);
(async () => {
  await setupProfile(bot.api);
  const me = await bot.api.getMe();
  console.log(`[${new Date().toISOString()}] Started as @${me.username}`);
  bot.start({ drop_pending_updates: false, allowed_updates: ALLOWED_UPDATES });
})();
