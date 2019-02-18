const mongoose = require('mongoose');
const libxmljs = require("libxmljs");
const constants = require('../../lib/util/constants');

const pairSchema = new mongoose.Schema({
  label: String,
  payloadType: String,
  reqData: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function (v) {
      /* Making validation true in case of DraftService.
        In other cases, apply normal validations. */
        try{
          this.parent().parent();
          return true;
        }catch (e){/* Not a draft service so continue below */}
        try {
          libxmljs.parseXml(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: constants.MQ_VALID_XML_PAYLOAD_ERR
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
          this.parent().parent();
          return true;
        }catch (e){/* Not a draft service so continue below */}
        try {
          libxmljs.parseXml(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: constants.MQ_VALID_XML_PAYLOAD_ERR
    },
    required: [true, constants.REQUIRED_RESPONSE_PAYLOAD_ERR]
  },
  templatedRequests: [String]
});

module.exports = mongoose.model('MQPair', pairSchema);