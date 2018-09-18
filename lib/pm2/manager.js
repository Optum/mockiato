var pm2 = require('pm2');

function messageAll(message) {
  return new Promise(function(resolve, reject) {
    const pm2_worker_ids = [];

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

        for (let j in pm2_worker_ids) {
          if (pm2_worker_ids.hasOwnProperty(j)) {
            pm2.sendDataToProcessId(pm2_worker_ids[j], { // target pm_id here...
              type: 'message:serviceId',
              data: message, // your actual data object you want to pass to the worker
              id: pm2_worker_ids[j], // ... and target pm_id here
              topic: 'service-register'
            });
          }
        }

        resolve(pm2_worker_ids);
        pm2.disconnect();
      });
    });
  });
}

// function messageAll(message, pm2_worker_ids) {
//   // pm2.connect(function(err) {
//   //   if (err) {
//   //     //pm2.disconnect();
//   //     return;
//   //   }
//     for (let i in pm2_worker_ids) {
//       if (pm2_worker_ids.hasOwnProperty(i)) {
//         pm2.sendDataToProcessId(pm2_worker_ids[i], { // target pm_id here...
//           type: 'message:serviceId',
//           data: message, // your actual data object you want to pass to the worker
//           id: pm2_worker_ids[i], // ... and target pm_id here
//           topic: 'service-register'
//         });
//       }
//     }
//   //});
// }

module.exports = {
  messageAll: messageAll
};