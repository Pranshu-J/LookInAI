# LookInAI Messenger Webhook

Vercel-hosted Facebook Messenger webhook endpoint with:

- `GET /api/webhook` for Meta callback URL verification
- `POST /api/webhook` for signed webhook events

## Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `VERIFY_TOKEN` (must match the token entered in Meta Webhooks config)
- `PAGE_ACCESS_TOKEN` (used for optional message replies)
- `APP_SECRET` (used to validate `x-hub-signature-256`)

This project also supports lowercase aliases:

- `verify_token`
- `page_access_token`
- `app_secret`

## Local Development

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Start local server with Vercel:

```bash
npm run dev
```

## Meta Webhook Setup

1. Deploy to Vercel.
2. In Meta app Webhooks settings:
	- Callback URL: `https://<your-vercel-domain>/api/webhook`
	- Verify Token: exactly the same value as `VERIFY_TOKEN`
3. Subscribe the page to events.

If verification succeeds, Meta receives your `hub.challenge` as plain text with HTTP 200.
