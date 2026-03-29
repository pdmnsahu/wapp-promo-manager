// backend/routes/customers.js
const router = require('express').Router();
const c = require('../controllers/customerController');

router.get('/',            c.getAll);
router.get('/categories',  c.getCategories);
router.get('/:id',         c.getOne);
router.post('/',           c.create);
router.put('/:id',         c.update);
router.delete('/:id',      c.remove);

module.exports = router;
