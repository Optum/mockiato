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


 