const mongoose = require('mongoose');

const pairSchema = new mongoose.Schema({
  label: String,
  reqData: mongoose.Schema.Types.Mixed,
  resData: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('MQPair', pairSchema);