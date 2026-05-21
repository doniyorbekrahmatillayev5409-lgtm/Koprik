const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const { google } = require('googleapis');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'koprik_2025';

router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig      = req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) return res.sendStatus(403);
  }
  res.status(200).send('EVENT_RECEIVED');
  const { object, entry } = req.body;
  if (object !== 'page') return;
  for (const e of (entry || [])) {
    for (const change of (e.changes || [])) {
      if (change.field !== 'leadgen') continue;
      const { lead_id, page_id, form_id } = change.value;
      try {
        const lead = await fetchLead(lead_id);
        await writeToSheets(lead, page_id, form_id);
      } catch (err) {
        console.error('Xato:', err.message);
      }
    }
  }
});

async function fetchLead(leadId) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const r = await fetch('https://graph.facebook.com/v19.0/' + leadId + '?access_token=' + token);
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  const fields = {};
  for (const f of (data.field_data || [])) fields[f.name] = (f.values || [])[0] || '';
  return {
    leadId,
    name:  fields['full_name'] || fields['name'] || '',
    phone: fields['phone_number'] || fields['phone'] || '',
    email: fields['email'] || '',
    city:  fields['city'] || '',
  };
}

async function writeToSheets(lead, pageId, formId) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const row = [
    new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
    lead.name, lead.phone, lead.email, lead.city, formId, pageId, lead.leadId,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: (process.env.SHEET_NAME || 'Leadlar') + '!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  console.log('Sheets ga yozildi:', lead.name);
}

module.exports = router;
