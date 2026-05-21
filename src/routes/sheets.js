const express    = require('express');
const router     = express.Router();
const { google } = require('googleapis');

function requireGoogle(req, res, next) {
  if (!req.session.google) return res.status(401).json({ error: 'Google ulanmagan' });
  next();
}

function getAuth(req) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials(req.session.google.tokens);
  return oauth2Client;
}

router.get('/files', requireGoogle, async (req, res) => {
  try {
    const auth  = getAuth(req);
    const drive = google.drive({ version: 'v3', auth });
    const r = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 20,
    });
    res.json({ files: r.data.files || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/select', requireGoogle, (req, res) => {
  const { fileId, fileName } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId kerak' });
  req.session.selectedSheet = { fileId, fileName };
  res.json({ ok: true });
});

router.post('/append', requireGoogle, async (req, res) => {
  const { fileId, sheetName = 'Leadlar', lead } = req.body;
  if (!fileId || !lead) return res.status(400).json({ error: 'fileId va lead kerak' });
  try {
    const auth   = getAuth(req);
    const sheets = google.sheets({ version: 'v4', auth });
    const row = [
      new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
      lead.name || '', lead.phone || '', lead.email || '',
      lead.city || '', lead.formName || '', lead.pageName || '', lead.leadId || '',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: fileId,
      range: sheetName + '!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
