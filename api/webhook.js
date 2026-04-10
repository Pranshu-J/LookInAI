import fetch from 'node-fetch';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Needed in Next.js/Vercel API routes so signature validation can use raw request bytes.
export const config = {
  api: {
    bodyParser: false,
  },
};

function getHeader(req, name) {
  return req.headers?.[name] || req.headers?.[name.toLowerCase()] || req.headers?.[name.toUpperCase()];
}

async function getRawBodyBuffer(req) {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }

  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifyRequestSignature(req, rawBodyBuffer) {
  const signatureHeader = getHeader(req, 'x-hub-signature-256');

  if (!signatureHeader) {
    console.warn('Missing x-hub-signature-256 header.');
    return false;
  }

  const [algorithm, signatureHash] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !signatureHash) {
    console.warn('Invalid x-hub-signature-256 format.');
    return false;
  }

  const expectedHash = crypto
    .createHmac('sha256', process.env.APP_SECRET)
    .update(rawBodyBuffer)
    .digest('hex');

  const given = Buffer.from(signatureHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (given.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(given, expected);
}

export default async function handler(req, res) {
  // 1. Handle GET: Webhook Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN && challenge) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      console.error('VERIFICATION_FAILED');
      return res.status(403).end();
    }
  }

  // 2. Handle POST: Event Notifications
  if (req.method === 'POST') {
    const rawBodyBuffer = await getRawBodyBuffer(req);

    // Validate signed payloads when APP_SECRET is configured.
    if (process.env.APP_SECRET) {
      if (!verifyRequestSignature(req, rawBodyBuffer)) {
        return res.status(401).send('Signature verification failed');
      }
    }

    let body = req.body;
    if (!body || typeof body === 'string' || Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(rawBodyBuffer.toString('utf8'));
      } catch {
        return res.status(400).send('Invalid JSON payload');
      }
    }

    if (body.object === 'page') {
      body.entry?.forEach(entry => {
        // Entries can contain multiple messages
        if (entry.messaging) {
          entry.messaging.forEach(webhook_event => {
            const sender_psid = webhook_event?.sender?.id;
            if (!sender_psid) {
              return;
            }

            if (webhook_event.message) {
              if (webhook_event.message.attachments) {
                handleAttachment(sender_psid, webhook_event.message.attachments[0]).catch((error) => {
                  console.error('Attachment handling error:', error);
                });
              } else if (webhook_event.message.text) {
                handleMessage(sender_psid, webhook_event.message.text).catch((error) => {
                  console.error('Message handling error:', error);
                });
              }
            } else if (webhook_event.postback?.payload) {
              handlePostback(sender_psid, webhook_event.postback.payload).catch((error) => {
                console.error('Postback handling error:', error);
              });
            } else if (webhook_event.read || webhook_event.delivery || webhook_event.reaction) {
              // Acknowledge non-message webhooks silently.
              console.log('Received non-message webhook event.');
            }
          });
        }
      });

      // Meta requires a 200 OK within 5 seconds
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).end();
    }
  }

  return res.status(405).end(); // Method Not Allowed
}

async function handleAttachment(psid, attachment) {
  if (attachment?.type === 'fallback' && attachment?.payload?.url) {
    const sharedUrl = attachment.payload.url;
    console.log(`Received shared post: ${sharedUrl}`);
    const analysisResult = `I've received your post! URL: ${sharedUrl}. Analyzing now...`;
    await callSendAPI(psid, { "text": analysisResult });
  } else {
    await callSendAPI(psid, { "text": 'Attachment received. I can currently analyze shared links.' });
  }
}

async function handleMessage(psid, text) {
  console.log(`Received message: ${text}`);
  const response = { "text": `You sent: "${text}". I'm a bot by LookInAI!` };
  await callSendAPI(psid, response);
}

async function handlePostback(psid, payload) {
  console.log(`Received postback payload: ${payload}`);
  await callSendAPI(psid, { "text": `Postback received: ${payload}` });
}

async function callSendAPI(sender_psid, response) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) {
    console.error('Missing PAGE_ACCESS_TOKEN environment variable.');
    return;
  }
  
  try {
    const response_fb = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: sender_psid },
        message: response
      })
    });
    
    if (!response_fb.ok) {
      const errorData = await response_fb.json();
      console.error('FB API Error:', errorData);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}
