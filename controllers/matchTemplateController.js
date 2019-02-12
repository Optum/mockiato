const xml2js = require('xml2js');
const debug = require('debug')('matching');

function mergeInOptions(oldOptions,newOptions){
    for(let key1 in newOptions){
        if(oldOptions[key1]){
            if(Array.isArray(oldOptions[key1])){
                oldOptions[key1] = oldOptions[key1].concat(newOptions[key1]);
            }else if(typeof oldOptions == 'object'){
                for(let key2 in newOptions[key1]){
                    oldOptions[key1][key2] = newOptions[key1][key2];
                }
            }else{
                oldOptions[key1] = newOptions[key1];
            }
        }else{
            oldOptions[key1] = newOptions[key1];
        }
    }
}


function processCondition(field,conditionString,flatPayload){
    var split = conditionString.split(":",2);
    switch(split[0]){
        case "map":
            var map = {};
            map[split[1]] = flatPayload[field];
            return {map};
        default:
            return false;
    }
}

function matchOnTemplate(template,rrpair,payload,reqData,path){
    var returnOptions = {};
    if (rrpair.payloadType === 'XML') {
        xml2js.parseString(template, function(err, xmlTemplate) {
          if (err) {
            logEvent(err);
            return false;
          }
          template = xmlTemplate;
        });
      }
      else if (rrpair.payloadType === 'JSON') {
        try {
          template = JSON.parse(template);
        }
        catch(e) {
          debug(e);
          return false;
        }
      }

      const flatTemplate = flattenObject(template);
      const flatPayload  = flattenObject(payload);
      const flatReqData  = flattenObject(reqData);

      const trimmedPayload = {}; const trimmedReqData = {};
      var hasCondition = false;
      for (let field in flatTemplate) {

        //If we have a condition here, handle its special properties
        if(flatTemplate[field]){
            var ret = processCondition(field,flatTemplate[field],flatPayload);
            if(ret !== false){
                mergeInOptions(returnOptions,ret);
                hasCondition = true;
            }else{
                return false;
            }
        //Otherwise add this to the list to get literal equals'd
        }else{
            trimmedPayload[field] = flatPayload[field];
            trimmedReqData[field] = flatReqData[field];
        }
      }
      
      logEvent(path, rrpair.label, 'received payload (from template): ' + JSON.stringify(trimmedPayload, null, 2));
      logEvent(path, rrpair.label, 'expected payload (from template): ' + JSON.stringify(trimmedReqData, null, 2));

      if(!deepEquals(trimmedPayload, trimmedReqData)){
          return false;
      }

      // make sure we're not comparing {} == {}
      if (!hasCondition && JSON.stringify(trimmedPayload) === '{}') {
        return false;
      }
      return returnOptions;
}



module.exports = {
    matchOnTemplate : matchOnTemplate
}