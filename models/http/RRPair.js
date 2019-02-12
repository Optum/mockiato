const mongoose = require('mongoose');
const libxmljs = require("libxmljs");
const constants = require('../../lib/util/constants');

const rrSchema = new mongoose.Schema({
  verb: {
    type: String,
    required: [ function () {
           return this.parent().type === 'REST'; 
          }, 
            constants.REQUIRED_HTTP_METHOD_ERR
        ],
    validate: {
      validator: function (v) {
        if (this.parent().type === 'REST' && !constants.ALL_REST_METHODS.includes(v))
          return false;
          else return true;
      },
      message: '{VALUE}'+constants.NOT_VALID_VERB+'({PATH}).'
    }
  },
  
  path: String,
  payloadType: { 
    type: String,
    required: [true, constants.REQUIRED_RRPAIRS_PAYLOADTYPE_ERR],
    enum: {
      values: constants.ALL_PAYLOAD_TYPE,
      message: '{VALUE}'+constants.NOT_VALID_PAYLOADTYPE+'({PATH}).'
    },
    validate: {
      validator: function (v) {
        if (this.parent().type === 'SOAP' && v === 'XML')
          return true;
        else if (this.parent().type === 'REST' && (v === 'XML' || v === 'JSON' || v === 'PLAIN'))
          return true;
          else return false;
      },
      message: constants.SERVICETYPE_PAYLAODTYPE_COMBINATION_ERR
    }
  },
  // use schema-less data-types
  queries: mongoose.Schema.Types.Mixed,
  reqHeaders: mongoose.Schema.Types.Mixed,
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
        if (this.payloadType === 'JSON') {
          try {
            JSON.parse(JSON.stringify(v));
            return true;
          } catch (e) {
            return false;
          }
        } else if (this.payloadType === 'XML') {
          try {
            libxmljs.parseXml(v);
            return true;
          } catch (e) {
            return false;
          }
        } else {
          return true;
        }
      },
      message: constants.PAYLOADTYPE_REQDATA_NOMATCH_ERR
    },
    required: [function () { 
            return this.parent().type === 'SOAP'; 
          }, 
          constants.REQUIRED_REQUEST_PAYLOAD_ERR
        ]
  },
  reqDataString: String,
  resStatus: {
    // force integer only
    type: Number,
    default: 200,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  resHeaders: mongoose.Schema.Types.Mixed,
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
        if (this.payloadType === 'JSON') {
          try {
            JSON.parse(JSON.stringify(v));
            return true;
          } catch (e) {
            return false;
          }
        } else if (this.payloadType === 'XML') {
          try {
            libxmljs.parseXml(v);
            return true;
          } catch (e) {
            return false;
          }
        } else {
          return true;
        }
      },
      message: constants.PAYLOADTYPE_RESDATA_NOMATCH_ERR
    },
    required: [function() { 
            return this.parent().type === 'SOAP'; 
          }, 
          constants.REQUIRED_RESPONSE_PAYLOAD_ERR
        ]
  },
  resDataString: String,
  label: String
});

module.exports = mongoose.model('RRPair', rrSchema);