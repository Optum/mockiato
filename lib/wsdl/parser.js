const soap = require('soap');
const xml2js = require('xml2js');
const xmlBuilder = new xml2js.Builder();

const Service = require('../../models/Service');
const RRPair  = require('../../models/RRPair');

function parse(wsdl) {
  return new Promise(function(resolve, reject) {
    const serv = new Service();
    serv.type  = 'SOAP';

    soap.createClientAsync(wsdl, function(err, client) {
      if (err) return reject(err);

      const bindings = client.wsdl.definitions.bindings;
      const messages = client.wsdl.definitions.messages;

      for (let i in bindings) {
        const binding = bindings[i];
        const methods = binding.methods;

        for (let j in methods) {
          const rr = new RRPair();
          rr.verb  = 'POST';
          rr.payloadType = 'XML';

          // set req / res headers
          contentType = { 'Content-Type': 'text/xml' };
          rr.reqHeaders = contentType;
          rr.resHeaders = contentType;

          // extract and set req data
          const inName = methods[j].input.$name;
          const inMsg = messages[inName];
          const reqXml = clean(toXml(inMsg.parts));
          rr.reqData = reqXml;

          // extract and set res data
          const outName = methods[j].output.$name;
          const outMsg = messages[outName];
          const resXml = clean(toXml(outMsg.parts));
          rr.resData = resXml;

          serv.rrpairs.push(rr);
          resolve(serv);
        }
      }
    }); 
  });
}

function clean(str) {
  if (str) return str.replace(/[\[\]]/gi, '');
}

function toXml(obj) {
  if (obj) return xmlBuilder.buildObject(obj);
}

module.exports = {
  parse: parse
};