const mongoose = require('mongoose');

const User = require('../common/User');
const System = require('../common/System');
const RRPair = require('./RRPair');

const serviceSchema = new mongoose.Schema({
  sut: System.schema,
  user: User.schema,
  name: { 
    type: String, 
    index: true
  },
  type: String,
  basePath: { 
    type: String, 
    index: true
  },
  matchTemplates: [mongoose.Schema.Types.Mixed],
  rrpairs: [RRPair.schema],
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
    ssl: Boolean ,
    record : {
      type: Boolean,
      default: false
    },
    recordedRRPairs:[RRPair.schema]  
  }
},{timestamps:{createdAt:'createdAt',updatedAt:'updatedAt'}});

/**
 * Strips down an RRPair for quick logical comparison
 * @param {RRPair} rrpair 
 */
function stripRRPair(rrpair) {
  return {
    verb: rrpair.verb || '',
    path: rrpair.path || '',
    payloadType: rrpair.payloadType || '',
    queries: rrpair.queries || {},
    reqHeaders: rrpair.reqHeaders || {},
    reqData: rrpair.reqData || {},
    resStatus: rrpair.resStatus || 200,
    resData: rrpair.resData || {}
  };
}

/**
 * Goes through liveinvocation.recordedRRPairs and strips out all duplicates before saving the service
 * @param {Service} service 
 */
function filterDuplicateRecordedPairs(service){

  //This check probably looks excessive- it is necessary because service can be null, the live invo group can be null, the recorded section can be null, and recorded can be 0 length! 
  //Not checking makes the entire app grind to a half if any of those are null. 
  if(service && service.liveInvocation && service.liveInvocation.recordedRRPairs && service.liveInvocation.recordedRRPairs.length){
    var pairs = service.liveInvocation.recordedRRPairs;
    var keepThisRRPair = [];
    var strippedPairs = [];
    for(let i = 0; i < pairs.length; i++){
      keepThisRRPair.push(true);
      strippedPairs[i] = stripRRPair(pairs[i]);
    }

    //iterate over all RR pairs, calling them i. 
    for(let i = 0; i < strippedPairs.length; i++){

      //If i has not already been eliminated...
      if(keepThisRRPair[i]){

        //Then compare it against all RRPairs further down the list than i, calling each one j
        for(let j = i+1; j < strippedPairs.length;j++){

          //If i and j are duplicates, mark off j (but not i) to NOT include in the trimmed list. 
          if(deepEquals(strippedPairs[i],strippedPairs[j])){
            keepThisRRPair[j] = false;
          }
        }
      }
    }
    //Extract only the rrpairs we want to
    var rrPairs = [];
    for(let i = 0; i < pairs.length; i++){
      if(keepThisRRPair[i]){
        rrPairs.push(pairs[i]);
      }
    }
    
    //if changes were made, save them
    if(rrPairs.length != pairs.length){
      service.liveInvocation.recordedRRPairs = rrPairs;
      service.save();
    }

  }
  
  return service;
}



/**
 * The below hooks hook on every find or findOne call made to the Service schema. On each call, every service will be checked for duplicate recorded RRPairs under liveInvocation.recordedRRPairs. 
 * Any duplicates will be stripped (except the original pair recorded) from the list of recordedRRPairs. This will happen before Mockiato receives the result of the query, and this change will be saved immediately. 
 */

serviceSchema.post('findOne',function(result){
  filterDuplicateRecordedPairs(result);
});

serviceSchema.post('find',function(results){
  results.forEach(function(result){
    filterDuplicateRecordedPairs(result);
  })
});





serviceSchema.set('usePushEach', true);
module.exports = mongoose.model('Service', serviceSchema);