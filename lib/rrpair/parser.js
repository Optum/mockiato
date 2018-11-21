//const soap = require('soap');
//const xml2js = require('xml2js');
//const xmlBuilder = new xml2js.Builder();
const parser = require('http-string-parser');
const fs = require('fs')
const unzip = require('unzip');
const stringTojson = require('string-to-json');
const parseJson = require('parse-json');
const useString = require('string');
const Service = require('../../models/Service');
const RRPair = require('../../models/RRPair');
const dir = require('node-dir');



function parse(path) {
  return new Promise(function (resolve, reject) {
    const serv = new Service();
    const rr = new RRPair();
    dir.readFiles(path, function (err, content, filename, next) {
      //console.log(next.length);
        if (err) throw err;
        if (filename.includes("-req")) {
          request = parser.parseRequest(content);
          var jsonString = JSON.stringify(request);
          obj = JSON.parse(jsonString);
          rr.verb = obj.method;;
          rr.payloadType = 'XML';
          allHeaders = obj.headers;
          objHeader = JSON.parse(JSON.stringify(allHeaders));
          rr.reqHeaders = "{\"accept\"=\"" + objHeader.accept + "\",\"Content-Type\"=\"" + objHeader['Content-Type'] +"\",\"Connection\"=\"" +objHeader.Connection +"\",\"User-Agent\"=\"" + objHeader['User-Agent'] +"\"}";
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
          else{
            rr.path= uri;
          }
          rr.reqData = obj.body;


        }
        else {
          if (filename.includes("-rsp")) {
            response = parser.parseResponse(content);
            var jsonString = JSON.stringify(response);
            obj = JSON.parse(jsonString);
           rr.resStatus = obj.statusCode;
            rr.resHeaders = obj.headers;
            rr.resData = obj.body;
            console.log(rr);
            serv.rrpairs.push(rr);
          console.log(serv);
          }

        }
        next();
      });
    return resolve(serv);
  });
}

module.exports = {
  parse: parse
};