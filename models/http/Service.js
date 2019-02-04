const mongoose = require('mongoose');

const User = require('../common/User');
const System = require('../common/System');
const RRPair = require('./RRPair');
const constants = require('../../lib/util/constants');

const serviceSchema = new mongoose.Schema({
  sut: {
    type: System.schema,
    required: [true, constants.REQUIRED_SUT_ERR]
  },
  user: User.schema,
  name: { 
    type: String,
    required: [true, constants.REQUIRED_SERVICE_NAME_ERR],
    index: true
  },
  type: {
    type: String,
    required: [true, constants.REQUIRED_SERVICE_TYPE_ERR]
  },
  basePath: { 
    type: String,
    required: [true, constants.REQUIRED_BASEPATH_ERR],
    index: true
  },
  matchTemplates: [mongoose.Schema.Types.Mixed],
  rrpairs: {
    type: [RRPair.schema],
    required: [true, constants.REQUIRED_RRPAIRS_ERR]
  },
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
  },liveInvocation:{
    enabled: Boolean,
    liveFirst: Boolean,
    remoteHost : String,
    remotePort : Number,
    remoteBasePath : String,
    failStatusCodes : [Number],
    failStrings : [String],
    ssl: Boolean    
  }
},{timestamps:{createdAt:'createdAt',updatedAt:'updatedAt'}});

serviceSchema.set('usePushEach', true);
module.exports = mongoose.model('Service', serviceSchema);