const parser = require('http-string-parser');
const fs = require('fs')
const Service = require('../../models/http/Service');
const RRPair = require('../../models/http/RRPair');
const dir = require('node-dir');
var constants = require('../util/constants');

function parse(path, type) {
  var serv = new Service();
  return new Promise(function (resolve, reject) {
      var rr = new RRPair();
      var numberOfFiles;
      var fileCounter = 0;
      var req;
      var res;
      var restMethods = constants.ALL_REST_METHODS;
      var filesNameJson = {};
      var isMacZip=false;

      fs.readdir(path, (err, files) => {
        if (err) return reject(err);
        numberOfFiles = files.length;
        if(files.includes("__MACOSX")) {
          numberOfFiles=files.length-1;
          var index = files.indexOf('__MACOSX');
          if ( index > -1) {
            files.splice(index, 1);
          }
        }

        if (numberOfFiles % 2 !== 0)
          return reject(new Error(constants.NOT_EVEN_ERR_MSG));

          //files name, type validations.
          files.forEach( function( file, index ) {
            var onlyFileNameRegx = /(.+?)(\.[^.]*$|$)/g;
            var match = onlyFileNameRegx.exec(file);
            if(match[1].endsWith(constants.REQ_FILE_END) || match[1].endsWith(constants.RSP_FILE_END)){
                value=1;
                if(filesNameJson.hasOwnProperty(match[1].substring(0, match[1].length - 4))) value++;
                filesNameJson[match[1].substring(0, match[1].length - 4)]=value;
              }else return reject(new Error(constants.WRONG_FILE_ENDING_OR_TYPE_ERR_MSG));
          });

          for (let key in filesNameJson) {
            if(filesNameJson[key] !== 2){ 
              return reject(new Error(constants.REQ_RES_FILENAME_DIFF_ERR_MSG));
            }
          }

          //sorting the files to be sure that response files should come after each req file. while iteration & getting content
          //not sure if only sorting the files will solve this.  - Pradeep
          dir.files(path, function (err, files) {
            if (err) return reject(err);
            files.sort();
          });


          dir.readFiles(path, function (err, content, filename, next) {
            if (err) return reject(err);

            if(!filename.includes('__MACOSX')) {
                fileCounter++;

                //what's the guarantee that after req file only response file will come? Before reading these files, we have sort files in
                // directory. But still this might be an issue here later. -Pradeep
                var onlyFileNameRegx = /(.+?)(\.[^.]*$|$)/g;
                var match = onlyFileNameRegx.exec(filename);
                if (match[1].endsWith(constants.REQ_FILE_END)) {
                  req = true;
                  if(type===constants.REST){
                    var firstWord = content.substr(0, content.indexOf(constants.SPACE));
                    if(!restMethods.includes(firstWord)){
                      return reject(new Error(constants.NOT_REST_TYPE_ERR_MSG));
                    }
                  request = parser.parseRequest(content);
                  var jsonString = JSON.stringify(request);
                  obj = JSON.parse(jsonString);
                  rr.verb = obj.method;
                  rr.payloadType = constants.JSON;
                  allHeaders = obj.headers;
                  objHeader = JSON.parse(JSON.stringify(allHeaders));
                  rr.reqHeaders = objHeader;
                  var uri = obj.uri;
                  if (uri.includes(constants.QUESTION_MARK)) {
                    var getQueryString = uri.split(constants.QUESTION_MARK);
                    rr.path = getQueryString[0];
                    var seperateQueryString = getQueryString[1].split(constants.AMPERSAND);
                    var queryStringFinal = "";
                    for (let i = 0; i < seperateQueryString.length; i++) {
                      var queryString = seperateQueryString[i].split(constants.EQUAL_SIGN);
                      if (i < seperateQueryString.length - 1) {
                        queryStringFinal = queryStringFinal + "\"" + queryString[0] + "\"=\"" + queryString[1] + "\",";
                      }
                      else {
                        queryStringFinal = queryStringFinal + "\"" + queryString[0] + "\"=\"" + queryString[1] + "\"";
                      }
                    }
                    rr.queries = "{" + queryStringFinal + "}";
                  }
                  else {
                    rr.path = uri;
                  }
                  rr.reqData = JSON.parse(obj.body);
                }
                else if(type===constants.SOAP){
                      var firstWord2 = content.substr(0, content.indexOf(constants.SPACE));
                      if(firstWord2.startsWith(constants.SOAP_FILE_STARTSWITH) || firstWord2.startsWith("<soapenv:Envelope")){
                        rr.verb  = constants.POST;
                        rr.payloadType = constants.XML;
                        contentType = { 'Content-Type': 'text/xml' };
                        rr.reqHeaders = contentType;
                        rr.resHeaders = contentType;
                        rr.reqData = content;
                      }else{return reject(new Error(constants.NOT_SOAP_TYPE_ERR_MSG));}
                }
              }
    
                else if(match[1].endsWith(constants.RSP_FILE_END)){
                    res = true;
                    if(type===constants.REST){
                      var firstWord3 = content.substr(0, content.indexOf(constants.SPACE));
                      if(!firstWord3.startsWith(constants.HTTP)){
                        return reject(new Error(constants.NOT_REST_TYPE_ERR_MSG));
                      }
                    response = parser.parseResponse(content);
                    var jsonString2 = JSON.stringify(response);
                    obj = JSON.parse(jsonString2);
                    rr.resStatus = obj.statusCode;
                    rr.resHeaders = obj.headers;
                    rr.resData = JSON.parse(obj.body);
                  }
                  else if(type==="SOAP"){
                      var firstWord4 = content.substr(0, content.indexOf(constants.SPACE));
                      if(firstWord4.startsWith(constants.SOAP_FILE_STARTSWITH) || firstWord4.startsWith("<soapenv:Envelope")){
                        rr.resData = content;
                      }else{return reject(new Error(constants.NOT_SOAP_TYPE_ERR_MSG));}
                  }
              }
            }

            if (req && res) {
              serv.rrpairs.push(rr);
              req = false; res = false;
            }
  
            next();
  
            if (fileCounter === numberOfFiles) {
              return resolve(serv);
            }
            
          });
      });
  });
}

module.exports = {
  parse: parse
};