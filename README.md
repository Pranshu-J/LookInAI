# LookInAI Telegram Webhook (Vercel)

Serverless Telegram bot webhook built for Vercel using `telegraf`.

## What This Project Does

- Receives Telegram webhook updates at `POST /api/bot`
- Replies to any incoming text message
- Runs as a Vercel Serverless Function (no always-on process required)

## Project Structure

```text
api/
  bot.js
scripts/
  set-webhook.js
```

## Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `BOT_TOKEN` (required): Telegram bot token from BotFather
- `WEBHOOK_URL` (optional but recommended): full webhook URL like `https://your-app.vercel.app/api/bot`
- `TELEGRAM_WEBHOOK_SECRET` (optional): extra webhook verification token

For local development, create a `.env` file from `.env.example`.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Add your token to `.env`:

```bash
BOT_TOKEN=123456:your_real_bot_token_here
```

3. Start local Vercel dev server:

```bash
npm run dev
```

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel.
4. Deploy.

After deploy, your webhook endpoint is:

`https://<your-domain>.vercel.app/api/bot`

## Register Telegram Webhook

You only need to register the webhook when your URL changes.

### Option A: Browser URL (manual)

Open this URL in a browser:

`https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>.vercel.app/api/bot`

Expected success response:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Option B: Script (recommended)

Set these env vars locally:

- `BOT_TOKEN`
- `WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET` (optional)

Then run:

```bash
npm run set:webhook
```

## Test

1. Send your bot a message in Telegram.
2. Check Vercel Function logs if needed.
3. The bot should reply: `Hello! This is my Vercel-hosted Telegram bot.`
