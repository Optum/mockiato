const RRPair = require('../models/http/RRPair');
const Service = require('../models/http/Service');


 /**
  * Recorder object
  *
  * This object is created whenever a new recording session is started. the recording router will route all appropriate transactions to this object 
  */
var Recorder = function(path,sut,remoteHost,remotePort,protocol,datatype,headerMask){
     this.path = path;
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
    //onsole.log(this.myService);
    console.log(req);
    console.log(req.headers);
    //Start contructing RRPair, pull info we can from just request side before we forward the request
    var myRRPair = new RRPair();
    myRRPair.verb = req.method;
    myRRPair.reqData = req.body;

    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + "/" + this.sut + this.path;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(fullBasePath,"");
    
    if(diff)
        myRRPair.path = diff;

    //Go through header mask and include headers specified
    if(this.headerMask){
        myRRPair.reqHeaders = {};
        this.headerMask.forEach(function(headerName){
            myRRPair.reqHeaders[headerName] = req.get(headerName);

        });
    }

    console.log(myRRPair);



   next();

};

 module.exports = {
    Recorder: Recorder
  };
  
