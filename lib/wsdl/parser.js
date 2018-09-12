const soap = require('soap');
const xml2js = require('xml2js');
const xmlBuilder = new xml2js.Builder();

const Service = require('../../models/Service');
const RRPair  = require('../../models/RRPair');

function parse(wsdl) {
  const serv = new Service();
  serv.type  = 'SOAP';

  soap.createClient(wsdl, function(err, client) {
    if (err) return console.error(err);

    const messages = Object.entries(client.wsdl.definitions.messages);
    messages.forEach(function(keyVal) {
        const rr = new RRPair();
        rr.verb  = 'POST';
        rr.payloadType = 'XML';

        contentType = { 'Content-Type': 'text/xml' };
        rr.reqHeaders = contentType;
        rr.resHeaders = contentType;

        // TODO: map request / response data
        console.log(keyVal[0] + '\n');
        console.log(toXml(keyVal[1].parts) + '\n');

        serv.rrpairs.push(rr);
    });
  }); 

  return serv;
}

function toXml(obj) {
  if (obj) return xmlBuilder.buildObject(obj);
}

module.exports = {
  parse: parse
};