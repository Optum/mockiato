const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const servCtrl = require('../controllers/serviceController');

// middleware for token auth
router.use(tokenMiddleware);

// middleware to reject invalid services
function rejectInvalid(req, res, next) {
  const validTypes = [ 'SOAP', 'REST', 'MQ' ];

  const type = req.body.type;
  if (type && validTypes.includes(type)) return next();
  
  handleError(`Service type ${type} is not supported`, res, 400);
}

//Upload zip in upload directory and extract the zip in RRPair directory
router.post('/fromPairs/upload', upload.single('zipFile'), servCtrl.zipUploadAndExtract);

//create service from RR Pairs present in RRPair directory
router.post('/fromPairs/publish', servCtrl.publishExtractedRRPairs);

//Upload openapi or wsdl spec in upload directory.
router.post('/fromSpec/upload', upload.single('specFile'), servCtrl.specUpload);

//create openapi or wsdl service from open spec or wsdl present in upload directory
router.post('/fromSpec/publish', servCtrl.publishUploadedSpec);

// retrieve archive services
router.get('/archive', servCtrl.getArchiveServices);

// retrieve draft services
router.get('/draft', servCtrl.getDraftServices);

//delete a virtual service from Archive
router.delete('/archive/:id', servCtrl.permanentDeleteService);

//delete a virtual service from Draft Service
router.delete('/draft/:id', servCtrl.deleteDraftService);

// restore a virtual service from Archive
router.post('/archive/:id/restore', servCtrl.restoreService);

// get Service Info for a virtual service from Archive
router.get('/archive/:id', servCtrl.getArchiveServiceInfo);

// get Service Info for a virtual service from DraftService
router.get('/draft/:id', servCtrl.getDraftServiceById);

// add a new virtual service
router.post('/', rejectInvalid, servCtrl.addService);

//Search services
router.get("/search/:id",servCtrl.searchServices);
router.get("/search",servCtrl.searchServices);

// retrieve a virtual service by ID (in JSON)
router.get('/:id', servCtrl.getServiceById);

// retrieve services with query string filters
router.get('/', servCtrl.getServicesByQuery);

// retrieve services by SUT
router.get('/sut/:name', servCtrl.getServicesBySystem);

// retrieve services by SUT Archive
router.get('/sut/:name/archive', servCtrl.getServicesArchiveBySystem);

// retrieve services by SUT Draft
router.get('/sut/:name/draft', servCtrl.getServicesDraftBySystem);

// retrieve services by user
router.get('/user/:uid', servCtrl.getServicesByUser);

// retrieve services by user Archive
router.get('/user/:uid/archive', servCtrl.getArchiveServicesByUser);

// retrieve services by user Draft
router.get('/user/:uid/draft', servCtrl.getDraftServicesByUser);

// update a virtual service by ID
router.put('/:id', servCtrl.updateService);

// update a virtual service by ID
router.put('/draftservice/:id', servCtrl.updateServiceAsDraft);

// delete a virtual service by ID
router.delete('/:id', servCtrl.deleteService);

// toggle a service on / off TODO: toggle MQ services
router.post('/:id/toggle', servCtrl.toggleService);

// add a new draft service
router.post('/draftservice', servCtrl.addServiceAsDraft);

// get Service Info for a virtual service from Archive
router.get('/infoFrmArchive/:id', servCtrl.getArchiveServiceInfo);


// delete a recorded RR pair
router.delete('/:id/recorded/:rrpairId',servCtrl.deleteRecordedRRPair);

// get recorded RR pairs from service
router.get('/:id/recorded',servCtrl.getServiceRecordedRRPairs);

//Merge in recorded RR pair 
router.patch('/:id/recorded/:rrpairId',servCtrl.mergeRecordedRRPair);

//Add RRPair to service
router.patch('/:id/rrpair',servCtrl.addRRPair);

const rrpairs = require('./rrpairs');
router.use(rrpairs);

module.exports = router;