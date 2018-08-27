const assert = require('assert');

// function for responding with errors
global.handleError = function(e, res, stat) {
  res
    .status(stat)
    .json({ error: e });

  console.error(e);
};

// function for deep object comparison
global.deepEqual = function(a, b) {
  try { 
    assert.deepEqual(a,b); 
    return true;
  } 
  catch (e) { 
    return false;
  }
};

// function for deep comparing objects as JSON
global.jsonEqual = function(a, b) {
  // flatten and sort keys so order doesn't impact matching
  const kv1 = Object.entries(flattenObject(a)).sort();
  const kv2 = Object.entries(flattenObject(b)).sort();

  return (JSON.stringify(kv1) === JSON.stringify(kv2));
};

function flattenObject(ob) {
  const toReturn = {};
  for (const i in ob) {
      if (!ob.hasOwnProperty(i)) continue;

      if ((typeof ob[i]) == 'object') {
          const flatObject = flattenObject(ob[i]);
          for (const x in flatObject) {
              if (!flatObject.hasOwnProperty(x)) continue;

              toReturn[i + '.' + x] = flatObject[x];
          }
      } else {
          toReturn[i] = ob[i];
      }
  }
  return toReturn;
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