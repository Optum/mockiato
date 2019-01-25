const mongoose = require('mongoose');

const Service = require('../http/Service');
const MQService = require('../mq/MQService');

const draftServiceSchema = new mongoose.Schema({
    service: Service.schema,
    mqservice: MQService.schema,
    createdAt: { type: Date, default: Date.now }
});

draftServiceSchema.set('usePushEach', true);
module.exports = mongoose.model('DraftService', draftServiceSchema);