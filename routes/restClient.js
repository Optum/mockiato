const express = require('express');
const router = express.Router();
const restClientController = require('../controllers/restClientController');

// middleware for token auth. Commenting below as Rest Client Tool can be used by any user. login not required.
//router.use(tokenMiddleware);

//call to restClient backend
router.post('/request', restClientController.processREST);





module.exports = router;