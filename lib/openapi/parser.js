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
      return undefined;
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
      let len    = spec.servers.length;
      let urlStr = spec.servers[len-1].url;
      if (!url.parse(urlStr).protocol) urlStr = 'http://' + urlStr;

      let pathname = url.parse(urlStr).pathname;
      if (pathname.charAt(pathname.length-1) === '/') pathname = pathname.slice(0,-1);
      serv.basePath = pathname;
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
          rr.path = path;
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

          // set request data
          const reqBodyObj = spec.paths[path][method].requestBody;
          if (reqBodyObj) {
            const reqContent = reqBodyObj.content;
            if (reqContent) {
              // TODO: need a better way of parsing media type
              const reqMedType = 'application/json';
              if (reqMedType) {
                const reqSchema = reqBodyObj.content[reqMedType].schema;
                rr.reqData = processSchema(reqSchema);

                setPayloadType(rr, reqMedType);
              }
            }
            else {
              rr.reqData = processSchema(reqBodyObj);
            }
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
          const responseObj = spec.paths[path][method].responses[resp];
          const contentObj = responseObj.content;
          if (contentObj) {          
            // TODO: need a better way of parsing media type
            const mediaType = 'application/json';
            if (mediaType) {
              const resSchema = contentObj[mediaType].schema;
              rr.resData = processSchema(resSchema);

              if (!rr.payloadType) {
                setPayloadType(rr, mediaType);
              }
            }
          }
          else {
            rr.resData = processSchema(responseObj);
          }
  
          // add the request / response pair
          serv.rrpairs.push(rr);

          function setPayloadType(rrpair, mediaType) {
            if (!rrpair) return;

            if (!mediaType) {
              mediaType = 'text/plain';
            }

            if (mediaType.includes('json')) {
              rrpair.payloadType = 'JSON';
            }
            else if (mediaType.includes('xml')) {
              rrpair.payloadType = 'XML';
            }
            else {
              rrpair.payloadType = 'PLAIN';
            }

            if (!rrpair.resHeaders) {
              rrpair.resHeaders = {};
            }
            rrpair.resHeaders['Content-Type'] = mediaType;

            if (rrpair.reqData) {
              if (!rrpair.reqHeaders) rrpair.reqHeaders = {};
              rrpair.reqHeaders['Content-Type'] = mediaType;
            }
          }

          // function to process components for request / response data
          function processSchema(schema) {
            // TODO: need to handle "allOf"
            if (!schema) return;
            if (schema.example) return schema.example;
            let componentName, component, props, dataArr, dataObj;

            if (schema.$ref) {
              let reg = schema.$ref.match(/s\/.+\//);
              let str = reg.toString().replace(/s/, '');
              let str2 = str.replace(/\//g, '');

              componentName = schema.$ref.replace('#/components' + str, '');
              component = spec.components[str2][componentName];
              debug(component);
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

            if (schema.content) {
              return processSchema(schema.content['application/json'].schema);
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