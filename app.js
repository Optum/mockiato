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
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');

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
  app.use(logger('dev'));
  app.use(bodyParser.json({ type: 'application/json' }));
  app.use(bodyParser.text({ type: [ 'application/xml', 'text/xml' ]}));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

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
                debug('New user created: ' + newUser.uid);
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

  // register new virts on all threads
  const Service = require('./models/Service');
  if (process.env.MOCKIATO_MODE !== 'single') {
    process.on('message', function(message) {
      const msg = message.data;
      debug(msg);

      if (msg.action === 'register') {
        virtual.registerById(msg.serviceId);
      }
      else {
        virtual.deregisterById(msg.serviceId);
        Service.findOneAndRemove({_id : msg.serviceId}, function(err)	{
          if (err) debug(err);
        });
      }
    });
  }

  // expose api methods for users and groups
  const systems = require('./routes/systems');
  app.use('/api/systems', systems);

  const users = require('./routes/users');
  app.use('/api/users', users);

  // initialize MQ connection and register MQ virts from DB
  const mq = require('./lib/mq');
  mq.connect();
  mq.registerAll();

  // ready for testing (see test/test.js)
  app.emit('started');
}

module.exports = app;
