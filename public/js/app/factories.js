var fact = angular.module("mockapp.factories",[]);

fact.factory('sutFactory', ['$http', function($http) {
    return {
        getAllSUT: function() {
          var sutlist = [];

          $http.get('/api/systems')

          .then(function(response) {
              var data = response.data;
              console.log(data);

              data.forEach(function(sutData) {
                var sut = {
                  name: sutData.name
                };

                sutlist.push(sut);
              });
          })

          .catch(function(err) {
              console.log(err);
          });

          return sutlist;
        }
    };
}]);

fact.factory('userFactory', ['$http', function($http) {
    return {
        getAllUsers: function() {
          var userlist = [];

          $http.get('/api/users')

          .then(function(response) {
              var data = response.data;
              console.log(data);

              data.forEach(function(userData) {
                var user = {
                  name: userData.uid
                };

                userlist.push(user);
              });
          })

          .catch(function(err) {
              console.log(err);
          });

          return userlist;
        }
    };
}]);

fact.factory('headersFactory', ['$http', function($http) {
    return {
        getPossibleHeaders: function() {
          var headersList = [];

          $http.get('/data/headers.json')

          .then(function(response) {
              var data = response.data;
              data.forEach(function(header) {
                  headersList.push(header);
              });
          })

          .catch(function(err) {
              console.log(err);
          });

          return headersList;
        }
    };
}]);

fact.factory('statusCodesFactory', ['$http', function($http) {
    return {
        getStatusCodes: function() {
          var codesList = [];

          $http.get('/data/statuses.json')

          .then(function(response) {
              var data = response.data;
              data.forEach(function(status) {
                  codesList.push(status);
              });
          })

          .catch(function(err) {
              console.log(err);
          });

          return codesList;
        }
    };
}]);

fact.factory('helperFactory', [function () {
    return {
        isDuplicateReq: function (servicevo) {
            var isSameReq = false;
            LOOP1:
            for (var i = 0; i < servicevo.rawpairs.length - 1; i++) {
                var obj1 = servicevo.rawpairs[i];
                for (var j = i + 1; j < servicevo.rawpairs.length; j++) {
                    var obj2 = servicevo.rawpairs[j];
                    var isAnyReqPairDuplicate = true;
                    LOOP2:
                    for (var ky in obj1) {
                        var key, value;
                        if (obj1.hasOwnProperty(ky)) {
                            key = ky;
                            value = obj1[ky];
                        }
                        LOOP3:
                        for (var ki in obj2) {
                            var k, v;
                            if (obj2.hasOwnProperty(ki)) {
                                k = ki;
                                v = obj2[ki];
                            }
                            if (key == 'id' || key == 'resHeadersArr' || key == '$$hashKey' || key == 'responsepayload' ||
                                key == 'resStatus' || key == 'queries' || key == 'resHeaders' || key == 'reqHeaders' ||
                                key == 'reqData' || key == 'resData' || key == 'verb' || key == '_id') break;
                            else if (key !== k || k == 'id' || key == 'resHeadersArr' || key == '$$hashKey' || key == 'responsepayload' ||
                                key == 'resStatus' || key == 'queries' || key == 'resHeaders' || key == 'reqHeaders' ||
                                key == 'reqData' || key == 'resData' || key == 'verb' || key == '_id') continue;
                            else if (
                                ['path'].includes(key) && ['path'].includes(k) && !angular.equals(v, value)
                                || ['queriesArr'].includes(key) && ['queriesArr'].includes(k) && !angular.equals(v, value)
                                || ['reqHeadersArr'].includes(key) && ['reqHeadersArr'].includes(k) && !angular.equals(v, value)
                                || ['method', 'payloadType', 'requestpayload', 'path', 'queriesArr', 'reqHeadersArr'].includes(key)
                                && !angular.equals(v, value)
                            ) {
                                isAnyReqPairDuplicate = false;
                                break LOOP2;
                            } else {
                                break LOOP3;
                            }
                        }
                    }
                    if (isAnyReqPairDuplicate) {
                        isSameReq = true;
                        break LOOP1;
                    }
                }
            };
            return isSameReq;
        }
    };
}]);
