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
    var ownProps = Object.keys(obj),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";