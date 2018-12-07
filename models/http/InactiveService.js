const mongoose = require('mongoose');

const Service = require('./Service');

module.exports = mongoose.model('InactiveService', Service.schema);
