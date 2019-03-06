const xml2js = require('xml2js');
const debug = require('debug')('matching');

/**
 * Applies all template options to a response string. E.g. puts out map values
 * @param {*} response 
 * @param {*} templateOptions 
 */
function applyTemplateOptionsToResponse(response,templateOptions){

    if(templateOptions.map){
        for(let key in templateOptions.map){
            response = response.replace("{{" + key + "}}",templateOptions.map[key]);
        }
    }
    return response;
}



/**
 * Merges a newly returned options object from processCondition() into the existing options
 * @param {*} oldOptions Old options- this gets mut'd!
 * @param {*} newOptions new options
 */
function mergeInOptions(oldOptions,newOptions){
    if(typeof newOptions == 'object'){
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
}


/**
 * Given a condition string, process this condition.
 * @param {string} field Flattened field name (e.g. "params.person.firstName")
 * @param {string} conditionString The condition string (e.g. map:firstName)
 * @param {object} flatPayload  Flattened payload
 * @return Returns either an object that contains new options for the template, OR false if the condition is considered failed. ONLY false is considered a failure- {} or null is a pass!
 */
function processCondition(field,conditionString,flatPayload){
    let split = conditionString.split(":",2);
    let condNum, payloadNum;
    try{
        switch(split[0]){
            case "map":
                var map = {};
                if(flatPayload[field]  === undefined)
                    return false;
                map[split[1]] = flatPayload[field] || '';
                return {map};
            case "lt":  
                if(flatPayload[field] === undefined)
                    return false;
                condNum = parseFloat(split[1]);
                payloadNum = parseFloat(flatPayload[field]);
                return payloadNum < condNum;
            case "gt":  
                if(flatPayload[field] === undefined)
                    return false;
                condNum = parseFloat(split[1]);
                payloadNum = parseFloat(flatPayload[field]);
                return payloadNum > condNum;

            case "any":
                return flatPayload[field] !== undefined && flatPayload[field] !== '';
            case "regex":
                
                var reg = new RegExp(split[1]);
                return flatPayload[field].match(reg) !== null;
            default:
                return {};
        }
    }catch(e){
        console.log(e);
        debug(e);
        return false;
    }
}


/**
 * Iterates through multiple ; separated conditions
 * @param {*} field 
 * @param {*} conditionString 
 * @param {*} flatPayload 
 */
function preProcessCondition(field,conditionString,flatPayload){
    if(typeof conditionString != "string"){
        return false;
    }
    var split = conditionString.split(";");
    var opts = {};
    for(let splString of split){
        let newOpts = processCondition(field,splString,flatPayload);
        if(newOpts === false)
            return false;
        mergeInOptions(opts,newOpts);
    }
    return opts;
}


/**
 * Tests a payload against a request using a template. Returns any template options that were parsed (e.g. mapping vars)
 * @param {*} flatTemplate The flattened template
 * @param {*} rrpair RR Pair in question
 * @param {*} flatPayload Flattened payload
 * @param {*} flatReqData Flattened reqData from RR pair
 * @param {*} path Path of this req (for debug logging)
 */
function matchOnTemplate(flatTemplate,rrpair,flatPayload,flatReqData,path){
    var returnOptions = {};
    const trimmedPayload = {}; const trimmedReqData = {};
      var hasBlank = false;
      for (let field in flatTemplate) {

        //If we have a condition here, handle its special properties
        if(flatTemplate[field]){
            var ret = preProcessCondition(field,flatTemplate[field],flatPayload);
            if(ret !== false){
                mergeInOptions(returnOptions,ret);
            }else{
                return false;
            }
        //Otherwise add this to the list to get literal equals'd
        }else{
            hasBlank = true;
            trimmedPayload[field] = flatPayload[field];
            trimmedReqData[field] = flatReqData[field];
        }
      }
      
      logEvent(path, rrpair.label, 'received payload (from template): ' + JSON.stringify(trimmedPayload, null, 2));
      logEvent(path, rrpair.label, 'expected payload (from template): ' + JSON.stringify(trimmedReqData, null, 2));

      if(hasBlank && !deepEquals(trimmedPayload, trimmedReqData)){
          return false;
      }

      // make sure we're not comparing {} == {}
      if (hasBlank && JSON.stringify(trimmedPayload) === '{}') {
        return false;
      }
      return returnOptions;
}


/**
 * Given a template and the payload type, parse this template and flatten it.
 * @param {*} template 
 * @param {*} payloadType 
 * @return Flattened template, or false if parsing fails. 
 */
function parseAndFlattenTemplate(template,payloadType){
    if (payloadType === 'XML') {
        let ret = false;
        xml2js.parseString(template, function(err, xmlTemplate) {
            if (err) {
                logEvent(err);
                ret = false;
            }
            ret =  flattenObject(xmlTemplate); 
        });
        return ret; 
    }
    else if (payloadType === 'JSON') {
        try {
            return flattenObject(JSON.parse(template));
        }
        catch(e) {
            debug(e);
            return false;
        }
    }else{
        return false;
    }

}


module.exports = {
    matchOnTemplate : matchOnTemplate,
    applyTemplateOptionsToResponse:applyTemplateOptionsToResponse,
    preProcessCondition:preProcessCondition,
    parseAndFlattenTemplate: parseAndFlattenTemplate
}