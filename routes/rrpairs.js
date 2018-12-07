const express = require('express');
const router = express.Router();

const rrCtrl = require('../controllers/rrpairController');

router.get('/:serviceId/rrpairs', rrCtrl.getPairsByServiceId);

module.exports = router;