/**
 * Router for recording
 */

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const recordController = require('../controllers/recorderController');

var activeRecorders = {};


function createRecorder(path,sut,remoteHost,remotePort,protocol,dataType,headerMask){

  var testRecorder = new recordController.Recorder(path,sut,remoteHost,remotePort,protocol,dataType,headerMask); 
  router.all("/live/" + sut + path + "*",testRecorder.incomingRequest.bind(testRecorder));
  return testRecorder;
  
}


function beginRecordingSession(label,path,sut,remoteHost,remotePort,protocol,dataType,headerMask){
  
  if(activeRecorders[label]){
    return null;
  }
  var recorder = createRecorder(path,sut,remoteHost,remotePort,protocol,dataType,headerMask);
  activeRecorders[label] = recorder;
  return recorder;
}
createRecorder("/","sut","localhost",8080,"REST","XML");
module.exports = {
    router: router,
  };
  
