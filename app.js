// get environment variables
require('dotenv').config();

// boostrap utility functions
require('./lib/util');

// import dependencies
const express = require('express');
const app = express();
const compression = require('compression');
const debug = require('debug')('default');
const path = require('path');
const morgan = require('morgan')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const actuator = require('express-actuator');

// connect to database
const db = require('./models/db');
db.on('error', function(err)  {throw err; });
db.once('open', function() {
  debug(`Successfully connected to Mongo (${process.env.MONGODB_HOST})`);

  // ready to start
  app.emit('ready');
});
app.on('ready', init);

function init() {
  // register middleware
  app.use(helmet());
  app.use(compression());
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // parse request body as plaintext if no content-type is set
  app.use(function(req, res, next) {
    if (!req.get('content-type')) {
      req.headers['content-type'] = 'text/plain';
    }
    return next();
  });

  // parse request body based on content-type
  app.use(bodyParser.text({ limit: '5mb', type: [ 'application/soap+xml', 'application/xml', 'text/xml', 'text/plain' ]}));
  app.use(bodyParser.json({ limit: '5mb', type: [ 'application/json' ]}));
  app.use(bodyParser.urlencoded({ extended: false }));

  // expose health info
  app.use(actuator('/api/admin'));

  // expose swagger ui for internal api docs
  const YAML = require('yamljs');
  const apiDocs = YAML.load('./api-docs.yml');
  const swaggerUI = require('swagger-ui-express');
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(apiDocs));

  // configure auth
  const passport = require('passport');
  const passportOpts = { session: false };
  const authType = process.env.MOCKIATO_AUTH || 'local';

  // setup local authentication
  if (authType === 'local') {
    debug('Using local auth strategy');

    const local = require('./lib/auth/local');
    app.use('/register', local);
  }
  // setup ldap authentication
  else if (authType === 'ldapauth') {
    debug('Using LDAP auth strategy');

    require('./lib/auth/ldap');
  }

  // route to retrieve login token
  const jwt = require('jsonwebtoken');
  const secret = process.env.MOCKIATO_SECRET;
  app.set('secret', secret);
  app.post('/api/login', passport.authenticate(authType, passportOpts),
    function(req, res) {
      const user = {
        uid: req.user.uid,
        mail: req.user.mail
      };

      if (authType === 'ldapauth') {
        // create new user on first login
        user.uid = req.user.sAMAccountName;
        mongoose.model('User').findOne({uid: user.uid}, function(err, foundUser) {
          if (err) {
            debug(err);
            return;
          }
          if (!foundUser) {
            mongoose.model('User').create(user,
              function(err, newUser) {
                if (err) {
                  debug(err);
                  return;
                }
              });
          }
        });
      }

      // create access token
      const token = jwt.sign(user, app.get('secret'), {
        expiresIn: '1d'
      });

      // return the token as JSON
      res.json({
        success: true,
        token: token
      });
  });

  // expose API and virtual SOAP / REST services
  const virtual = require('./routes/virtual');
  const api = require('./routes/services');

  // register SOAP / REST virts from DB
  virtual.registerAllRRPairsForAllServices();
  app.use('/api/services', api);
  app.use('/virtual', virtual.router);
  
  // initialize recording routers
  const recorder = require('./routes/recording');
  const recorderController = require('./controllers/recorderController');
  app.use('/recording',recorder.recordingRouter);
  app.use('/api/recording',recorder.apiRouter);

  // register new virts on all threads
  if (process.env.MOCKIATO_MODE !== 'single') {
    process.on('message', function(message) {

      const msg = message.data;
      if(msg.service){
        const service = msg.service;
        const action  = msg.action;
        debug(action);

        virtual.deregisterService(service);

        if (action === 'register') {
          virtual.registerService(service);
        }
      }else if(msg.recorder){
        const rec = msg.recorder;
        const action  = msg.action;
        console.log("msg: " + JSON.stringify(msg));
        if(action === 'register'){
          recorderController.registerRecorder(rec);
        }else if(action === 'deregister'){
          recorderController.deregisterRecorder(rec);
        }
      }
    });
  }

  // expose api methods for users and groups
  const systems = require('./routes/systems');
  app.use('/api/systems', systems);

  const users = require('./routes/users');
  app.use('/api/users', users);

  // handle no match responses
  app.use(/\/((?!recording).)*/,function(req, res, next) {
    if (!req.msgContainer) {
      req.msgContainer = {};
      req.msgContainer.reqMatched = false;
      req.msgContainer.reason = `Path ${req.path} could not be found`;
    }

    return res.status(404).json(req.msgContainer);
  });

  // handle internal errors
  app.use(/\/((?!recording).)*/,function(err, req, res) {
    debug(err.message);
    return res.status(500).send(err.message);
  });

  // ready for testing (see test/test.js)
  app.emit('started');
}

module.exports = app;
