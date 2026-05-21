const express = require('express');
const session = require('express-session');
const path    = require('path');

const authRoutes     = require('./routes/auth');
const facebookRoutes = require('./routes/facebook');
const sheetsRoutes   = require('./routes/sheets');
const webhookRoutes  = require('./routes/webhook');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'koprik_secret_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use('/auth',       authRoutes);
app.use('/api/fb',     facebookRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/webhook',    webhookRoutes);
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Koprik: http://localhost:' + PORT));
