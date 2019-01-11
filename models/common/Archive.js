const mongoose = require('mongoose');

const Service = require('../http/Service');
const MQService = require('../mq/MQService');

const archiveSchema = new mongoose.Schema({
    service: Service.schema,
    mqservice: MQService.schema,
});

archiveSchema.set('usePushEach', true);
module.exports = mongoose.model('Archive', archiveSchema);