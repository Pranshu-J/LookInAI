import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 1. Handle the GET request for Facebook Webhook Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // This 'VERIFY_TOKEN' is a string YOU choose and set in Facebook's dashboard
    if (mode && token === process.env.VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).end();
    }
  }

  // 2. Handle the POST request (Incoming Messages/Shared Posts)
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      body.entry.forEach(entry => {
        const webhook_event = entry.messaging[0];
        const sender_psid = webhook_event.sender.id;

        // Check if the message contains an attachment (like a shared post)
        if (webhook_event.message && webhook_event.message.attachments) {
          handleAttachment(sender_psid, webhook_event.message.attachments[0]);
        } else if (webhook_event.message && webhook_event.message.text) {
          handleMessage(sender_psid, webhook_event.message.text);
        }
      });

      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).end();
    }
  }
}

// Logic to process the shared post
async function handleAttachment(psid, attachment) {
  if (attachment.type === 'fallback') {
    const sharedUrl = attachment.payload.url;
    console.log(`Received shared post: ${sharedUrl}`);

    const analysisResult = `I've received your post! URL: ${sharedUrl}. Analyzing now...`;

    // Send a response back to the user
    await callSendAPI(psid, { "text": analysisResult });
  }
}

// Logic to process text messages
async function handleMessage(psid, text) {
  console.log(`Received message: ${text}`);
  const response = { "text": `You sent: "${text}". I'm a bot by LookInAI!` };
  await callSendAPI(psid, response);
}

// Helper to send messages back to the user
async function callSendAPI(sender_psid, response) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
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
