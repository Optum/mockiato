const url = require('url');
const debug  = require('debug')('default');

const Service = require('../../models/http/Service');
const RRPair  = require('../../models/http/RRPair');

// set default values for data types
const DEFAULT_INT = 0;
const DEFAULT_NUM = 0.0;
const DEFAULT_BOOL = false;
const DEFAULT_STR = '';

function getDefaultData(type) {
  switch(type) {
    case 'string':
      return DEFAULT_STR;
    case 'integer':
      return DEFAULT_INT;
    case 'boolean':
      return DEFAULT_BOOL;
    case 'number':
      return DEFAULT_NUM;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'null':
      return null;
    default:
      // TODO: need to call reject() here instead of throwing exception
      throw `Data type ${type} is not defined in OAS3`;
  }
}

function parse(spec) {
  return new Promise(function(resolve, reject) {

    // reject swagger 2 documents
    if (!spec.openapi || spec.swagger) {
      return reject('Spec is not OAS3 compatible');
    }

    // initialize new service
    const serv = new Service();

    // map spec elements to service fields
    serv.type = 'REST';
    serv.name = spec.info.title;
    if (spec.servers) {
      let urlStr = spec.servers[0].url;
      if (!url.parse(urlStr).protocol) urlStr = 'http://' + urlStr;
      serv.basePath = url.parse(urlStr).pathname;
    }
    
    // build RR pairs
    const paths = Object.keys(spec.paths);
    paths.forEach(function(path) {
      const methods = Object.keys(spec.paths[path]);
      methods.forEach(function(method, index) {
        // ignore child objects of path that are not HTTP methods
        const notAMethod = ['$ref', 'description', 'servers', 'parameters'];
        if (notAMethod.includes(method)) return;

        // create one RR pair for each response
        const responses = Object.keys(spec.paths[path][method].responses);
        responses.forEach(function(resp) {
          const rr = new RRPair();
          rr.path = path.substr(1); // remove leading slash
          rr.verb = methods[index].toUpperCase();
          if (resp !== 'default') rr.resStatus = resp;

          // set request parameters
          const params = spec.paths[path][method].parameters;
          if (params) {
            rr.queries = {};
            rr.reqHeaders = {};
            
            params.forEach(function(param) {
              let defVal;
              const type = param.schema.type;

              // TODO: need to handle handle complex parameters
              if (type !== 'array' && type !== 'object') {
                defVal = getDefaultData(type);
                switch(param.in) {
                  case 'query':
                    rr.queries[param.name] = defVal;
                    break;
                  case 'header':
                    rr.reqHeaders[param.name] = defVal;
                    break;
                  default:
                    debug(`Warning - Could not virtualize parameter ${param.name} in ${param.in}`);
                }
              }
            });
          }

          // set response headers
          const headersObj = spec.paths[path][method].responses[resp].headers;
          if (headersObj) {
            const headers = Object.keys(headersObj);
            if (headers.length) {
              rr.resHeaders = {};
              headers.forEach(function(head) {
                const headObj = headersObj[head];
                rr.resHeaders[head] = getDefaultData(headObj.schema.type);
              });
            }
          }

          // set response data
          const contentObj = spec.paths[path][method].responses[resp].content;
          if (contentObj) {
            // TODO: need a better way of parsing payload type
            const mediaType = Object.keys(contentObj)[0];

            const reqHeads = {}; const resHeads = {};
            reqHeads['Content-Type'] = mediaType;
            resHeads['Content-Type'] = mediaType;

            // set payload type
            if (mediaType === 'application/json') {
              rr.payloadType = 'JSON';
            }
            else if (mediaType.includes('xml')) {
              rr.payloadType = 'XML';
            }
            else {
              rr.payloadType = 'PLAIN';
            }

            rr.reqHeaders = reqHeads;
            rr.resHeaders = resHeads;

            const schema = contentObj[mediaType].schema;
            rr.resData = processSchema(schema);

            // set request body
            const reqBodyObj = spec.paths[path][method].requestBody;
            if (reqBodyObj) {
              const reqSchema = reqBodyObj.content[mediaType].schema;
              rr.reqData = processSchema(reqSchema);
            }
          }
          // send default plaintext message for status code
          else {
            rr.payloadType = 'PLAIN';
            const reqHeads = {}; const resHeads = {};
            reqHeads['Content-Type'] = 'text/plain';
            resHeads['Content-Type'] = 'text/plain';
            rr.reqHeaders = reqHeads;
            rr.resHeaders = resHeads;
          }

          // add the request / response pair
          serv.rrpairs.push(rr);

          // function to process components for request / response data
          function processSchema(schema) {
            // TODO: need to handle "allOf"
            if (!schema) return;
            if (schema.example) return schema.example;
            let componentName, component, props, dataArr, dataObj;

            if (schema.$ref) {
              // TODO: need to do more sophisticated regex here to account for components defined outside of the "schema" space
              let reg = schema.$ref.match(/s\/.+\//);
              let str = reg.toString().replace(/s/, '');
              let str2 = str.replace(/\//g, '');
              debug(str, str2);

              componentName = schema.$ref.replace('#/components' + str, '');
              component = spec.components[str2][componentName];
              return processSchema(component);
            }

            if (schema.properties) {
              dataObj = {};
              props = Object.keys(schema.properties);
              props.forEach(function(prop) {
                //debug(schema.properties[prop]);
                dataObj[prop] = processSchema(schema.properties[prop]);
              });

              return dataObj;
            }

            if (schema.items) {
              dataArr = [];
              dataObj = processSchema(schema.items);
              dataArr.push(dataObj);
              return dataArr;
            }

            if (schema.type) return getDefaultData(schema.type);
          }
        });
      });
    });

    // return the service
    return resolve(serv);
  });
}

module.exports = {
  parse: parse
};