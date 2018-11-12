const mongoose = require('mongoose');

const User = require('../common/User');
const System = require('../common/System');

const MQPair = require('./MQPair');
const MQInfo = require('./MQInfo');

const mqSchema = new mongoose.Schema({
  sut: System.schema,
  user: User.schema,
  name: { 
    type: String, 
    index: true
  },
  type: String,
  matchTemplates: [mongoose.Schema.Types.Mixed],
  connInfo: MQInfo.schema,
  rrpairs: [MQPair.schema],
  running: {
    type: Boolean,
    default: true
  }
});

mqSchema.set('usePushEach', true);
module.exports = mongoose.model('MQService', mqSchema);