/**
 * Router for recording
 */

const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recorderController');

var testRecorder = new recordController.Recorder("/test/path",'sut','localhost',5000,'SOAP','XML'); 

router.all("/" + testRecorder.sut + testRecorder.path + "*",testRecorder.incomingRequest.bind(testRecorder));

module.exports = {
    router: router,
  };
  
