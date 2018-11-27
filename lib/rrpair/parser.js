const parser = require('http-string-parser');
const fs = require('fs')
const Service = require('../../models/Service');
const RRPair = require('../../models/RRPair');
const dir = require('node-dir');

function parse(path) {
  var serv = new Service();
  return new Promise(function (resolve, reject) {
      var rr = new RRPair();
      var numberOfFiles;
      var fileCounter = 0;
      var req;
      var res;

      fs.readdir(path, (err, files) => {
        if (err) reject(err);
        numberOfFiles = files.length;
      });
      
      //sorting the files to be sure that response files should come after each req file. while iteration & getting content
      //not sure if only sorting the files will solve this.  - Pradeep
      dir.files(path, function (err, files) {
        if (err) reject(err);
        files.sort();
      });

        dir.readFiles(path, function (err, content, filename, next) {
          fileCounter++;
          if (err) reject(err);
            //what's the guarantee that after req file only response file will come? This might be an issue here.-Pradeep
            if (filename.includes("-req")) {
              req = true;
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

            else {
              if (filename.includes("-rsp")) {
                res = true;
                response = parser.parseResponse(content);
                var jsonString = JSON.stringify(response);
                obj = JSON.parse(jsonString);
                rr.resStatus = obj.statusCode;
                rr.resHeaders = obj.headers;
                rr.resData = JSON.parse(obj.body);
              }
            }

          if (req && res) {
            serv.rrpairs.push(rr);
            req = false; res = false;
          }

          next();

          if (fileCounter === numberOfFiles) {
            resolve(serv);
          }
        });
  });
}

module.exports = {
  parse: parse
};