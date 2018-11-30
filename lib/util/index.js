const fs  = require('fs');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const debug  = require('debug')('default');

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

global.unflattenObject = function(table) {
  var result = {};

  for (var path in table) {
      var cursor = result, length = path.length, property = "", index = 0;

      while (index < length) {
          var char = path.charAt(index);

          if (char === "[") {
              var start = index + 1,
                  end = path.indexOf("]", start),
                  cursor = cursor[property] = cursor[property] || [],
                  property = path.slice(start, end),
                  index = end + 1;
          } else {
              var cursor = cursor[property] = cursor[property] || {},
                  start = char === "." ? index + 1 : index,
                  bracket = path.indexOf("[", start),
                  dot = path.indexOf(".", start);

              if (bracket < 0 && dot < 0) var end = index = length;
              else if (bracket < 0) var end = index = dot;
              else if (dot < 0) var end = index = bracket;
              else var end = index = bracket < dot ? bracket : dot;

              var property = path.slice(start, end);
          }
      }

      cursor[property] = table[path];
  }

  return result[""];
};

// function to read all files in directory
global.readFiles = function(dirname, onFileContent, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(filename, content);
      });
    });
  });
};

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";