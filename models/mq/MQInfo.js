const mongoose = require('mongoose');

const infoSchema = new mongoose.Schema({
  manager: String,
  reqQueue: String
});

module.exports = mongoose.model('MQInfo', infoSchema);