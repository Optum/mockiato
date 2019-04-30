const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reportingController');

router.get("/",reportingController.fullReport);

module.exports = {
    router : router
}