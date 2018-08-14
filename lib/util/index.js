// function for respoding with errors
global.handleError = function(e, res, stat) {
  res
    .status(stat)
    .json({ error: e });

  console.error(e);
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