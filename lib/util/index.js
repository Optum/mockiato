const assert = require('assert');

// function for responding with errors
global.handleError = function(e, res, stat) {
  res
    .status(stat)
    .json({ error: e });

  console.error(e);
};

// function for deep object comparison
global.deepEquals = function(a, b) {
  if (a._id) delete a._id;
  if (b._id) delete b._id;

  try { 
    assert.deepEqual(a, b); 
    return true;
  } 
  catch (e) { 
    console.log(e);
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