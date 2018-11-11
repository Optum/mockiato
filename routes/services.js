const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const servCtrl = require('../controllers/serviceController');

// middleware for token auth
router.use(tokenMiddleware);

// middleware to reject invalid services
function rejectInvalid(req, res, next) {
  const validTypes = [ 'SOAP', 'REST' ];
  const type = req.body.type;

  if (validTypes.includes(type)) return next();
  handleError(`Service type ${type} is not supported`, res, 400);
}

// create service from OpenAPI spec
router.post('/fromSpec', upload.single('spec'), servCtrl.createFromSpec);

// add a new virtual service
router.post('/', rejectInvalid, servCtrl.addService);

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

const rrpairs = require('./rrpairs');
router.use(rrpairs);

module.exports = router;
