const express = require('express');
const router  = express.Router();
const { google } = require('googleapis');

function getGoogleClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.BASE_URL + '/auth/google/callback'
  );
}

router.get('/google', (req, res) => {
  const oauth2Client = getGoogleClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=google_no_code');
  try {
    const oauth2Client = getGoogleClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const people = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: user } = await people.userinfo.get();
    req.session.google = { tokens, email: user.email, name: user.name };
    res.redirect('/?step=google_connected');
  } catch (err) {
    res.redirect('/?error=google_failed');
  }
});

router.get('/facebook', (req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.META_APP_ID,
    redirect_uri: process.env.BASE_URL + '/auth/facebook/callback',
    scope:        'pages_manage_metadata,pages_read_engagement,leads_retrieval,pages_show_list',
    response_type: 'code',
  });
  res.redirect('https://www.facebook.com/v19.0/dialog/oauth?' + params);
});

router.get('/facebook/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?error=fb_denied');
  try {
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id',     process.env.META_APP_ID);
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri',  process.env.BASE_URL + '/auth/facebook/callback');
    tokenUrl.searchParams.set('code', code);
    const tokenRes  = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    const userRes  = await fetch('https://graph.facebook.com/me?fields=id,name&access_token=' + tokenData.access_token);
    const userData = await userRes.json();
    req.session.facebook = { accessToken: tokenData.access_token, userId: userData.id, name: userData.name };
    res.redirect('/?step=fb_connected');
  } catch (err) {
    res.redirect('/?error=fb_failed');
  }
});

router.get('/status', (req, res) => {
  res.json({
    google:   req.session.google   ? { email: req.session.google.email,   name: req.session.google.name }   : null,
    facebook: req.session.facebook ? { name:  req.session.facebook.name } : null,
  });
});

module.exports = router;
