const express = require('express');
const router = express.Router();
const restClientController = require('../controllers/restClientController');

// middleware for token auth
router.use(tokenMiddleware);

//call to restClient backend
router.post('/request', restClientController.processREST);





module.exports = router;