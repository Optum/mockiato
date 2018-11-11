const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const rrCtrl = require('../controllers/rrpairController');

router.get('/:serviceId/rrpairs', rrCtrl.getPairsByServiceId);

module.exports = router;