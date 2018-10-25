const fs = require('fs');
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
}

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