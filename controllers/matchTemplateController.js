function matchOnTemplate(template,rrpair,payload,reqData,path){
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
        }
      }

      const flatTemplate = flattenObject(template);
      const flatPayload  = flattenObject(payload);
      const flatReqData  = flattenObject(reqData);

      const trimmedPayload = {}; const trimmedReqData = {};
        
      for (let field in flatTemplate) {
        trimmedPayload[field] = flatPayload[field];
        trimmedReqData[field] = flatReqData[field];
      }
      
      logEvent(path, rrpair.label, 'received payload (from template): ' + JSON.stringify(trimmedPayload, null, 2));
      logEvent(path, rrpair.label, 'expected payload (from template): ' + JSON.stringify(trimmedReqData, null, 2));

      match = deepEquals(trimmedPayload, trimmedReqData);

      // make sure we're not comparing {} == {}
      if (match && JSON.stringify(trimmedPayload) === '{}') {
        match = false;
      }
      return match;
}



module.exports = {
    matchOnTemplate : matchOnTemplate
}