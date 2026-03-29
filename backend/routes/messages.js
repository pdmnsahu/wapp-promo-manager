// backend/routes/messages.js
const router = require('express').Router();
const c = require('../controllers/messageController');

router.get('/dashboard',  c.getDashboard);
router.get('/logs',       c.getLogs);
router.delete('/logs/:id',c.deleteLog);
router.post('/send',      c.sendManual);
router.post('/bulk',      c.sendBulk);
router.post('/trigger',   c.triggerScheduler);

module.exports = router;
