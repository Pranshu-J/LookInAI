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

## Troubleshooting Verification Failure

If Meta shows "The callback URL or verify token couldn't be validated":

1. Confirm Callback URL is exactly `https://<your-domain>/api/webhook`.
2. Confirm Verify Token in Meta dashboard exactly equals `VERIFY_TOKEN` in Vercel.
3. Ensure env vars are set in the same Vercel environment you deployed (Production/Preview).
4. Redeploy after changing env vars.
5. Check Vercel function logs for `Webhook verification failed` details.

You can also test manually:

```bash
curl "https://<your-domain>/api/webhook?hub.mode=subscribe&hub.verify_token=<your-token>&hub.challenge=123456"
```

Expected response body: `123456`
