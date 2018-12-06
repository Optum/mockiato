/**
 * Router for recording
 */

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const recordController = require('../controllers/recorderController');

var testRecorder = new recordController.Recorder("/",'sut','localhost',8080,'SOAP','XML'); 

router.all("/" + testRecorder.sut + testRecorder.path + "*",testRecorder.incomingRequest.bind(testRecorder));

module.exports = {
    router: router,
  };
  
