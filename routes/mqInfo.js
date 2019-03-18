const mqCtrl = require('../controllers/mqInfoController');
const express = require('express');
const router = express.Router();

router.get('/', mqCtrl.getMQInfo);

module.exports = router;