const mongoose = require('mongoose');
const Service = require('./Service');

const recordingSchema = new mongoose.Schema({
    service: Service.schema,
    sut : String,
    path : String,
    remoteHost : String,
    remotePort : Number,
    payloadType : String,
    protocol : String,
    headerMask : Array
});

recordingSchema.set('usePushEach', true);
module.exports = mongoose.model('Recording', recordingSchema);