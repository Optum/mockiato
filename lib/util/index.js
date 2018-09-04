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