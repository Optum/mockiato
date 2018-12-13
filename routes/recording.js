/**
 * Router for recording
 */

const express = require('express');
const recordingRouter = express.Router();
const apiRouter = express.Router();


var activeRecorders = {};





function bindRecorderToPath(path,recorder){
  recordingRouter.all("/live" + path,recorder.incomingRequest.bind(recorder));
}










module.exports = {
  recordingRouter: recordingRouter,
  apiRouter : apiRouter,
  bindRecorderToPath : bindRecorderToPath
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