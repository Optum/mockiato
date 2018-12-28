const mongoose = require('mongoose');
const Service = require('./Service');
const System = require('../common/System');

const recordingSchema = new mongoose.Schema({
    service: Service.schema,
    sut : System.schema,
    path : String,
    remoteHost : String,
    remotePort : Number,
    payloadType : String,
    protocol : String,
    headerMask : Array,
    name : String,
    active : Boolean
});

recordingSchema.set('usePushEach', true);
module.exports = mongoose.model('Recording', recordingSchema);


 