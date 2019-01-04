const mongoose = require('mongoose');

const User = require('./User');
const System = require('./System');
const RRPair = require('../http/RRPair');

const archiveSchema = new mongoose.Schema({
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

archiveSchema.set('usePushEach', true);
module.exports = mongoose.model('Archive', archiveSchema);