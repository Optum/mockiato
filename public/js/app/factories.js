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
                var rawPair1 = servicevo.rawpairs[i];
                for (var j = i + 1; j < servicevo.rawpairs.length; j++) {
                    var rawPair2 = servicevo.rawpairs[j];
                    var isAnyReqPairDuplicate = true;
                    LOOP2:
                    for (var ky in rawPair1) {
                        var key1, value1;
                        if (rawPair1.hasOwnProperty(ky)) {
                            var filterVal = rawPair1[ky];
                            if (['queriesArr', 'reqHeadersArr'].includes(ky)) {
                                filterVal = filterVal.filter(o => o.k != undefined);
                            }
                            key1 = ky;
                            value1 = filterVal;
                        }
                        LOOP3:
                        for (var ki in rawPair2) {
                            var key2, value2;
                            if (rawPair2.hasOwnProperty(ki)) {
                                var filterVal = rawPair2[ki];
                                if (['queriesArr', 'reqHeadersArr'].includes(ki)) {
                                    filterVal = filterVal.filter(o => o.k != undefined);
                                }
                                key2 = ki;
                                value2 = filterVal;
                            }
                            if (key1 == 'id' || key1 == 'resHeadersArr' || key1 == '$$hashKey' || key1 == 'responsepayload' ||
                                key1 == 'resStatus' || key1 == 'queries' || key1 == 'resHeaders' || key1 == 'reqHeaders' ||
                                key1 == 'reqData' || key1 == 'resData' || key1 == 'verb' || key1 == '_id') break;
                            else if (key1 !== key2 || key2 == 'id' || key1 == 'resHeadersArr' || key1 == '$$hashKey' || key1 == 'responsepayload' ||
                                key1 == 'resStatus' || key1 == 'queries' || key1 == 'resHeaders' || key1 == 'reqHeaders' ||
                                key1 == 'reqData' || key1 == 'resData' || key1 == 'verb' || key1 == '_id') continue;
                            else if (['method', 'payloadType', 'path', 'queriesArr', 'reqHeadersArr', 'requestpayload'].includes(key1) &&
                                !angular.equals(value2, value1)
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
