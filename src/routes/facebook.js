const express = require('express');
const router = express.Router();

router.post('/setup', (req, res) => {
  const { token, sheet } = req.body;
  if (!token || !sheet) return res.json({ ok: false, error: 'Token yoki Sheet ID kiritilmagan' });
  process.env.META_PAGE_ACCESS_TOKEN = token;
  process.env.SPREADSHEET_ID = sheet;
  req.session.setup = { token, sheet };
  res.json({ ok: true });
});

router.get('/status', (req, res) => {
  res.json({ ok: true, setup: !!req.session.setup });
});

module.exports = router;
