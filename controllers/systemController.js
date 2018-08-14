const System = require('../models/System');

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
      console.error(err);
      return;
    }
    if (!foundSUT) {
      System.create(sut, function(err)	{
          console.log('New group created');
          if (err) {
            handleError(err, res, 500);
            return;
          }

      });
    }
    res.json(system);
  });
}

module.exports = {
  getSystems: getSystems,
  addSystem: addSystem
}