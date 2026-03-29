// backend/routes/occasions.js
const router = require('express').Router();
const c = require('../controllers/occasionController');

router.get('/today',                c.getToday);
router.get('/upcoming',             c.getUpcoming);
router.get('/',                     c.getAll);
router.get('/:id',                  c.getOne);
router.post('/',                    c.create);
router.put('/:id',                  c.update);
router.delete('/:id',               c.remove);
router.post('/:id/template',        c.assignTemplate);
router.get('/:id/template',         c.getAssignedTemplate);

module.exports = router;
