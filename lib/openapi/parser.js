const url = require('url');
const mongoose = require('mongoose');

// set default values for data types
const DEFAULT_INT = 0;
const DEFAULT_NUM = 0.0;
const DEFAULT_BOOL = false;
const DEFAULT_STR = 'string';

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
      throw `Data type ${type} is not defined in OAS3`;
  }
}

function parse(spec) {
  // reject swagger 2 documents
  if (!spec.openapi || spec.swagger) {
    throw 'Spec is not OAS3 compatible';
  }

  // initialize new service
  const Service = mongoose.model('Service');
  const RRPair  = mongoose.model('RRPair');
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

            // TODO: handle complex parameters
            if (type !== 'array' && type !== 'object') {
              defVal = getDefaultData(type);
              switch(param.in) {
                case 'query':
                  rr.queries[param.name] = defVal;
                  break;
                case 'header':
                  rr.reqHeaders[param.name] = defVal;
                  break;
                case 'path':
                  rr.path = rr.path.replace(`{${param.name}}`, param.name);
                  break;
                default:
                  console.log(`Could not virtualize parameter ${param.name} in ${param.in}`);
              }
            }
          });
        }

        // set response headers
        const headersObj = spec.paths[path][method].responses[resp].headers;
        if (headersObj) {
          const headers = Object.keys(headersObj);
          if (headers) {
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
          // const mediaType = Object.keys(contentObj)[0];
          // TODO: better way of parsing payload type
          const mediaType = 'application/json';
          const reqHeads = {}; const resHeads = {};

          reqHeads['Content-Type'] = mediaType;
          resHeads['Content-Type'] = mediaType;

          // set payload type
          if (mediaType === 'application/json') {
            rr.payloadType = 'JSON';
          }
          else if (mediaType === 'text/xml' || mediaType === 'application/xml') {
            rr.payloadType = 'XML';
          }
          else {
            throw `Media type ${mediaType} is not supported by Mockiato`;
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

        // add the request / response pair
        serv.rrpairs.push(rr);

        // function to process component schemas for request / response data
        // TODO: handle "allOf"
        function processSchema(schema) {
          if (!schema) return;

          let componentName, component, props, dataArr, dataObj;
          if (schema.$ref) {
            componentName = schema.$ref.replace('#/components/schemas/', '');
            component = spec.components.schemas[componentName];
            return processSchema(component);
          }

          if (schema.properties) {
            dataObj = {};
            props = Object.keys(schema.properties);
            props.forEach(function(prop) {
              if (schema.properties[prop].$ref) {
                componentName = schema.properties[prop].$ref.replace('#/components/schemas/', '');
                component = spec.components.schemas[componentName];
                dataObj[prop] = processSchema(component);
              }
              else {
                if (schema.properties[prop].example) {
                  dataObj[prop] = schema.properties[prop].example;
                }
                else {
                  dataObj[prop] = getDefaultData(schema.properties[prop].type);
                }
              }
            });

            return dataObj;
          }

          if (schema.type) {
            if (schema.type === 'array') {
              dataArr = [];
              if (schema.items && schema.items.$ref) {
                componentName = schema.items.$ref.replace('#/components/schemas/', '');
                component = spec.components.schemas[componentName];

                dataObj = processSchema(component);
                dataArr.push(dataObj);
                return dataArr;
              }
            }

            return getDefaultData(schema.type);
          }
        }
      });
    });
  });

  // return the service
  return serv;
}

module.exports = {
  parse: parse
};