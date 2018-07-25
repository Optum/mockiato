const mongoose = require('mongoose');

const User = require('./User');
const System = require('./System');
const RRPair = require('./RRPair');

const serviceSchema = new mongoose.Schema({
  sut: System.schema,
  user: User.schema,
  name: String,
  type: String,
  basePath: String,
  rrpairs: [RRPair.schema],
  delay: {
    // force integer only
    type: Number,
    default: 1,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  txnCount: {
    type: Number,
    default: 0,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  running: {
    type: Boolean,
    default: true
  }
});

mongoose.model('Service', serviceSchema);