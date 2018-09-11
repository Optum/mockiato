var pm2 = require('pm2');

function getWorkerIds() {
  return new Promise(function(resolve, reject) {
    const pm2_worker_ids = [];

    pm2.connect(function (err) {
      if (err) return reject(err);
      pm2.list(function (err, data) {
        if (err) return reject(err);

        for (var i in data) {
          if (data.hasOwnProperty(i)) {
            pm2_worker_ids.push(data[i].pm2_env.pm_id);
          }
        }

        resolve(pm2_worker_ids);
        pm2.disconnect(function () {});
      });
    });
  });
}

function messageAll(message, pm2_worker_ids) {
  pm2.connect(function() {
    for (var i in pm2_worker_ids) {
      if (pm2_worker_ids.hasOwnProperty(i)) {
        pm2.sendDataToProcessId(pm2_worker_ids[i], { // target pm_id here...
          type: 'message:serviceId',
          data: message, // your actual data object you want to pass to the worker
          id: pm2_worker_ids[i], // ... and target pm_id here
          topic: 'service-register'
        }, function (err, res) {});
      }
    }

    pm2.disconnect(function () {});
  });
}

function reloadAll() {
  pm2.connect(true, function(err) {
    if (err) {
      debug(err);
    }

    pm2.reload('all', function(err, proc) {
      if (err) {
        debug(err);
      }

      pm2.disconnect();
    });
  });
}

module.exports = {
  getWorkerIds: getWorkerIds,
  messageAll: messageAll,
  reloadAll: reloadAll
}