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

/*
//token expiration logout
fact.factory('authInterceptorService', ['$q', '$location', function ($q, $location) {
    var responseError = function (rejection) {
        if (rejection.status === 403) {
            authService.logout();
            $location.path('login');
        }
        return $q.reject(rejection);
    };

    return {
        responseError: responseError
    };
}]);
*/