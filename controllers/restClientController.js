const debug = require('debug')('default');
const restClient = require('../lib/restCLI/restClient');

function processREST(req, res) {

  // const reqJson = JSON.parse(req.body);
  // const method = reqJson.method;
  // const basePath = reqJson.basePath;
  // const relativePath = reqJson.relativePath;
  // const queries = reqJson.queries;
  // const payloadType = reqJson.payloadType;
  // const headers = reqJson.reqHeaders;
  // const reqData = reqJson.reqData;

  restClient.processRequest(req.body).then(onSuccess).catch(onError);

  function onSuccess(resp) {
    res.status(resp.status);
    res.set(resp.resHeaders);
    res.send(resp.body);
  }
  function onError(err) {
    debug(err);
    handleError(err.message, res, 400);
  }

}


module.exports = {
  processREST: processREST
};