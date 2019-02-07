const mongoose = require('mongoose');
const Service = require('./Service');
const System = require('../common/System');
const constants = require('../../lib/util/constants');

const recordingSchema = new mongoose.Schema({
    service: {
        type: Service.schema,
        required: [true, constants.REQUIRED_SERVICE_ERR]
      },
    sut: {
        type: System.schema,
        required: [true, constants.REQUIRED_SUT_ERR]
      },
    path : { 
        type: String,
        required: [true, constants.REQUIRED_BASEPATH_ERR]
    },
    remoteHost : { 
        type: String,
        required: [true, constants.REMOTE_HOST_NOT_ERR]
    },
    remotePort : { 
        type: Number,
        required: [true, constants.REMOTE_PORT_NOT_ERR]
    },
    payloadType : String,
    protocol : String,
    headerMask : Array,
    name: { 
        type: String,
        required: [true, constants.REQUIRED_RECORDER_SERVICE_NAME_ERR]
    },
    active : Boolean,
    ssl : Boolean,
    running: {
        type: Boolean,
        default: true
      },
    filters:{
        enabled : {
            type: Boolean,
            default : false
        },
        bodyStrings : [String],
        headers : [{key:String,value:String}],
        statuses : [Number]
    }
});

recordingSchema.set('usePushEach', true);
module.exports = mongoose.model('Recording', recordingSchema);


 