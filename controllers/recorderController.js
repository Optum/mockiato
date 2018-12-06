const RRPair = require('../models/http/RRPair');
const Service = require('../models/http/Service');
const requestNode = require('request');

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

     this.sut = sut;
     this.remoteHost = remoteHost;
     this.protocol = protocol || 'REST';
     this.datatype = datatype || 'JSON';
     this.remotePort = remotePort || 80;
     this.headerMask = headerMask || ['Content-Type'];
     this.myService = new Service();
     this.myService.basePath = "/" + this.sut + path;
     if(!(this.headerMask['Content-Type']))
        this.headerMask.push('Content-Type');
 };


 /**
  * Event handler for incoming recording requests. Saves incoming request, then forwards to configured host.
  * Then records host's response, and forwards response to user. 
  */
 Recorder.prototype.incomingRequest = function(req,rsp,next){
    
    console.log(req);

    //Start contructing RRPair, pull info we can from just request side before we forward the request
    var myRRPair = new RRPair();
    myRRPair.verb = req.method;
    myRRPair.reqData = req.body;
    myRRPair.queries = req.query;

    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + "/" + this.sut + this.path;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(fullBasePath,"");
    if(diff == "/")
        diff = "";
    if(diff)
        myRRPair.path = diff;

    //Go through header mask and include headers specified
    if(this.headerMask){
        myRRPair.reqHeaders = {};
        this.headerMask.forEach(function(headerName){
            myRRPair.reqHeaders[headerName] = req.get(headerName);

        });
    }

    //Start creating req options
    var options = {}
    //Create full URL to remote host
    options.url = (req.secure ? "https" : "http") + "://" + this.remoteHost + ":" + this.remotePort + this.path + diff;
    options.method = req.method;
    options.headers = req.headers;
    if(req._body) options.body = req.body;

    //Handle JSON parsed body
    if(typeof options.body != "string")
        options.body = JSON.stringify(options.body);
    
    requestNode(options,function(err,remoteRsp,remoteBody){
        if(err) console.log(err);
        console.log(remoteRsp);
        console.log(remoteBody);
    });
    
    console.log(options);




   next();

};

 module.exports = {
    Recorder: Recorder
  };
  
