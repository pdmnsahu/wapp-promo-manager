// backend/routes/settings.js
const router = require('express').Router();
const c = require('../controllers/settingsController');
router.get('/',  c.getAll);
router.post('/', c.update);
module.exports = router;

