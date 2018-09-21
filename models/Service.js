const mongoose = require('mongoose');

const User = require('./User');
const System = require('./System');
const RRPair = require('./RRPair');

const serviceSchema = new mongoose.Schema({
  sut: System.schema,
  user: User.schema,
  name: { 
    type: String, 
    index: true
  },
  type: String,
  basePath: { 
    type: String, 
    index: true
  },
  rrpairs: [RRPair.schema],
  delay: {
    // force integer only
    type: Number,
    default: 0,
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

serviceSchema.set('usePushEach', true);
module.exports = mongoose.model('Service', serviceSchema);