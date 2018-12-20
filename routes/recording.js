/**
 * Router for recording
 */

const express = require('express');
const recordingRouter = express.Router();
const apiRouter = express.Router();
const removeRoute = require('../lib/remove-route');

var activeRecorders = {};




/**
 * Binds a given recorder to a path for all traffic
 * @param {String} path 
 * @param {Recorder} recorder 
 */
function bindRecorderToPath(path,recorder){
  recordingRouter.all("/live" + path,recordController.Recorder.prototype.incomingRequest.bind(recorder));
}


/**
 * Unbinds a recorder from live traffic
 */
function unbindRecorder(recorder){
  var path = "/recording/live/" + recorder.model.sut.name + recorder.model.path + "*";
  removeRoute(require('../app'),path);
}







//Early exports declaration because of circular dependency from recorderController.js
module.exports = {
  recordingRouter: recordingRouter,
  apiRouter : apiRouter,
  bindRecorderToPath : bindRecorderToPath,
  unbindRecorder : unbindRecorder
};


const recordController = require('../controllers/recorderController');
//Get list of recordings out in db
apiRouter.get("/",recordController.getRecordings);

//Get recorder by ID
apiRouter.get("/:id",recordController.getRecordingById);

//Get RR pairs by ID + index to start at
apiRouter.get("/:id/:index",recordController.getRecorderRRPairsAfter);

//Add a new recorder
apiRouter.put("/",recordController.addRecorder);

//Remove a recorder
apiRouter.delete("/:id",recordController.removeRecorder);