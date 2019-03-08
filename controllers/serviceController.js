const Service = require('../models/http/Service');
const MQService = require('../models/mq/MQService');
const RRPair  = require('../models/http/RRPair');
const Archive  = require('../models/common/Archive');
const DraftService  = require('../models/common/DraftService');
const virtual = require('../routes/virtual');
const manager = require('../lib/pm2/manager');
const debug = require('debug')('default');
const oas = require('../lib/openapi/parser');
const wsdl = require('../lib/wsdl/parser');
const rrpair = require('../lib/rrpair/parser');
const request = require('request');
const fs   = require('fs');
const unzip = require('unzip2');
const YAML = require('yamljs');
const invoke = require('../routes/invoke'); 
const System = require('../models/common/System');
const systemController = require('./systemController');
const constants = require('../lib/util/constants');

/**
 * Given a User object and a service's id, return a promise that resolves if this user can edit the service, and rejects otherwise
 * @param {User} user 
 * @param {string} serviceId 
 */
function canUserEditServiceById(user,serviceId){
  return new Promise(function(resolve,reject){
    Service.findById(serviceId,function(err,doc){
      if(err)
        reject(err)
      else
        if(doc){
          systemController.isUserMemberOfGroup(user,doc.sut).then((bool)=>{resolve(bool)},(err)=>{reject(err)});
        }else{
          reject("No Service Found");
        }
    });
  });
}





/**
 * Wrapper function for (MQ)Service.create. If req is provided, will also check against current logged in user's permissions first. 
 * @param {object} serv An object containing the info to create a service
 * @param {*} req Express request. 
 * @return A promise from creating the service. Resolves to the new service. Rejects with error from mongoose OR error from lack of group permission.
 */
function createService(serv,req){
  return new Promise(function(resolve,reject){
    if(req){
      var user = req.decoded;
      serv.lastUpdateUser = user;
      var authed = false;
      
      //Get our system
      systemController.getSystemIfMember(user.uid,serv.sut.name).exec(function(err,system){
        if(err){
          reject(err);
        }else if(system){
          serv.sut = system; //Make sure service has full system info, including proper ID!
          performCreate();
        }else{
          reject(new Error(constants.USER_NOT_AUTHORIZED_ERR));
        }
      });

    }else{
      performCreate();
    }
    function performCreate(){
      if(serv.type == "MQ"){
        MQService.create(serv,function(err,service){
          if(err)
            reject(err);
          else
            resolve(service);
        });
      }else{
        Service.create(serv,function(err,service){
          if(err)
            reject(err);
          else 
            resolve(service);
        });
      }
    }
  
    

  });
  
}

/**
 * Helper function for search. Trims down an HTTP service for return, and filters + trims rrpairs. 
 * @param {*} doc Service doc from mongoose
 * @param {*} searchOnReq text to filter Request on
 * @param {*} searchOnRsp text to filter Response on
 */
function trimServiceAndFilterRRPairs(doc,searchOnReq,searchOnRsp){
  //Trim service
  var service = {
    id : doc.id,
    name : doc.name,
    sut : {name : doc.sut.name, _id : doc.sut._id},
    type : doc.type,
    user : {uid : doc.user.uid, _id : doc.user._id},
    basePath : doc.basePath,
    createdAt : doc.createdAt,
    updatedAt : doc.updatedAt,
    lastUpdateUser: doc.lastUpdateUser
  };

  //If we have RRpairs to filter...
  if(doc.rrpairs){
    service.rrpairs = [];
    doc.rrpairs.forEach(function(rrpair){
      var addThisRRPair = true;
      if(doc.type != "MQ"){
        //If req/rsp don't contain search string, fail this one
        if(searchOnReq && rrpair.reqDataString){
          addThisRRPair = rrpair.reqDataString.toLowerCase().includes(searchOnReq.toLowerCase());
        }
        if(searchOnRsp && addThisRRPair && rrpair.resDataString){
          addThisRRPair = rrpair.resDataString.toLowerCase().includes(searchOnRsp.toLowerCase());;
        }
         //If req/rsp search is enabled and it has no req/rsp, fail it
        if(searchOnReq && !(rrpair.reqDataString)){
          addThisRRPair = false;
        }
        if(searchOnRsp && !(rrpair.resDataString)){
          addThisRRPair = false;
        }
      }else{
        //MQ doesn't have/need cached strings
        if(searchOnReq && rrpair.reqData){
          addThisRRPair = rrpair.reqData.toLowerCase().includes(searchOnReq.toLowerCase());
        }
        if(searchOnRsp && addThisRRPair && rrpair.resData){
          addThisRRPair = rrpair.resData.toLowerCase().includes(searchOnRsp.toLowerCase());;
        }
         //If req/rsp search is enabled and it has no req/rsp, fail it
        if(searchOnReq && !(rrpair.reqData)){
          addThisRRPair = false;
        }
        if(searchOnRsp && !(rrpair.resData)){
          addThisRRPair = false;
        }
      }

     

      //If we're still supposed to add this..
      if(addThisRRPair){
        
        //Pull object names from RRPair's schema. Trim out reqDataString and rspDataString and copy the rest.
        var trimmedRRPair = {};
        for(var key in RRPair.schema.obj){
          if(key != 'resDataString' && key != 'reqDataString'){
            trimmedRRPair[key] = rrpair[key];
          }
        }
        trimmedRRPair._id = rrpair._id;
        service.rrpairs.push(trimmedRRPair);
      }

    });

  }
  return service;
}


/**
 * Handles API call for search services
 * path param: ID of a service to limit this search to this param
 * queries-
 * requestContains: Filters only services that have rr pairs that contain this string in their request. Only returns rrpairs that match this as well.
 * responseContains: Filters only services that have rr pairs that contain this string in their response. Only returns rrpairs that match this as well.
 * name: Filters on name of servie
 * sortBy: created sorts on created datetime, updated sorts on updated datetime
 * asc: if set (any value or none), sort ascending instead of descending
 * authorizedOnly: When passed a username, restricts results to only services that user is authorized to edit. 
 * @param {*} req express req
 * @param {*} rsp express rsp
 */
function searchServices(req,rsp){

  //Build search query
  var search = {};
  if(req.params.id){
    search._id = req.params.id;
  }
  var query = req.query;
  var searchOnReq = false;
  var searchOnRsp = false;
  if(query.requestContains){
    searchOnReq = query.requestContains;
    search['rrpairs.reqDataString'] = {$regex:searchOnReq,$options:'i'};
  }
  if(query.responseContains){
    searchOnRsp = query.responseContains;
    search['rrpairs.resDataString'] = {$regex:searchOnRsp,$options:'i'};
  }
  if(query.name){
    search.name = {$regex:query.name,$options:'i'};
  }
  
  //Get our sorting + limit arguments
  var sortBy;
  if(query.sortBy){
    if(query.sortBy == "created"){
      sortBy = 'createdAt';
    }else if(query.sortBy == "updated"){
      sortBy = 'updatedAt';
    }
  }
  var ascDesc = "desc";
  if(typeof query.asc !== 'undefined'){
    ascDesc = "asc";
  }
  var limit;
  if(query.limit){
    limit = query.limit;
  }

  if(typeof query.authorizedOnly !== 'undefined'){
    System.find({members:query.authorizedOnly ? query.authorizedOnly : req.decoded},function(err,docs){
      if(err){
        handleError(err,rsp,500);
      }else{
        var suts = [];
        docs.forEach(function(doc){
          suts.push(doc.name);
        });
        search['sut.name'] = {$in:suts};
        performQuery();
      }
    });
  }else{
    performQuery();
  }
  //Perform search
  function performQuery(){
    var mongooseQuery = Service.find(search);
    if(sortBy){
      var sort = {};
      sort[sortBy] = ascDesc;
      mongooseQuery.sort(sort);
    }
    if(limit){
      mongooseQuery.limit(parseInt(limit));
    }
    mongooseQuery.exec(function(err,docs){
      var results = [];

      if(err){
        handleError(err,rsp,500);
      }
      else{
        //Trim down service and add it to list of services to return
        docs.forEach(function(doc){
          var service = trimServiceAndFilterRRPairs(doc,searchOnReq,searchOnRsp);
          results.push(service);
        });
        
      
        //Query MQServices
        if(search['rrpairs.resDataString']){
          search['rrpairs.resData'] = search['rrpairs.resDataString'];
          delete search['rrpairs.resDataString'];
        }
        if(search['rrpairs.reqDataString']){
          search['rrpairs.reqData'] = search['rrpairs.reqDataString'];
          delete search['rrpairs.reqDataString'];
        }
        var MQQuery = MQService.find(search);
        if(sortBy){
        var sort = {};
        sort[sortBy] = ascDesc;
        MQQuery.sort(sort);
        }
        if(limit){
          MQQuery.limit(parseInt(limit));
        }
        MQQuery.exec(function(err,docs){
          if(err){
            handleError(err,rsp,500);
          }
          else{

            //Trim down service and add it to list of services to return
            docs.forEach(function(doc){
              var service = trimServiceAndFilterRRPairs(doc,searchOnReq,searchOnRsp);
              results.push(service);
            });

            //Sort the combined docs
            if(sortBy){
              results.sort(function(a,b){
                var ascM = ascDesc == "desc" ? -1 : 1;
                if(sortBy == "createdAt"){
                  a = new Date(a.createdAt);
                  b = new Date(b.createdAt);
                }else{
                  a = new Date(a.updatedAt);
                  b = new Date(b.updatedAt);
                }
                return (a - b) * ascM; 
              });
            } 

            //Trim to limit
            if(limit)
              results = results.slice(0,limit);
            
            return rsp.json(results);
          }
        });
        
      }
    });
  }
}



function getServiceById(req, res) {
  // call find by id function for db
  Service.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

      if (service) {
        return res.json(service);
      }
      else {
        MQService.findById(req.params.id, function(error, mqService) {
          if (error)	{
            handleError(error, res, 500);
            return;
          }

          return res.json(mqService);
        });
      }
  });
}

function getArchiveServiceInfo(req, res) {
  // call find by id of service or mqservice function for db
  const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
  Archive.find(query, function (err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

      if (services && services.length) {
        return res.json(services[0]);
      }else{
        handleError({error:"Archive service not found"},res,404);
      }
  });
}

function getDraftServiceById(req, res) {
  // call find by id of service or mqservice function for db
  const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
  DraftService.find(query, function (err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

      if (services) {
        return res.json(services[0]);
      }
  });
}

function getServicesByUser(req, res) {
  let allServices = [];

  const query = { 'user.uid': req.params.uid };

  Service.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;

    MQService.find(query, function(error, mqServices) {
      if (error)	{
        handleError(error, res, 500);
        return;
      }

      if (mqServices.length) {
        allServices = allServices.concat(mqServices);
      }

      return res.json(allServices);
    });
  });
}

function getArchiveServicesByUser(req, res) {
  let allServices = [];
  const query = { $or: [ { 'service.user.uid': req.params.uid }, { 'mqservice.user.uid': req.params.uid } ] };
  Archive.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    allServices = services;
    return res.json(allServices);
  });
}

function getDraftServicesByUser(req, res) {
  let allServices = [];
  const query = { $or: [ { 'service.user.uid': req.params.uid }, { 'mqservice.user.uid': req.params.uid } ] };
  DraftService.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    allServices = services;
    return res.json(allServices);
  });
}

function getServicesBySystem(req, res) {
  let allServices = [];

  const query = { 'sut.name': req.params.name };

  Service.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;

    MQService.find(query, function(error, mqServices) {
      if (error)	{
        handleError(error, res, 500);
        return;
      }

      if (mqServices.length) {
        allServices = allServices.concat(mqServices);
      }

      return res.json(allServices);
    });
  });
}

function getServicesArchiveBySystem(req, res) {
  let allServices = [];

  const query = { $or: [ { 'service.sut.name': req.params.name }, { 'mqservice.sut.name': req.params.name } ] };
console.log(query);
  Archive.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;
    return res.json(allServices);
  });
}

function getServicesDraftBySystem(req, res) {
  let allServices = [];

  const query = { $or: [ { 'service.sut.name': req.params.name }, { 'mqservice.sut.name': req.params.name } ] };

  DraftService.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;
    return res.json(allServices);
  });
}

function getServicesByQuery(req, res) {
  const query = {};

  const sut  = req.query.sut;
  const user = req.query.user;

  if (sut) query['sut.name']  = sut;
  if (user) query['user.uid'] = user;

  // call find function with queries
  let allServices = [];
  Service.find(query, function(err, services)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      allServices = services;

      MQService.find(query, function(error, mqServices) {
        if (error)	{
          handleError(error, res, 500);
          return;
        }
  
        if (mqServices.length) {
          allServices = allServices.concat(mqServices);
        }

        return res.json(allServices);
      });
  });
}

function getArchiveServices(req, res) {
 //const query = {};

 const sut  = req.query.sut;
 const user = req.query.user;

  const query = { $and :[ {$or: [ { 'service.sut.name': sut }, { 'mqservice.sut.name': sut }] },{$or : [{ 'service.user.uid': user }, 
           { 'mqservice.user.uid': user } ]}] };

 Archive.find(query, function(err, services)	{
     if (err)	{
       handleError(err, res, 500);
       return;
     }
     return res.json(services);
 });
}

function getDraftServices(req, res) {
 // const query = {};
  
  const sut  = req.query.sut;
  const user = req.query.user;

  const query = { $and :[ {$or: [ { 'service.sut.name': sut }, { 'mqservice.sut.name': sut }] },{$or : [{ 'service.user.uid': user }, 
            { 'mqservice.user.uid': user } ]}] };

  DraftService.find(query, function(err, services)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }
      return res.json(services);
  });
}

// function to check for duplicate service & twoSeviceDiffNameSameBasePath
function searchDuplicate(service, next) {
  const query2ServDiffNmSmBP = {
    name: { $ne: service.name },
    basePath: service.basePath
  };

  const dupCheckQuery = {
    name: service.name,
    basePath: service.basePath
  };

  Service.findOne(query2ServDiffNmSmBP, function (err, diffNmSameBP) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    else if (diffNmSameBP)
      next({ twoServDiffNmSmBP: true });
    else {
      Service.findOne(dupCheckQuery, function (err, duplicate) {
        if (err) {
          handleError(err, res, 500);
          return;
        }
        next(duplicate);
      });
    }
  });
}
 
// returns a stripped-down version on the rrpair for logical comparison
function stripRRPair(rrpair) {
  return {
    verb: rrpair.verb || '',
    path: rrpair.path || '',
    payloadType: rrpair.payloadType || '',
    queries: rrpair.queries || {},
    reqHeaders: rrpair.reqHeaders || {},
    reqData: rrpair.reqData || {},
    resStatus: rrpair.resStatus || 200,
    resHeaders: rrpair.resHeaders || {},
    resData: rrpair.resData || {}
  };
}

// function to merge req / res pairs of duplicate services
function mergeRRPairs(original, second) {
    for (let rrpair2 of second.rrpairs) {
    let hasAlready = false;
    let rr2 = stripRRPair(new RRPair(rrpair2));

    for (let rrpair1 of original.rrpairs) {
      let rr1 = stripRRPair(rrpair1);

      if (deepEquals(rr1, rr2)) {
        hasAlready = true;
        break;
      }
    }

    // only add RR pairs that original doesn't have already
    if (!hasAlready) {
      original.rrpairs.push(rrpair2);
    }
  }
}

// propagate changes to all threads
function syncWorkers(service, action) {
  const msg = {
    action: action,
    service: service
  };

  manager.messageAll(msg)
    .then(function(workerIds) {
      virtual.deregisterService(service);
      invoke.deregisterServiceInvoke(service);

      if (action === 'register') {
        virtual.registerService(service);
        if(service.liveInvocation && service.liveInvocation.enabled){
          invoke.registerServiceInvoke(service);
        }
      }
      else {
        Service.findOneAndRemove({_id : service._id }, function(err)	{
          if (err) debug(err);
          //debug(service);
        });
      }
    })
    .catch(function (err) {
      debug(err);
    });
}

function addService(req, res) {
  /* validating sut here because code doesn't reach to mongoose validation check. we are using sut.name to calculate base path before mongoose 
   validations. even if sut present but name or members not present in req data. unautorize error message is thrown which is not correct.*/
   if (!req.body.sut || !req.body.sut.name){
    handleError(constants.REQUIRED_SUT_PARAMS_ERR, res, 400);
    return;
  }

  /* This check is mandatory for basePath validation because basePath is created using groupName. so mongoose validation will
   not throw an error. This is the case when user may forget to put mandatory field 'basePath' in request for REST/SOAP type service.*/
  if (!req.body.basePath && (req.body.type === 'REST' || req.body.type === 'SOAP')){
    handleError(constants.REQUIRED_BASEPATH_ERR, res, 400);
    return;
  }

  const type = req.body.type;
  let serv  = {
    sut: req.body.sut,
    user: req.decoded,
    name: req.body.name,
    type: req.body.type,
    delay: req.body.delay,
    delayMax: req.body.delayMax,
    basePath: '/' + req.body.sut.name + req.body.basePath,
    matchTemplates: req.body.matchTemplates,
    rrpairs: req.body.rrpairs
  };

  //Save req and res data string cache
  if(serv.rrpairs){
    serv.rrpairs.forEach(function(rrpair){
      if(rrpair.reqData)
        rrpair.reqDataString = typeof rrpair.reqData == "string" ? rrpair.reqData : JSON.stringify(rrpair.reqData);
      if(rrpair.resData)
        rrpair.resDataString = typeof rrpair.resData == "string" ? rrpair.resData : JSON.stringify(rrpair.resData);
    });
  }

  if(req.body.liveInvocation){
    serv.liveInvocation = req.body.liveInvocation;
  }

  if (type === 'MQ') {
    serv.connInfo = req.body.connInfo;
    
    createService(serv,req).then(
      function(service){
        res.json(service);
      },
      // handler for db call
      function(err) {
        if (err) {
        handleBackEndValidationsAndErrors(err, res);
        return;
      }
        // respond with the newly created resource
       
    });
  }
  else {
    serv.delay = req.body.delay;
    serv.basePath =  '/' + req.body.sut.name + req.body.basePath;

    searchDuplicate(serv, function(duplicate) {
      if (duplicate && duplicate.twoServDiffNmSmBP){
        handleError(constants.SERVICES_DIFFNAME_SAMEBASEPATH_ERR, res, 400);
        return;
      }
      else if (duplicate) {
        //only merge if both service type is same othwise throw error 409.
        if(duplicate.type == serv.type){
          if(!serv.rrpairs){
            handleError(constants.REQUST_NO_RRPAIR, res, 400);
            return;
          }
          // merge services
          mergeRRPairs(duplicate, serv);
          // save merged service
          duplicate.save(function(err, newService) {
            if (err) {
            handleBackEndValidationsAndErrors(err, res);
            return;
          }
            res.json(newService);
            syncWorkers(newService, 'register');
          });
        }else{
          handleError(constants.DIFF_TYPE_SERV_ERR, res, 409);
          return;
        }
      }
      else {
        createService(serv, req).then(
          function (service) {
            res.json(service);

            syncWorkers(service, 'register');
          }, function (err) {
            handleBackEndValidationsAndErrors(err, res);
            return;
          }
        );
      }
    });
  }
}

/**
 * This function handle mongoose validation Errors or any other error at backend.
 * @param {*} err err Object contains error from backEnd.
 * @param {*} res response Object required to send response error code.
 * @returns blank to stop further processing and sends 400(bad request from mongoose validations) or 500(internal error) to clients.
 */
/* To Do:- This below function is used in both serviceController and recorderController. We 
           should keep this functiona at common place and should be call from ther at both places. */
function handleBackEndValidationsAndErrors(err, res) {
  {
    switch (err.name) {
      case 'ValidationError':
      LOOP1:
        for (let field in err.errors) {
          switch (err.errors[field].kind) {
            case 'required':
              handleError(err.errors[field].message, res, 400);
              break LOOP1;
            case 'user defined':
            handleError(err.errors[field].message, res, 400);
            break LOOP1;
            case 'enum':
            handleError(err.errors[field].message, res, 400);
            break LOOP1;
            case 'Number':
            handleError(err.errors[field].message, res, 400);
            break LOOP1;
            default:
            handleError(err.errors[field].message, res, 400);
            break LOOP1;
          }
        }
        break;
      default:
        handleError(err, res, 500);
    }
    return;
  }
}

function addServiceAsDraft(req, res) {
  const type = req.body.type;

  let serv  = {
    sut: req.body.sut,
    user: req.decoded,
    name: req.body.name,
    type: req.body.type,
    delay: req.body.delay,
    delayMax: req.body.delayMax,
    basePath: '/' + req.body.sut.name + req.body.basePath,
    matchTemplates: req.body.matchTemplates,
    rrpairs: req.body.rrpairs,
    lastUpdateUser: req.decoded,
    txnCount: false,
    running: false
  };

  //Save req and res data string cache
  if(serv.rrpairs){
    serv.rrpairs.forEach(function(rrpair){
      if(rrpair.reqData)
        rrpair.reqDataString = typeof rrpair.reqData == "string" ? rrpair.reqData : JSON.stringify(rrpair.reqData);
      if(rrpair.resData)
        rrpair.resDataString = typeof rrpair.resData == "string" ? rrpair.resData : JSON.stringify(rrpair.resData);
    });
  }

  if(req.body.liveInvocation){
    serv.liveInvocation = req.body.liveInvocation;
  }

  if (type === 'MQ') {
    serv.connInfo = req.body.connInfo;
    let draftservice = {mqservice:serv};
    DraftService.create(draftservice, function(err, service) {
        if (err) {
          handleError(err, res, 500);
          return;
        }
        // respond with the newly created resource
        res.json(service);
    });
  }
  else {
    serv.delay = req.body.delay;
    serv.basePath =  '/' + req.body.sut.name + req.body.basePath;
   
    let draftservice = {service: serv};
    DraftService.create(draftservice, function(err, service) {
      if (err) {
        handleError(err, res, 500);
        return;
      }
      res.json(service);
    });
  }  
}


function updateService(req, res) {
  const type = req.body.type;
  const BaseService = (type === 'MQ') ? MQService : Service;

  // find service by ID and update
  BaseService.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    // don't let consumer alter name, base path, etc.

    if(service){
      service.rrpairs = req.body.rrpairs;
      service.lastUpdateUser = req.decoded;

      //Cache string of reqData + rspData
      if(service.rrpairs){
        service.rrpairs.forEach(function(rrpair){
          if(rrpair.reqData)
            rrpair.reqDataString = typeof rrpair.reqData == "string" ? rrpair.reqData : JSON.stringify(rrpair.reqData);
          if(rrpair.resData)
            rrpair.resDataString = typeof rrpair.resData == "string" ? rrpair.resData : JSON.stringify(rrpair.resData);
        });
      }
      if(req.body.liveInvocation){
        if(service.liveInvocation && service.liveInvocation.recordedRRPairs){
          req.body.liveInvocation.recordedRRPairs = service.liveInvocation.recordedRRPairs;
        }
        service.liveInvocation = req.body.liveInvocation;
      }
      if (req.body.matchTemplates) {
        service.matchTemplates = req.body.matchTemplates;
      }
      
      if (service.type !== 'MQ') {
        const delay = req.body.delay;
        if (delay || delay === 0) {
          service.delay = req.body.delay;
        }

        const delayMax = req.body.delayMax;
        if (delayMax || delayMax === 0) {
          service.delayMax = req.body.delayMax;
        }
      }

      // save updated service in DB
      service.save(function (err, newService) {
        if (err) {
          handleBackEndValidationsAndErrors(err, res);
          return;
        }

        res.json(newService);
        if (service.type !== 'MQ') {
          syncWorkers(newService, 'register');
        }
      });
    }else{
      const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
      DraftService.findOneAndRemove(query, function(err, draftservice){
        if (err)	{
          handleError(err, res, 500);
          return;
        }
        if(draftservice.service){
          var reg = new RegExp("/" + draftservice.service.sut.name,"i");
          var basePath = draftservice.service.basePath.replace(reg,"");
          req.body.basePath = basePath;
        }
        addService(req, res);         
                 
      });
    }
  });
}


    function updateServiceAsDraft(req, res) {
      const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
      DraftService.findOne(query, function(err, draftservice)	{
        if (err)	{
          handleError(err, res, 500);
          return;
        }

        if(draftservice.service){
          // don't let consumer alter name, base path, etc.
          draftservice.service.rrpairs = req.body.rrpairs;
          draftservice.service.lastUpdateUser = req.decoded;

          //Cache string of reqData + rspData
          if(draftservice.service.rrpairs){
            draftservice.service.rrpairs.forEach(function(rrpair){
              if(rrpair.reqData)
                rrpair.reqDataString = typeof rrpair.reqData == "string" ? rrpair.reqData : JSON.stringify(rrpair.reqData);
              if(rrpair.resData)
                rrpair.resDataString = typeof rrpair.resData == "string" ? rrpair.resData : JSON.stringify(rrpair.resData);
            });
          }
          if(req.body.liveInvocation){
            draftservice.service.liveInvocation = req.body.liveInvocation;
          }
          if (req.body.matchTemplates) {
            draftservice.service.matchTemplates = req.body.matchTemplates;
          }
          
          const delay = req.body.delay;
          if (delay || delay === 0) {
            draftservice.service.delay = req.body.delay;
          }

          const delayMax = req.body.delayMax;
          if (delayMax || delayMax === 0) {
            draftservice.service.delayMax = req.body.delayMax;
          }
          
        }else {
          draftservice.mqservice.rrpairs = req.body.rrpairs;
          draftservice.mqservice.lastUpdateUser = req.decoded;

          //Cache string of reqData + rspData
          if(draftservice.mqservice.rrpairs){
            draftservice.mqservice.rrpairs.forEach(function(rrpair){
              if(rrpair.reqData)
                rrpair.reqDataString = typeof rrpair.reqData == "string" ? rrpair.reqData : JSON.stringify(rrpair.reqData);
              if(rrpair.resData)
                rrpair.resDataString = typeof rrpair.resData == "string" ? rrpair.resData : JSON.stringify(rrpair.resData);
            });
          }
          if(req.body.liveInvocation){
            draftservice.mqservice.liveInvocation = req.body.liveInvocation;
          }
          if (req.body.matchTemplates) {
            draftservice.mqservice.matchTemplates = req.body.matchTemplates;
          }       
        
        }

        // save updated service in DB
        draftservice.save(function (err, newService) {
          if (err) {
            handleError(err, res, 500);
            return;
          }
          res.json(newService);         
        });
      });
    }

function toggleService(req, res) {
  Service.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    if (service) {
      // flip the bit & save in DB
      service.running = !service.running;
      service.lastUpdateUser = req.decoded;
      service.save(function(e, newService) {
        if (e)	{
          handleError(e, res, 500);
          return;
        }

        res.json({'message': 'toggled', 'service': newService });
        syncWorkers(newService, 'register');
      });
    }
    else {
      MQService.findById(req.params.id, function(error, mqService) {
        if (error)	{
          handleError(error, res, 500);
          return;
        }

        mqService.running = !mqService.running;
        mqService.save(function(e2, mqService) {
          if (e2)	{
            handleError(e2, res, 500);
            return;
          }

          res.json({'message': 'toggled', 'service': mqService });
        });
      });
    }
  });
}

function deleteService(req, res) {
  Service.findById(req.params.id, function(err, service)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }
    
    if (service) {
      service.txnCount=0;
      service.running=false;
      let archive  = {service:service};
      Archive.create(archive, function (err, callback) {
        if (err) {
          handleError(err, res, 500);
        }
      });

      service.remove(function(e, oldService) {
        if (e)	{
          handleError(e, res, 500);
          return;
        }

        res.json({ 'message' : 'deleted', 'id' : oldService._id });
        syncWorkers(oldService, 'delete');
      });
    }
    else {
      MQService.findOneAndRemove({ _id: req.params.id }, function(error, mqService) {
        if (error) debug(error);
        if(mqService){
          mqService.running=false;
          let archive  = {mqservice:mqService};
          Archive.create(archive, function (err, callback) {
            if (err) {
              handleError(err, res, 500);
            }
          });
          res.json({ 'message' : 'deleted', 'id' : mqService._id });
        }else{
          handleError({error:"Service not found"},res,404);
        }
      });
    }
  });
}

function restoreService(req, res) {
  const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
  Archive.findOneAndRemove(query, function(err, archive)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }
    if (archive.service) {
      let newService  = {
        _id:archive.service._id,
        sut: archive.service.sut,
        user: archive.service.user,
        name: archive.service.name,
        type: archive.service.type,
        delay: archive.service.delay,
        delayMax: archive.service.delayMax,
        basePath: archive.service.basePath,
        txnCount: 0,
        running: false,
        matchTemplates: archive.service.matchTemplates,
        rrpairs: archive.service.rrpairs,
        lastUpdateUser: archive.service.lastUpdateUser
      };
      createService(newService,req).then(function(service){},
        function (err) {
        if (err) {
          handleError(err, res, 500);
        }
      });
      res.json({ 'message' : 'restored', 'id' : archive.service._id });
    }
    else {
        let newMQService  = {
          sut: archive.mqservice.sut,
          user: archive.mqservice.user,
          name: archive.mqservice.name,
          type: archive.mqservice.type,
          running: false,
          matchTemplates: archive.mqservice.matchTemplates,
          rrpairs: archive.mqservice.rrpairs,
          connInfo: archive.mqservice.connInfo
        };
        createService(newMQService,req).then( function(serv) {},function (err) {
          if (err) {
            handleError(err, res, 500);
          }
        });
        res.json({ 'message' : 'restored', 'id' : archive.mqservice._id });
    }
  });
}


// get spec from url or local filesystem path
function getSpecString(path) {
  return new Promise(function (resolve, reject) {
    if (path.includes('http')) {
      request(path, function (err, resp, data) {
        if (err) return reject(err);
        return resolve(data);
      });
    }
    else {
      fs.readFile(path, 'utf8', function (err, data) {
        if (err) return reject(err);
        return resolve(data);
      });
    }
  });

}

function isYaml(req) {
  const url = req.query.url;
  if (url) {
    if (url.endsWith('.yml') || url.endsWith('.yaml'))
      return true;
  }
  if (req.query.uploaded_file_name!="") {
    const name = req.query.uploaded_file_name;
    if (name.endsWith('.yml') || name.endsWith('.yaml')) {
      return true;
    }
  }
  return false;
}

function zipUploadAndExtract(req, res) {
  let extractZip = function () {
    return new Promise(function (resolve, reject) {
      fs.createReadStream(req.file.path).pipe(unzip.Extract({ path: './uploads/RRPair/' + req.decoded.uid + '_' + req.file.filename + '_' + req.file.originalname }));
      resolve('_' + req.file.filename + '_' + req.file.originalname);
    });
  }
  extractZip().then(function (message) {
    res.json(message);
  }).catch(function (err) {
    debug(err);
    handleError(err, res, 400);
  });
}

function specUpload(req, res) {
  let uploadSpec = function () {
    return new Promise(function (resolve, reject) {
      resolve(req.file.filename);
    });
  };

  uploadSpec().then(function (message) {
  res.json(message);
  }).catch(function (err) {
    debug(err);
    handleError(err, res, 400);
  });
}

function publishExtractedRRPairs(req, res) {
  const type = req.query.type;
  const base = req.query.url;
  const name = req.query.name;
  const sut = { name: req.query.group };
  rrpair.parse('./uploads/RRPair/' + req.decoded.uid + req.query.uploaded_file_name_id, type).then(onSuccess).catch(onError);

  function onSuccess(serv) {
    serv.sut = sut;
    serv.name = name;
    serv.type = type;
    serv.basePath = '/' + serv.sut.name +'/'+ base;
    serv.user = req.decoded;

    if (type === 'MQ') {      
      createService(serv,req).then(
        function(service){
          res.json(service);
        },
        // handler for db call
        function(err) {
          if (err) {
            handleBackEndValidationsAndErrors(err, res);
            return;
          }
          // respond with the newly created resource
         
      });
    }
    else {
      searchDuplicate(serv, function(duplicate) {
        if (duplicate && duplicate.twoServDiffNmSmBP){
          handleError(constants.SERVICES_DIFFNAME_SAMEBASEPATH_ERR, res, 400);
          return;
        }
        else if (duplicate) {
          //only merge if both service type is same othwise do nothing.
        if(duplicate.type == serv.type){ 
          if(!serv.rrpairs){
            handleError(constants.REQUST_NO_RRPAIR, res, 400);
            return;
          }
          // merge services
          mergeRRPairs(duplicate, serv);
          // save merged service
          duplicate.save(function(err, newService) {
            if (err) {
              handleBackEndValidationsAndErrors(err, res);
              return;
            }
            res.json(newService);
            syncWorkers(newService, 'register');
          });
        }else{
          handleError(constants.DIFF_TYPE_SERV_ERR, res, 400);
          return;
        }
      }
        else {
          createService(serv,req).then( 
            function(service){
              res.json(service);
              syncWorkers(service , 'register');
            },
            function (err, service) {
            if (err) {
              handleBackEndValidationsAndErrors(err, res);
              return;
            }
          });
        }
      });
    }
  }
  function onError(err) {
    debug(err);
    handleError(err.message, res, 400);
  }
}


function publishUploadedSpec(req, res) {
  const type = req.query.type;
  const name = req.query.name;
  const base = req.query.base;
  const url  = req.query.url;
  const sut  = { name: req.query.group };
  const filePath = './uploads/'+req.query.uploaded_file_id;
  const specPath = url || filePath;

  switch (type) {
    case 'wsdl':
      createFromWSDL(specPath).then(onSuccess).catch(onError);
      break;
    case 'openapi':
      const specPromise = getSpecString(specPath);
      specPromise.then(function (specStr) {
        let spec;
        try {
          if (isYaml(req)) {
            spec = YAML.parse(specStr);
          }
          else {
            spec = JSON.parse(specStr);
          }
        }
        catch (e) {
          debug(e);
          return handleError('Error parsing OpenAPI spec', res, 400);
        }

        createFromOpenAPI(spec).then(onSuccess).catch(onError);

      }).catch(onError);
      break;
    default:
      return handleError(`API specification type ${type} is not supported`, res, 400);
  }

  function onSuccess(serv) {
    // set group, basePath, and owner
    serv.sut = sut;
    serv.name = name;

    if (base) serv.basePath = base;
    serv.basePath = '/' + serv.sut.name + serv.basePath;
    
    serv.user = req.decoded;
    serv.lastUpdateUser = req.decoded;

    searchDuplicate(serv, function(duplicate) {
      if (duplicate && duplicate.twoServDiffNmSmBP){
        handleError(constants.SERVICES_DIFFNAME_SAMEBASEPATH_ERR, res, 400);
        return;
      }
      else if (duplicate) {
        //only merge if both service type is same othwise do nothing.
        if(duplicate.type == serv.type){ 
          if(!serv.rrpairs){
            handleError(constants.REQUST_NO_RRPAIR, res, 400);
            return;
          }
        // merge services
        mergeRRPairs(duplicate, serv);
        // save merged service
        duplicate.save(function(err, newService) {
          if (err) {
            handleBackEndValidationsAndErrors(err, res);
            return;
          }
          res.json(newService);
          syncWorkers(newService, 'register');  
        });
      }else{
        handleError(constants.DIFF_TYPE_SERV_ERR, res, 400);
        return;
      }
    }
      else {
        createService(serv,req).then( function(service){
          res.json(service);
          syncWorkers(service, 'register');
        },function (err) {
          if (err) {
            handleBackEndValidationsAndErrors(err, res);
            return;
          }
        });
      }
    });

    // save the service
   
  }

  function onError(err) {
    debug(err);
    handleError(err, res, 400);
  }
}

function createFromWSDL(file) {
  return wsdl.parse(file);
}

function createFromOpenAPI(spec) {
  return oas.parse(spec);
}

//Permanenet delete from Archieve. Not required right now.
function permanentDeleteService(req, res) {
  // call find by id of service or mqservice function for db
  const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
  Archive.findOneAndRemove(query, function (err, archive) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    if(archive && archive.service) res.json({ 'message' : 'deleted', 'id' : archive.service._id });
    else if(archive && archive.mqservice) res.json({ 'message' : 'deleted', 'id' : archive.mqservice._id });
    else{
      handleError({error:"Archive service not found"},res,404);
    }
  });
}

//Delete from DraftService
function deleteDraftService(req, res) {
  // call find by id of service or mqservice function for db
  const query = { $or: [ { 'service._id': req.params.id }, { 'mqservice._id': req.params.id } ] };
  DraftService.findOneAndRemove(query, function (err, draft) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    if(draft && draft.service) res.json({ 'message' : 'deleted', 'id' : draft.service._id });
    else if(draft && draft.mqservice) res.json({ 'message' : 'deleted', 'id' : draft.mqservice._id });
    else{
      handleError({error:"Draft service not found"},res,404);
    }
  });
}



/**
 * API Call to delete a specific recorded RR pair from liveInvocation
 * @param {*} req Express req 
 * @param {*} res Express rsp
 */
function deleteRecordedRRPair(req,res){
  var serviceId = req.params.id;
  var rrPairId = req.params.rrpairId;
  canUserEditServiceById(req.decoded,serviceId).then((bool)=>{
    Service.findOneAndUpdate({_id:serviceId},{$pull:{"liveInvocation.recordedRRPairs":{_id:rrPairId}}},function(err,doc){
      if(err)
        handleError(err,res,500);
      else
        res.json(doc);

    });
  },(err)=>{
    handleError(err,res,500);
  });

}

/**
 * API call to get just the recorded RR pairs from a service
 * @param {*} req express req
 * @param {*} res express rsp
 */
function getServiceRecordedRRPairs(req,res){
  var serviceId = req.params.id;
  Service.findById(serviceId).select("liveInvocation.recordedRRPairs").exec(function(err,doc){
    if(err)
      handleError(err,res,500);
    else
      res.json(doc);
  });
}

/**
 * API call to take one recorded pair and merge it into RRPairs with no edit
 * @param {*} req express req
 * @param {*} res express rsp
 */
function mergeRecordedRRPair(req,res){
  var serviceId = req.params.id;
  var rrPairId = req.params.rrpairId;
  canUserEditServiceById(req.decoded,serviceId).then((bool)=>{
    Service.findOne({_id:serviceId,'liveInvocation.recordedRRPairs':{$elemMatch:{_id:rrPairId}}}).exec(function(err,doc){
      if(err){
        handleError(err,res,500);
      }else if(doc){
        for(let i = 0; i < doc.liveInvocation.recordedRRPairs.length; i++){
          var rrpair = doc.liveInvocation.recordedRRPairs[i];
          if(rrpair._id == rrPairId){
            var rrPairWrapper = {rrpairs:[rrpair]};
            mergeRRPairs(doc,rrPairWrapper);
            doc.liveInvocation.recordedRRPairs.splice(i,1);
            doc.save(function(err,newDoc){
              res.json(newDoc);
              syncWorkers(newDoc, 'register');
            });
            break;
          }
        }
      }else{
        res.status(404);
        res.json({});
      }
    });
  },(err)=>{
    handleError(err,res,500);
  });
}

/**
 * API call to add an RRPair to a service
 * @param {*} req express req
 * @param {*} res express rsp
 */
function addRRPair(req,res){
  var serviceId = req.params.id;
  canUserEditServiceById(req.decoded,serviceId).then((bool)=>{
    var rrPair = req.body;
    Service.findById(serviceId,function(err,doc){
      if(err)
        handleError(err,res,500);
      else if(doc){
        mergeRRPairs(doc,{rrpairs:[rrPair]});
        doc.save(function(err,newDoc){
          if(err){
            handleError(err,res,500);
          }else{
            res.json(newDoc);
          }
        })
      }else{
        res.status(404);
        res.end();
      }
    });

  },(err)=>{
    if(err == "No Service Found")
      handleError(err,res,404);
    else
      handleError(err,res,401);
  });
}


module.exports = {
  getServiceById: getServiceById,
  getArchiveServiceInfo: getArchiveServiceInfo,
  getServicesByUser: getServicesByUser,
  getServicesBySystem: getServicesBySystem,
  getServicesByQuery: getServicesByQuery,
  getArchiveServices: getArchiveServices,
  getServicesArchiveBySystem: getServicesArchiveBySystem,
  getArchiveServicesByUser: getArchiveServicesByUser,
  addService: addService,
  updateService: updateService,
  toggleService: toggleService,
  deleteService: deleteService,
  zipUploadAndExtract: zipUploadAndExtract,
  publishExtractedRRPairs: publishExtractedRRPairs,
  specUpload: specUpload,
  publishUploadedSpec: publishUploadedSpec,
  permanentDeleteService: permanentDeleteService,
  restoreService: restoreService,
  searchServices:searchServices,
  getDraftServiceById: getDraftServiceById,
  getDraftServices: getDraftServices,
  getServicesDraftBySystem: getServicesDraftBySystem,
  deleteDraftService: deleteDraftService,
  getDraftServicesByUser: getDraftServicesByUser,
  addServiceAsDraft: addServiceAsDraft,
  updateServiceAsDraft: updateServiceAsDraft,
  deleteRecordedRRPair: deleteRecordedRRPair,
  canUserEditServiceById: canUserEditServiceById,
  getServiceRecordedRRPairs: getServiceRecordedRRPairs,
  mergeRecordedRRPair: mergeRecordedRRPair,
  addRRPair: addRRPair
};


