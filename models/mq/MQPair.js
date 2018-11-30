const mongoose = require('mongoose');

const pairSchema = new mongoose.Schema({
  reqData: mongoose.Schema.Types.Mixed,
  resData: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('MQPair', pairSchema);