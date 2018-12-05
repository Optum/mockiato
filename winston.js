var winston = require('winston');
const debug = require('debug')('default');
var logger;

var SplunkStreamEvent = require('winston-splunk-httplogger');

var splunkSettings = {
    url: process.env.MOCKIATO_SPLUNK_URL,
    index: process.env.MOCKIATO_SPLUNK_INDEX,
    token: process.env.MOCKIATO_SPLUNK_TOKEN,
    host: process.env.MOCKIATO_SPLUNK_HOST,
   // token:'f4cba1c9-1063-480f-8a17-77b55b8b2230',    
    level: 'info',   
    sourcetype: 'mockiato:app_logs',
    source:'mockiato', 
    ssl: 'true'    
};


if(process.env.MOCKIATO_SPLUNK_ON ===  'true') {

    logger = winston.createLogger({
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
}else{
    logger = winston.createLogger({
        transports: [
            new winston.transports.Console()                       
        ],    
        level: 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.json()        
        )
    });
}


logger.info('Mockiato Connected to Splunk');
  
logger.debug("Winston End");

module.exports = logger;
