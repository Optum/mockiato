var pm2 = require('pm2');

function messageAll(message) {
  return new Promise(function(resolve, reject) {
    const pm2_worker_ids = [];

    if (process.env.MOCKIATO_MODE === 'single') {
      return resolve(pm2_worker_ids);
    }

    pm2.connect(true, function(err) {
      if (err) {
        pm2.disconnect();
        return reject(err);
      }
      pm2.list(function(err, data) {
        if (err) {
          pm2.disconnect();
          return reject(err);
        }

        for (let i in data) {
          if (data.hasOwnProperty(i)) {
            if (process.pid !== data[i].pid)
              pm2_worker_ids.push(data[i].pm2_env.pm_id);
          }
        }

        pm2_worker_ids.forEach(function(id){
          setTimeout(function() {
            pm2.sendDataToProcessId(id, {
              type: 'process:msg',
              data: message, // your actual data object you want to pass to the worker
              id: id, // ... and target pm_id here
              topic: 'service-register'
            }, function(err, result) { 
              if (err) console.error(err);
            });
          }, 100);
        });

        resolve(pm2_worker_ids);
        pm2.disconnect();
      });
    });
  });
}

module.exports = {
  messageAll: messageAll
};