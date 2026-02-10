const express = require('express');
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.post('/',expenseController.add);
router.put('/:expenseId',expenseController.update);
router.delete('/:expenseId',expenseController.delete);

router.put('/group/:groupId/settle', expenseController.settle);
router.get('/group/:groupId/expenses',expenseController.getExpensesByGroup);
router.get('/group/:groupId/summary', expenseController.summary);


module.exports = router;