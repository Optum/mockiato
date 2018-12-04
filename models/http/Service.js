const mongoose = require('mongoose');

const User = require('../common/User');
const System = require('../common/System');
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
  matchTemplates: [mongoose.Schema.Types.Mixed],
  rrpairs: [RRPair.schema],
  delay: {
    // force integer only
    type: Number,
    default: 0,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  delayMax: {
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
  },
  lastUpdateUser:{
    type: User.schema
  }
},{timestamps:{createdAt:'createdAt',updatedAt:'updatedAt'}});

serviceSchema.set('usePushEach', true);
module.exports = mongoose.model('Service', serviceSchema);