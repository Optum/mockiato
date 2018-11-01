const userCtrl = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.get('/', userCtrl.getUsers);
router.delete('/:name', tokenMiddleware, userCtrl.delUser);

module.exports = router;
