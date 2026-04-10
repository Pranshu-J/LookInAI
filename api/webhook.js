import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  api: {
    bodyParser: false,
  },
};

function env(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

function getHeader(req, headerName) {
  return req.headers?.[headerName] || req.headers?.[headerName.toLowerCase()] || '';
}

function getVerificationParams(req) {
  const query = req.query || {};
  return {
    mode: query['hub.mode'] || query.mode,
    token: query['hub.verify_token'] || query.verify_token,
    challenge: query['hub.challenge'] || query.challenge,
  };
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return false;

  const [algorithm, receivedHash] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !receivedHash) return false;

  const expectedHash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

async function sendMessengerText(psid, text, pageAccessToken) {
  if (!pageAccessToken) return;

  const response = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Messenger send API failed:', errorBody);
  }
}

async function processMessageEvent(event, pageAccessToken) {
  const senderId = event?.sender?.id;
  if (!senderId) return;

  if (event?.message?.text) {
    await sendMessengerText(senderId, `You said: ${event.message.text}`, pageAccessToken);
    return;
  }

  if (event?.postback?.payload) {
    await sendMessengerText(senderId, `Postback received: ${event.postback.payload}`, pageAccessToken);
  }
}

export default async function handler(req, res) {
  const verifyToken = env('VERIFY_TOKEN', 'verify_token');
  const appSecret = env('APP_SECRET', 'app_secret');
  const pageAccessToken = env('PAGE_ACCESS_TOKEN', 'page_access_token');

  if (req.method === 'GET') {
    const { mode, token, challenge } = getVerificationParams(req);

    if (!verifyToken) {
      return res.status(500).send('VERIFY_TOKEN is not configured');
    }

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Verification failed');
  }

  if (req.method === 'POST') {
    try {
      const rawBody = await readRawBody(req);
      const signature = getHeader(req, 'x-hub-signature-256');

      if (!appSecret) {
        return res.status(500).send('APP_SECRET is not configured');
      }

      if (!isValidSignature(rawBody, signature, appSecret)) {
        return res.status(401).send('Invalid signature');
      }

      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return res.status(400).send('Invalid JSON payload');
      }

      if (body?.object !== 'page') {
        return res.status(404).send('Unsupported webhook object');
      }

      const entries = Array.isArray(body.entry) ? body.entry : [];
      const tasks = [];

      for (const entry of entries) {
        const messagingEvents = Array.isArray(entry.messaging) ? entry.messaging : [];
        for (const event of messagingEvents) {
          tasks.push(processMessageEvent(event, pageAccessToken));
        }
      }

      await Promise.allSettled(tasks);
      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Webhook POST error:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
