const debug = require('debug')('default');
const restClient = require('../lib/restCLI/restClient');

function processREST(req, res) {

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