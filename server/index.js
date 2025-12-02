require('dotenv').config();
const express = require('express');
const cors = require('cors');
const reportingRoutes = require('./routes/reporting');

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
  })
);

app.get('/', (_req, res) => res.json({ name: 'reporting-backend', ok: true }));
app.use('/api', reportingRoutes);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
