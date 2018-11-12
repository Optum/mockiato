const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  reqQueue: String,
  resQueue: String
});

const infoSchema = new mongoose.Schema({
  hostname: String,
  port: {
    // force integer only
    type: Number,
    default: 200,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  manager: String,
  channel: String,
  transport: {
    type: Number,
    default: 200,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  username: String,
  queues: [queueSchema]
});

module.exports = mongoose.model('MQInfo', infoSchema);