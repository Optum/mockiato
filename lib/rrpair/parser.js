const parser = require('http-string-parser');
const fs = require('fs')

const Service = require('../../models/http/Service');
const RRPair = require('../../models/http/RRPair');

const MQService = require('../../models/mq/MQService');
const MQPair = require('../../models/mq/MQPair');

const dir = require('node-dir');
var constants = require('../util/constants');

function parse(path, type) {

  return new Promise(function (resolve, reject) {
    var numberOfFiles;

    fs.readdir(path, (err, files) => {
      if (err) return reject(err);

      if (files.length == 1 && fs.existsSync(path + '/' + files[0])) {
        var newPath = path + '/' + files[0];
        fs.readdir(newPath, (err, nfiles) => {
          if (err) return reject(err);
          bulkUpload(newPath, nfiles, type, function (service) {
            if (service instanceof Service || service instanceof MQService) return resolve(service);
            if (service instanceof Error) return reject(service); else return reject(service);
          });

        });
      } else {
        bulkUpload(path, files, type, function (service) {
          if (service instanceof Service || service instanceof MQService) return resolve(service);
          if (service instanceof Error) return reject(service); else return reject(service);
        });
      }
    });
  });
}

var bulkUpload = function (newPath, newFiles, type, message) {
  var serv; var rr; var req; var res; var fileCounter = 0; var filesNameJson = {}; var isMacZip = false;
  if (type === 'MQ') {serv = new MQService();rr = new MQPair();} else {serv = new Service();rr = new RRPair();}
  var restMethods = constants.ALL_REST_METHODS; var numberOfFiles = newFiles.length;

  //removing Mac related files/directory.
  if (newFiles.includes("__MACOSX")) {
    numberOfFiles = newFiles.length - 1;
    var index = newFiles.indexOf('__MACOSX');
    if (index > -1) {
      newFiles.splice(index, 1);
    }
  }

  //even number files check
  if (numberOfFiles % 2 !== 0)
    return message(new Error(constants.NOT_EVEN_ERR_MSG));

  //files name should end with either -req or -rsp validations.
  newFiles.forEach(function (file, index) {
    var onlyFileNameRegx = /(.+?)(\.[^.]*$|$)/g;
    var match = onlyFileNameRegx.exec(file);
    if (match[1].endsWith(constants.REQ_FILE_END) || match[1].endsWith(constants.RSP_FILE_END)) {
      value = 1;
      if (filesNameJson.hasOwnProperty(match[1].substring(0, match[1].length - 4))) value++;
      filesNameJson[match[1].substring(0, match[1].length - 4)] = value;
    } else return message(new Error(constants.WRONG_FILE_ENDING_ERR_MSG));
  });

  //validation for each file should have corresponding req or rsp file.
  for (let key in filesNameJson) {
    if (filesNameJson[key] !== 2) {
      return message(new Error(constants.REQ_RES_FILENAME_DIFF_ERR_MSG));
    }
  }

  //sorting the files to be sure that response files should come after each req file. while iteration & getting content
  //not sure if only sorting the files will solve this. Well I have tested it with 25 RR pairs.. No issues at all.- Pradeep
  dir.files(newPath, function (err, files) {
    if (err) return message(err);
    files.sort();
  });


  dir.readFiles(newPath, function (err, content, filename, next) {
    if (err) return message(err);
    //don't include any mac files/directory to get rrpairs data
    if (!filename.includes('__MACOSX')) {
      fileCounter++;

      //what's the guarantee that after req file only response file will come? Before reading these files, we have sort files in
      // directory. But still this might be an issue here later. -Pradeep
      var onlyFileNameRegx = /(.+?)(\.[^.]*$|$)/g;
      var match = onlyFileNameRegx.exec(filename);
      if (match[1].endsWith(constants.REQ_FILE_END)) {
        req = true;
        if (type === constants.REST) {
          var firstWord = content.substr(0, content.indexOf(constants.SPACE));
          if (!restMethods.includes(firstWord)) {
            //if content not in standard format.
            rr.verb = constants.POST;
            rr.payloadType = constants.PLAIN; //xml or json check..future work. putting by default plain.
            rr.reqData = content;
          }
          else {
            request = parser.parseRequest(content);
            var jsonString = JSON.stringify(request);
            obj = JSON.parse(jsonString);
            rr.verb = obj.method;
            allHeaders = obj.headers;
            objHeader = JSON.parse(JSON.stringify(allHeaders));
            rr.reqHeaders = objHeader;
            if (!objHeader.accept && !objHeader.Accept) rr.payloadType = constants.PLAIN;
            else if (objHeader.accept == constants.APPLICATION_XML || objHeader.accept == constants.TEXT_XML || objHeader.Accept == constants.APPLICATION_XML || objHeader.Accept == constants.TEXT_XML) rr.payloadType = constants.XML;
            else if (objHeader.accept == constants.APPLICATION_JSON || objHeader.Accept == constants.APPLICATION_JSON) rr.payloadType = constants.JSON;
            else if (objHeader.accept == constants.TEXT_PLAIN || objHeader.Accept == constants.TEXT_PLAIN) rr.payloadType = constants.PLAIN;
            var uri = obj.uri;
            if (uri.includes(constants.QUESTION_MARK)) {
              var getQueryString = uri.split(constants.QUESTION_MARK);
              rr.path = getQueryString[0];
              var seperateQueryString = getQueryString[1].split(constants.AMPERSAND);
              var queryStringFinal = "{";
              for (let i = 0; i < seperateQueryString.length; i++) {
                var queryString = seperateQueryString[i].split(constants.EQUAL_SIGN);
                if (i < seperateQueryString.length - 1) {
                  queryStringFinal = queryStringFinal + '\"' + queryString[0] + "\": " + '\"' + queryString[1] + "\", ";
                }
                else {
                  queryStringFinal = queryStringFinal + '\"' + queryString[0] + "\": " + '\"' + queryString[1] + "\"}";
                }
              }
              rr.queries = JSON.parse(queryStringFinal);
            }
            else {
              rr.path = uri;
            }
            if (obj.body)
              rr.reqData = JSON.parse(obj.body);
          }
        }
        else if (type === constants.SOAP) {
          if (content.startsWith(constants.XML_DECLARATION))
            content = content.replace(constants.XML_DECLARATION, ''); // xml declaration is only seen in request files & with response files.
          if (content.startsWith(constants.SOAP_FILE_STARTSWITH1) || content.startsWith(constants.SOAP_FILE_STARTSWITH2)) {
            rr.verb = constants.POST;
            rr.payloadType = constants.XML;
            contentType = { 'Content-Type': 'text/xml' };
            rr.reqHeaders = contentType;
            rr.resHeaders = contentType;
            rr.reqData = content;
          } else { return message(new Error(constants.NOT_SOAP_TYPE_ERR_MSG)); }
        }
        else if (type === 'MQ') {
          rr.reqData = content;
        }
      }

      else if (match[1].endsWith(constants.RSP_FILE_END)) {
        res = true;
        if (type === constants.REST) {
          var firstWord3 = content.substr(0, content.indexOf(constants.SPACE));
          if (!firstWord3.startsWith(constants.HTTP)) {
            //if content not in standard format.
            rr.resStatus = '200';
            rr.resData = content;
          } else {
            response = parser.parseResponse(content);
            var jsonString2 = JSON.stringify(response);
            obj = JSON.parse(jsonString2);
            rr.resStatus = obj.statusCode;
            rr.resHeaders = obj.headers;
            if (obj.body)
              rr.resData = JSON.parse(obj.body);
          }

        }
        else if (type === "SOAP") {
          if (content.startsWith(constants.SOAP_FILE_STARTSWITH1) || content.startsWith(constants.SOAP_FILE_STARTSWITH2)) {
            rr.resData = content;
          } else { return message(new Error(constants.NOT_SOAP_TYPE_ERR_MSG)); }
        }
        else if (type === 'MQ') {
          rr.resData = content;
        }
      }
    }

    if (req && res) {
      serv.rrpairs.push(rr);
      req = false; res = false;
    }

    next();

    if (fileCounter === numberOfFiles) {
      return message(serv);
    }

  });
}

module.exports = {
  parse: parse
};