const System = require('../models/common/System');
const debug  = require('debug')('default');
const _ = require('lodash/array');
const constants = require('../lib/util/constants');

function getSystems(req, res) {
  System.find({}, function(err, systems)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    res.json(systems);
});
}

function getOneSystem(req, res) {
  const sut = {
    name: req.params.name
  };

  System.findOne(sut, function (err, system) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    res.json(system);
  });
}


function updateGroup(req, res){
  const sut = {
    name: req.params.name,
  };

  System.findOne(sut, function (err, system) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    if (req.body.mqInfo) system.mqInfo = req.body.mqInfo;
    system.members = _.union(system.members, req.body.members);

    system.save(function (err, newSystem) {
      if (err) {
        handleError(err, res, 500);
        return;
      }
      res.json(newSystem);
    });
  });
}

function addSystem(req, res) {

  /**
   * In case user import template with no sut key(by mistake) in .json file. In this case req.body may be empty.
   * It is handled in service creation using validation of mandatory fields and showing proper error message on UI.
   * So it needs to handle here. Otherwise application will not show what is problem with template.
   */
  if(!req.body) {
    res.json(constants.SUT_NOT_PRESENT_ERR_MSG); 
    return;
  }

  if (!req.body.members) req.body.members = [];

  //adds super user to all groups created
  if (process.env.MOCKIATO_ADMIN){
    req.body.members.unshift(process.env.MOCKIATO_ADMIN);
  }

  // add user if not in the group already
  const user = req.decoded.uid;
  if (!req.body.members.includes(user)) {
    req.body.members.push(user);
  }
  
  const sut = {
    name: req.body.name,
    members: req.body.members
  };

  if (req.body.mqInfo) sut.mqInfo = req.body.mqInfo;

  System.findOne({ name: sut.name }, function(err, foundSUT) {
    if (err) {
      debug(err);
      return;
    }

    if (!foundSUT) {
      System.create(sut, function(err, newSUT)	{
          debug('New group created');
          if (err) {
            handleError(err, res, 500);
            return;
          }

          res.json(newSUT);
      });
    }
    else {
      if (!foundSUT.mqInfo && sut.mqInfo) foundSUT.mqInfo = sut.mqInfo;

      // update members
      foundSUT.members = _.union(foundSUT.members, sut.members);
      foundSUT.save(function(err) {
        if (err) {
          debug(err);
        }
      });

      res.json(foundSUT);
    }
  });
}

function delSystem(req, res) {
  System.findOneAndRemove({ name: req.params.name }, function(err)	{
    if (err) {
      handleError(err, res, 400);
      return;
    }
    res.json({ 'message' : 'deleted system', 'name' : req.params.name });
  });
}

/**
 * Helper function to get all SUTs this user is a member of
 * @param {string} user uid for user of interest
 * @return mongoose query
 */
function findSystemsForUser(user){
  return System.find({members:user});
}


/**
 * Get a system if and ONLY if the given user is a member of that system. Otherwise return null. 
 * @param {string} user User uid
 * @param {string} system System name
 * @return mongoose query
 */
function getSystemIfMember(user,system){
  return System.findOne({members:user,name:system});
}

/**
 * Tests if user is a member of this group. returns a promise. Resolves to true if they are, rejects with error otherwise.
 * @param {User} user 
 * @param {System} system 
 */
function isUserMemberOfGroup(user,system){
  return new Promise(function(resolve,reject){
    System.findOne({name:system.name,members:user.uid},function(err,doc){
      if(err){
        reject(err);
      }else if(doc){
        resolve(true);
      }else{
        reject(new Error("User " + user.uid + " not member of group " + system.name));
      }
    })
  });
}

module.exports = {
  getSystems: getSystems,
  addSystem: addSystem,
  delSystem: delSystem,
  getOneSystem: getOneSystem,
  updateGroup: updateGroup,
  findSystemsForUser: findSystemsForUser,
  getSystemIfMember : getSystemIfMember,
  isUserMemberOfGroup: isUserMemberOfGroup
};