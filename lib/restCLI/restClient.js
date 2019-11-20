var Client = require('node-rest-client').Client;
const constants = require('../util/constants');

var options = {
    mimetypes: {
        xml: ["application/xml"]
    }
};
var client = new Client(options);

function processRequest(req) {
    return new Promise(function (resolve, reject) {
        fireRequest(req, function (response) {
            if (response.message)
                return reject(response);
            else
                return resolve(response);
        });
    });
}

var fireRequest = function (req, message) {
    const reqJson = JSON.parse(req);
    if (!reqJson.basePath)
        return message(new Error(constants.REST_CLIENT_NO_BP));
    else if (!reqJson.method)
        return message(new Error(constants.REST_CLIENT_NO_METHOD));

    var args = {
        data: reqJson.reqData,
        path: reqJson.relativePath,
        parameters: reqJson.queries,
        headers: reqJson.reqHeaders
    };

    var basePath = reqJson.basePath;
    if (reqJson.relativePath && reqJson.relativePath.startsWith('/'))
        basePath = reqJson.basePath + reqJson.relativePath;
    else if (reqJson.relativePath)
        basePath = reqJson.basePath + '/' + reqJson.relativePath;

    client.registerMethod("funtionToCall", basePath, reqJson.method);

    client.methods.funtionToCall(args, function (data, response) {
        var resp = {
            body: data,
            status: response.statusCode,
            resHeaders: response.headers
        };
        return message(resp);
    });
}

module.exports = {
    processRequest: processRequest
};