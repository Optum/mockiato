const mongoose = require('mongoose');
xml2js = require("xml2js");
const constants = require('../../lib/util/constants');

const pairSchema = new mongoose.Schema({
  label: String,
  reqData: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function (v) {
      /* Making validation true in case of DraftService.
        In other cases, apply normal validations. */
        try{
          if (this.parent().parent().constructor.modelName === 'DraftService') return true; //else continue validations.
        } catch (e) {/* Not a draft service so continue below validations*/ }
        try{
          xml2js.parseString(v, function (err, result) {
            if(err) throw err;
          });
          return true;
        }catch(e){return false;}
      },
      message: constants.MQ_VALID_XML_REQ_ERR
    },
    required: [true, constants.REQUIRED_REQUEST_PAYLOAD_ERR]
  },
  resData: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function (v) {
      /* Making validation true in case of DraftService.
        In other cases, apply normal validations. */
        try{
          if (this.parent().parent().constructor.modelName === 'DraftService') return true; //else continue validations.
        } catch (e) {/* Not a draft service so continue below validations*/ }
        try{
          xml2js.parseString(v, function (err, result) {
            if(err) throw err;
          });
          return true;
        }catch(e){return false;}
      },
      message: constants.MQ_VALID_XML_RES_ERR
    },
    required: [true, constants.REQUIRED_RESPONSE_PAYLOAD_ERR]
  },
});

module.exports = mongoose.model('MQPair', pairSchema);