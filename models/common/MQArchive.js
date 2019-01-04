const mongoose = require('mongoose');

const User = require('./User');
const System = require('./System');

const MQPair = require('../mq/MQPair');
const MQInfo = require('../mq/MQInfo');

const mqArchiveSchema = new mongoose.Schema({
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

mqArchiveSchema.set('usePushEach', true);
module.exports = mongoose.model('MQArchive', mqArchiveSchema);