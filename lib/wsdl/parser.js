const soap = require('soap');
const xml2js = require('xml2js');
const xmlBuilder = new xml2js.Builder();

const pd = require('pretty-data').pd;
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
          const reqXml = toXml(inMsg.parts);
          rr.reqData = pd.xml(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><${inName}>${reqXml}</${inName}></soapenv:Body></soapenv:Envelope>`);

          // extract and set res data
          const outName = methods[j].output.$name;
          const outMsg = messages[outName];
          const resXml = toXml(outMsg.parts);
          rr.resData = pd.xml(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><${outName}>${resXml}</${outName}></soapenv:Body></soapenv:Envelope>`);

          serv.rrpairs.push(rr);
        }
      }

      return resolve(serv);
    }); 
  });
}

function toXml(obj) {
  if (!obj) {
    return;
  }

  const xml = xmlBuilder
    .buildObject(obj)
    .substring(56)
    .replace(/[\[\]]/gi, '')
    .replace(/xs:string/g, '')
    .replace(/xs:int/g, '')
    .replace(/<targetNSAlias>.*<\/targetNSAlias>/g, '')
    .replace(/<targetNamespace>.*<\/targetNamespace>/g, '');

  return xml;
}

module.exports = {
  parse: parse
};