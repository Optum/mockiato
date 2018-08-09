const userCtrl = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.get('/', userCtrl.getUsers);

module.exports = router;
