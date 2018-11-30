const parser = require('http-string-parser');
const fs = require('fs')
const Service = require('../../models/Service');
const RRPair = require('../../models/RRPair');
const dir = require('node-dir');

function parse(path, type) {
  var serv = new Service();
  return new Promise(function (resolve, reject) {
      var rr = new RRPair();
      var numberOfFiles;
      var fileCounter = 0;
      var req;
      var res;
      var restMethods =["GET", "POST", "UPDATE", "DELETE", "PATCH", "PUT", "HEAD", "CONNECT", "OPTIONS", "TRACE"];

      fs.readdir(path, (err, files) => {
        if (err) return reject(err);
        numberOfFiles = files.length;
        if (numberOfFiles % 2 !== 0)
          return reject(new Error('Number of files in your uploaded zip is not even.'));


          //sorting the files to be sure that response files should come after each req file. while iteration & getting content
          //not sure if only sorting the files will solve this.  - Pradeep
          dir.files(path, function (err, files) {
            if (err) return reject(err);
            files.sort();
          });


          dir.readFiles(path, function (err, content, filename, next) {
            fileCounter++;
            if (err) return reject(err);

              //what's the guarantee that after req file only response file will come? This might be an issue here.-Pradeep
              if (filename.endsWith("-req.txt")) {
                req = true;
                if(type==="REST"){
                  var firstWord = content.substr(0, content.indexOf(" "));
                  if(!restMethods.includes(firstWord)){
                    return reject(new Error('Request file in uploaded zip is not a REST type request file.'));
                  }
                request = parser.parseRequest(content);
                var jsonString = JSON.stringify(request);
                obj = JSON.parse(jsonString);
                rr.verb = obj.method;
                rr.payloadType = 'JSON';
                allHeaders = obj.headers;
                objHeader = JSON.parse(JSON.stringify(allHeaders));
                rr.reqHeaders = objHeader;
                var uri = obj.uri;
                if (uri.includes("?")) {
                  var getQueryString = uri.split("?");
                  rr.path = getQueryString[0];
                  var seperateQueryString = getQueryString[1].split("&");
                  var queryStringFinal = "";
                  for (i = 0; i < seperateQueryString.length; i++) {
                    var queryString = seperateQueryString[i].split("=");
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
              else if(type==="SOAP"){
                    var firstWord = content.substr(0, content.indexOf(" "));
                    if(!firstWord.startsWith("<soap:Envelope")){
                      return reject(new Error('Request file in uploaded zip is not a SOAP type request file.'));
                    }
                rr.verb  = 'POST';
                rr.payloadType = 'XML';
                contentType = { 'Content-Type': 'text/xml' };
                rr.reqHeaders = contentType;
                rr.resHeaders = contentType;
                rr.reqData = content;    
              }
            }
  
              else if(filename.endsWith("-rsp.txt")){
                  res = true;
                  if(type==="REST"){
                    var firstWord = content.substr(0, content.indexOf(" "));
                    if(!firstWord.startsWith("HTTP")){
                      return reject(new Error('Response file in uploaded zip is not a REST type response file.'));
                    }
                  response = parser.parseResponse(content);
                  var jsonString = JSON.stringify(response);
                  obj = JSON.parse(jsonString);
                  rr.resStatus = obj.statusCode;
                  rr.resHeaders = obj.headers;
                  rr.resData = JSON.parse(obj.body);
                }
                else if(type==="SOAP"){
                    var firstWord = content.substr(0, content.indexOf(" "));
                    if(!firstWord.startsWith("<soap:Envelope")){
                      return reject(new Error('Response file in uploaded zip is not a SOAP type response file.'));
                    }
                  rr.resData = content; 
                }
            }

            else{
              return reject(new Error('All files in upload zip must be .txt type. Also files name should end with either -req or -res.'));
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