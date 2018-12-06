const winston = require('winston');

const transports = [ new winston.transports.Console() ];        

if (process.env.MOCKIATO_SPLUNK_ENABLED) {
    const SplunkStreamEvent = require('winston-splunk-httplogger');

    const splunkSettings = {
        url: process.env.MOCKIATO_SPLUNK_URL,
        index: process.env.MOCKIATO_SPLUNK_INDEX,
        token: process.env.MOCKIATO_SPLUNK_TOKEN,
        host: process.env.MOCKIATO_SPLUNK_HOST,
        level: 'info',   
        sourcetype: 'mockiato:app_logs',
        source:'mockiato', 
        ssl: 'true'    
    };

    transports.push(new SplunkStreamEvent({ splunk: splunkSettings }));
}

logger = winston.createLogger({ 
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.json()        
    ),
    transports: transports
});

logger.info('Mockiato Connected to Splunk');
  
logger.debug("Winston End");

module.exports = logger;
