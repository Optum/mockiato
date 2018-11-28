var winston = require('winston');
const debug = require('debug')('default');

var SplunkStreamEvent = require('winston-splunk-httplogger');

var splunkSettings = {
    url: process.env.MOCKIATO_SPLUNK_URL,
    index: process.env.MOCKIATO_SPLUNK_INDEX,
    token: process.env.MOCKIATO_SPLUNK_TOKEN,  
    level: 'debug',   
    sourcetype: 'Mockiato',
    source:'Mockiato', 
    ssl: 'true',
    host: 'localhost'
};

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),     
        new SplunkStreamEvent({ splunk: splunkSettings })           
    ],    
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.json()        
    )
});

logger.info('Mockiato Connected to Splunk');
  
logger.debug("Winston End");

module.exports = logger;
