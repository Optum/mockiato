const RRPair = require('../models/http/RRPair');
const InactiveService = require('../models/http/InactiveService');
const requestNode = require('request');
const Recording = require('../models/http/Recording');


 /**
  * Recorder object
  *
  * This object is created whenever a new recording session is started. the recording router will route all appropriate transactions to this object 
  */
var Recorder = function(path,sut,remoteHost,remotePort,protocol,datatype,headerMask){
     this.path = path;
     
     //Ensure path starts with /
    if(this.path.substring(0,1) != "/")
        this.path = "/" + this.path;    
    
    var serv = InactiveService.create({ basePath : "/" + sut + path },(function(err,newServ){
        this.model = Recording.create({
            sut : sut,
            path : path,
            remoteHost : remoteHost,
            protocol : protocol || 'REST',
            payloadType : datatype || 'JSON',
            remotePort : remotePort || 80,
            headerMask : headerMask || ['Content-Type'],
            service : newServ
        },(function(err,newModel){
            this.model = newModel;
            if(!(this.model.headerMask['Content-Type']))
                this.model.headerMask.push('Content-Type');

                this.model.save(function(err){
                    if(err) console.log(err);
                });
        }).bind(this));
    }).bind(this));
   

    
    
    
 
     

    
 };


 /**
  * Event handler for incoming recording requests. Saves incoming request, then forwards to configured host.
  * Then records host's response, and forwards response to user. 
  */
 Recorder.prototype.incomingRequest = function(req,rsp,next){
    
    console.log(req);

    //Start contructing RRPair, pull info we can from just request side before we forward the request
    var myRRPair = {}
    myRRPair.verb = req.method;
    myRRPair.reqData = req.body;
    myRRPair.queries = req.query;
    myRRPair.payloadType = this.model.payloadType;

    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + "/" + this.model.sut + this.model.path;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(fullBasePath,"");
    if(diff == "/")
        diff = "";
    if(diff)
        myRRPair.path = diff;

    //Go through header mask and include headers specified
    if(this.model.headerMask){
        myRRPair.reqHeaders = {};
        this.model.headerMask.forEach(function(headerName){
            myRRPair.reqHeaders[headerName] = req.get(headerName);

        });
    }

    //Start creating req options
    var options = {}
    //Create full URL to remote host
    options.url = (req.secure ? "https" : "http") + "://" + this.model.remoteHost + ":" + this.model.remotePort + this.model.path + diff;
    options.method = req.method;
    options.headers = req.headers;
    if(req._body) options.body = req.body;

    //Handle JSON parsed body
    if(typeof options.body != "string")
        options.body = JSON.stringify(options.body);
    
    //Make request
    requestNode(options,(function(err,remoteRsp,remoteBody){
        if(err) { 
            console.log(err); 
            return; 
        }
        //Collect data for RR Pair
        myRRPair.resStatus = remoteRsp.statusCode;
        if(myRRPair.payloadType == "JSON"){
            myRRPair.resData = JSON.parse(remoteBody);
        }else{
            myRRPair.resData = remoteBody;
        }
        
        myRRPair.resHeaders = remoteRsp.headers;

        //Create RR pair model + add to service
        RRPair.create(myRRPair,(function(err,newRRPair){
            if(err){
                console.log(err);
                return;
            }
            this.model.service.rrpairs.push(newRRPair);
            this.model.save();
        }).bind(this));



    }).bind(this));
    
    console.log(options);




   next();

};

 module.exports = {
    Recorder: Recorder
  };
  
