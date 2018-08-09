const userCtrl = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.get('/', userCtrl.getUser);

module.exports = router;
