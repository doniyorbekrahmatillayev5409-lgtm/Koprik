const express = require('express');
const router  = express.Router();

function requireFb(req, res, next) {
  if (!req.session.facebook) return res.status(401).json({ error: 'Facebook ulanmagan' });
  next();
}

router.get('/pages', requireFb, async (req, res) => {
  try {
    const { accessToken } = req.session.facebook;
    const r = await fetch('https://graph.facebook.com/v19.0/me/accounts?fields=id,name,fan_count&access_token=' + accessToken);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ pages: data.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:pageId/forms', requireFb, async (req, res) => {
  try {
    const { accessToken } = req.session.facebook;
    const { pageId } = req.params;
    const pageTokenRes  = await fetch('https://graph.facebook.com/v19.0/' + pageId + '?fields=access_token&access_token=' + accessToken);
    const pageTokenData = await pageTokenRes.json();
    const pageToken     = pageTokenData.access_token || accessToken;
    const formsRes  = await fetch('https://graph.facebook.com/v19.0/' + pageId + '/leadgen_forms?fields=id,name,leads_count&access_token=' + pageToken);
    const formsData = await formsRes.json();
    if (formsData.error) return res.status(400).json({ error: formsData.error.message });
    if (!req.session.pageTokens) req.session.pageTokens = {};
    req.session.pageTokens[pageId] = pageToken;
    res.json({ forms: formsData.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/select', requireFb, (req, res) => {
  const { pageId, pageName, formId, formName } = req.body;
  if (!pageId) return res.status(400).json({ error: 'pageId kerak' });
  req.session.selectedPage = { pageId, pageName, formId, formName };
  res.json({ ok: true });
});

module.exports = router;
