const mongoose = require('mongoose');

const User = require('../common/User');
const System = require('../common/System');

const MQPair = require('./MQPair');
//const MQInfo = require('./MQInfo');
const constants = require('../../lib/util/constants');

const mqSchema = new mongoose.Schema({
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
  //mqInfo: MQInfo.schema,
  matchTemplates: [mongoose.Schema.Types.Mixed],
  rrpairs: {
    type: [MQPair.schema],
    required: [true, constants.REQUIRED_RRPAIRS_ERR]
  },
  running: {
    type: Boolean,
    default: true
  },
  lastUpdateUser:{
    type: User.schema
  },
  delay: {
    // force integer only
    type: Number,
    default: 0,
    validate: {
      validator: function (v) {
        if (Number.isInteger(v) && v >= 0)
          return true;
          else return false;
      },
      message: '{VALUE}'+constants.NOT_VALID_INTEGER+'({PATH}).'
    }
  },
  delayMax: {
    // force integer only
    type: Number,
    default: 0,
    validate: {
      validator: function (v) {
        if (Number.isInteger(v) && v >= 0)
          return true;
          else return false;
      },
      message: '{VALUE}'+constants.NOT_VALID_INTEGER+'({PATH}).'
    }
  },
  txnCount: {
    type: Number,
    default: 0,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
},{timestamps:{createdAt:'createdAt',updatedAt:'updatedAt'}});

mqSchema.set('usePushEach', true);
module.exports = mongoose.model('MQService', mqSchema);