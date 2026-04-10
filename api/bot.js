const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN is not configured');
}

const bot = new Telegraf(token);

bot.on('text', async (ctx) => {
  await ctx.reply('Hello! This is my Vercel-hosted Telegram bot.');
});

bot.on('message', async (ctx) => {
  // Fallback reply for non-text message types.
  if (!ctx.message.text) {
    await ctx.reply('I received your message. Send text and I will echo back.');
  }
});

function getHeader(req, name) {
  return req.headers?.[name] || req.headers?.[name.toLowerCase()];
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(200).send('Telegram webhook endpoint is alive. Use POST.');
    }

    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = getHeader(req, 'x-telegram-bot-api-secret-token');
      if (incomingSecret !== expectedSecret) {
        return res.status(401).send('Unauthorized webhook request');
      }
    }

    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!update || typeof update !== 'object') {
      return res.status(400).send('Invalid update payload');
    }

    await bot.handleUpdate(update);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Telegram webhook update:', error);
    return res.status(500).send('Internal Server Error');
  }
};
