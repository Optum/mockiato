const System = require('../models/common/System');
const debug  = require('debug')('default');

function getSystems(req, res) {
  System.find({}, function(err, systems)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    res.json(systems);
});
}

function addSystem(req, res) {
  const sut = {
    name: req.body.name
  };

  System.findOne(sut, function(err, foundSUT, system) {
    if (err) {
      debug(err);
      return;
    }
    if (!foundSUT) {
      System.create(sut, function(err)	{
          debug('New group created');
          if (err) {
            handleError(err, res, 500);
            return;
          }

      });
    }
    res.json(system);
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

module.exports = {
  getSystems: getSystems,
  addSystem: addSystem,
  delSystem: delSystem
};