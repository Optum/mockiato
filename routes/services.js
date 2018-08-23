const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const jwt = require('jsonwebtoken');
const servCtrl = require('../controllers/serviceController');

// middleware for token auth
router.use(function(req, res, next) {
  res.set('Content-Type', 'application/json');
  if (req.method === 'GET') return next();

  const token = req.query.token || req.headers['x-access-token'];
  if (token) {
    // verify secret and check expiry
    jwt.verify(token, require('../app').get('secret'), function(err, decoded) {
      if (err) {
        return res.status(403).json({
            success: false,
            message: 'Failed to authenticate token'
        });
      } else {
        // save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return res.status(401).json({
        success: false,
        message: 'No token provided.'
    });
  }
});

// create service from OpenAPI spec
router.post('/fromSpec', upload.single('spec'), servCtrl.createFromSpec);

// add a new virtual service
router.post('/', servCtrl.addService);

// retrieve a virtual service by ID (in JSON)
router.get('/:id', servCtrl.getServiceById);

// retrieve services with query string filters
router.get('/', servCtrl.getServicesByQuery);

// retrieve services by SUT
router.get('/sut/:name', servCtrl.getServicesBySystem);

// retrieve services by user
router.get('/user/:uid', servCtrl.getServicesByUser);

// update a virtual service by ID
router.put('/:id', servCtrl.updateService);

// delete a virtual service by ID
router.delete('/:id', servCtrl.deleteService);

// toggle a service on / off TODO: toggle MQ services
router.post('/:id/toggle', servCtrl.toggleService);

module.exports = router;
