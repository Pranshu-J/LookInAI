require('dotenv').config();

async function main() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    throw new Error('Missing BOT_TOKEN in environment.');
  }

  if (!webhookUrl) {
    throw new Error('Missing WEBHOOK_URL in environment.');
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;

  const body = {
    url: webhookUrl,
  };

  if (webhookSecret) {
    body.secret_token = webhookSecret;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  console.log('Webhook successfully registered.');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
