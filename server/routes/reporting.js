const express = require('express');
const router = express.Router();
const { sql, executeStoredProcedure } = require('../db');

router.get('/health', async (_req, res) => {
  try {
    await executeStoredProcedure; // ensure module loads
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// GET /api/utilization
// Optional query params: city, campus, buildingId, buildingName, floor, room, from, to
router.get('/utilization', async (req, res) => {
  try {
    const { city, campus, buildingId, buildingName, floor, room, from, to } = req.query;

    const inputs = {
      City: { type: sql.NVarChar(100), value: city || null },
      Campus: { type: sql.NVarChar(100), value: campus || null },
      BuildingId: { type: sql.NVarChar(100), value: buildingId || null },
      BuildingName: { type: sql.NVarChar(200), value: buildingName || null },
      Floor: { type: sql.Int, value: floor ? Number(floor) : null },
      Room: { type: sql.NVarChar(50), value: room || null },
      FromDate: { type: sql.Date, value: from || null },
      ToDate: { type: sql.Date, value: to || null },
    };

    const rows = await executeStoredProcedure('sp_GetRoomUtilization', inputs);
    // Expected result columns: room, month, monday, tuesday, wednesday, thursday, friday
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

module.exports = router;
