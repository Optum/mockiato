const sysCtrl = require('../controllers/systemController');
const express = require('express');
const router = express.Router();

router.get('/', sysCtrl.getSystems);
router.post('/', sysCtrl.addSystem);

module.exports = router;
