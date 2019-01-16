const userCtrl = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.get('/', userCtrl.getUsers);
router.delete('/:name', tokenMiddleware, userCtrl.delUser);
router.get('/admin', userCtrl.getAdminUser);

module.exports = router;
