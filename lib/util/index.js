const fs  = require('fs');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const debug  = require('debug')('default');
const logger = require('../../winston');

// function for responding with errors
global.handleError = function(e, res, stat) {
  res
    .status(stat)
    .json({ error: e });

  debug(e);
};

// function for deep object comparison
global.deepEquals = function(a, b) {
  try { 
    assert.deepEqual(a, b); 
    return true;
  } 
  catch (e) { 
    return false;
  }
};

global.flattenObject = (function (isArray, wrapped) {
  return function (table) {
      return reduce("", {}, table);
  };

  function reduce(path, accumulator, table) {
      if (isArray(table)) {
          var length = table.length;

          if (length) {
              var index = 0;

              while (index < length) {
                  var property = path + "[" + index + "]", item = table[index++];
                  if (wrapped(item) !== item) accumulator[property] = item;
                  else reduce(property, accumulator, item);
              }
          } else accumulator[path] = table;
      } else {
          var empty = true;

          if (path) {
              for (var property in table) {
                  var item = table[property], property = path + "." + property, empty = false;
                  if (wrapped(item) !== item) accumulator[property] = item;
                  else reduce(property, accumulator, item);
              }
          } else {
              for (var property in table) {
                  var item = table[property], empty = false;
                  if (wrapped(item) !== item) accumulator[property] = item;
                  else reduce(property, accumulator, item);
              }
          }

          if (empty) accumulator[path] = table;
      }

      return accumulator;
  }
}(Array.isArray, Object));

global.tokenMiddleware = function(req, res, next) {
  res.set('Content-Type', 'application/json');
  if (req.method === 'GET') return next();

  const token = req.query.token || req.headers['x-access-token'];
  if (token) {
    // verify secret and check expiry
    jwt.verify(token, require('../../app').get('secret'), function(err, decoded) {
      if (err) {
        return res.status(403).json({
            success: false,
            message: 'Failed to authenticate token'
        });
      } else {
        // save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return res.status(401).json({
        success: false,
        message: 'No token provided.'
    });
  }
};

// polyfill for Object.entries()
if (!Object.entries)
  Object.entries = function(obj) {
    let ownProps = Object.keys(obj),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
};


global.logEvent = function(path, label, msg) {
  //debug(path, label, msg);

  let event = {};
  event.path = path;
  event.label = label;
  event.msg = msg;

  logger.info(event);
};

global.escapeRegExp = function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";