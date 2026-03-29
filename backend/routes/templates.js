// backend/routes/templates.js
const router = require('express').Router();
const c = require('../controllers/templateController');

router.get('/',          c.getAll);
router.get('/:id',       c.getOne);
router.post('/',         c.create);
router.post('/preview',  c.preview);
router.put('/:id',       c.update);
router.delete('/:id',    c.remove);

module.exports = router;
