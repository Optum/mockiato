const fs = require('fs');
const winston = require('winston');

let filename = process.env.MOCKIATO_LOG_FILE || '/dev/null';

const transports = [ new winston.transports.Stream({
    stream: fs.createWriteStream(filename)
})];        

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
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.json()        
    ),
    transports: transports
});
  
module.exports = logger;
