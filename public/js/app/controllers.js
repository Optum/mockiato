var ctrl = angular.module("mockapp.controllers",['mockapp.services','mockapp.factories','ngFileSaver'])

    .controller('authController', ['$scope','authService',
        function($scope,authService) {
            $scope.loginUser = function(credentials) {
                authService.login(credentials.username, credentials.password);
            };
    }])

    .controller("templateController", ['$scope', 'templateService' ,
        function($scope,templateService) {
            $scope.import = function(){
                templateService.importTemplate($scope.previewTemp);
            };
    }])

    .controller("specController", ['$scope', 'sutService' , 'specService', 
        function($scope, sutService, specService) {
          $scope.sutlist = sutService.getAllSUT();
          $scope.spec = {}; 

          $scope.dropdown = function () {
            if ($scope.sutChecked == false) {
              $scope.sutlist = sutService.getAllSUT();
            }
          };
          
          $scope.publishspec = function (spec) {
            specService.publishFromSpec(spec, $scope.uploadSpec);
          };
    }])

    .controller("myMenuAppController", ['$scope', 'apiHistoryService', 'sutService', 'suggestionsService', 'helperFactory',
        function($scope,apiHistoryService,sutService,suggestionsService, helperFactory){
            $scope.sutlist = sutService.getAllSUT();
            $scope.servicevo = {};
            $scope.servicevo.matchTemplates = [{ id: 0, val: '' }];
            $scope.servicevo.rawpairs = [{
                id: 0,
                queriesArr: [{
                  id: 0
                }],
                reqHeadersArr: [{
                  id: 0,
                }],
                resHeadersArr: [{
                  id: 0
                }]
            }];

            $scope.statusCodes = suggestionsService.getStatusCodes();
            $scope.possibleHeaders = suggestionsService.getPossibleHeaders();

            $scope.dropdown = function() {
              if($scope.sutChecked == false){
                  $scope.sutlist = sutService.getAllSUT();
               }
            };

            $scope.addTemplate = function() {
              $scope.servicevo.matchTemplates.push({ id: 0, val: '' });
            };

            $scope.removeTemplate = function(index) {
              $scope.servicevo.matchTemplates.splice(index, 1);
            };

            $scope.addNewRRPair = function() {
              var newItemNo = $scope.servicevo.rawpairs.length;
              $scope.servicevo.rawpairs.push({
                  id: newItemNo,
                  queriesArr: [{
                    id: 0
                  }],
                  reqHeadersArr: [{
                    id: 0
                  }],
                  resHeadersArr: [{
                    id: 0
                  }]
              });
            };

            $scope.addNewReqHeader = function(rr) {
              var newItemNo = rr.reqHeadersArr.length;
              rr.reqHeadersArr.push({'id':newItemNo});
            };

            $scope.removeReqHeader = function(rr) {
              var lastItem = rr.reqHeadersArr.length-1;
              rr.reqHeadersArr.splice(lastItem);
            };

            $scope.addNewResHeader = function(rr) {
              var newItemNo = rr.resHeadersArr.length;
              rr.resHeadersArr.push({'id':newItemNo});
            };

            $scope.removeResHeader = function(rr) {
              var lastItem = rr.resHeadersArr.length-1;
              rr.resHeadersArr.splice(lastItem);
            };

            $scope.addQuery = function(rr) {
              var newItemNo = rr.queriesArr.length;
              rr.queriesArr.push({'id':newItemNo});
            };

            $scope.removeQuery = function(rr) {
              var lastItem = rr.queriesArr.length-1;
              rr.queriesArr.splice(lastItem);
            };

            $scope.setContentType = function(rr, type) {
              if (!rr)
                rr = $scope.servicevo.rawpairs[0];
                
              if (rr.reqHeadersArr.length < 2)
                $scope.addNewReqHeader(rr);

              if (rr.resHeadersArr.length < 2)
                $scope.addNewResHeader(rr);

              // set values
              rr.reqHeadersArr[0].v = type;
              rr.resHeadersArr[0].v = type;
              
              rr.reqHeadersArr[0].k = 'Content-Type';
              rr.resHeadersArr[0].k = 'Content-Type';

              $scope.$broadcast('angucomplete-alt:changeInput', 'req-header-0', rr.reqHeadersArr[0].k);
              $scope.$broadcast('angucomplete-alt:changeInput', 'res-header-0', rr.resHeadersArr[0].k);
            };
            
          $scope.publishservice = function (servicevo) {
            try {
              if (helperFactory.isDuplicateReq(servicevo)) {
                $('#dupRequest-modal').modal('toggle');
              } else {
                apiHistoryService.publishServiceToAPI(servicevo);
              }
            }
            catch (e) {
              $('#failure-modal').modal('toggle');
            }
          };
    }])

    .controller("updateController", ['$scope', '$http', '$routeParams', 'apiHistoryService', 'feedbackService', 'suggestionsService', 'helperFactory', 
        function($scope, $http, $routeParams, apiHistoryService, feedbackService, suggestionsService, helperFactory){
            $scope.statusCodes = suggestionsService.getStatusCodes();
            $scope.possibleHeaders = suggestionsService.getPossibleHeaders();

            this.getService = function() {
                apiHistoryService.getServiceById($routeParams.id)

                .then(function(response) {
                    var service = response.data;
                    console.log(service);
                    $scope.servicevo = {
                      id: service._id,
                      sut: service.sut,
                      name: service.name,
                      type: service.type,
                      delay: service.delay,
                      txnCount: service.txnCount,
                      basePath: service.basePath
                    };

                    $scope.servicevo.matchTemplates = [];
                    $scope.servicevo.rawpairs = [];

                    if (service.matchTemplates && service.matchTemplates.length) {
                      service.matchTemplates.forEach(function(template, index) {
                        $scope.servicevo.matchTemplates.push({ id: index, val: template });
                      });
                    }
                    else {
                      $scope.servicevo.matchTemplates.push({ id: 0, val: '' });
                    }

                    var rrid = 0;
                    service.rrpairs.forEach(function(rr){
                      rr.id = rrid;
                      rr.queriesArr = [];
                      rr.reqHeadersArr = [];
                      rr.resHeadersArr = [];
                      rr.method = rr.verb;

                      if (rr.payloadType === 'JSON') {
                        rr.requestpayload = JSON.stringify(rr.reqData);
                        rr.responsepayload = JSON.stringify(rr.resData);
                      }
                      else {
                        rr.requestpayload = rr.reqData;
                        rr.responsepayload = rr.resData;
                      }

                      // map object literals to arrays for Angular view
                      if (rr.reqHeaders) {
                        var reqHeads = Object.entries(rr.reqHeaders);
                        var reqHeadId = 0;
                        reqHeads.forEach(function(elem){
                          var head = {};

                          head.id = reqHeadId;
                          head.k = elem[0];
                          head.v = elem[1];

                          rr.reqHeadersArr.push(head);
                          reqHeadId++;
                        });
                      }
                      else {
                        rr.reqHeadersArr.push({ id: 0 });
                      }

                      if (rr.resHeaders) {
                        var resHeads = Object.entries(rr.resHeaders);
                        var resHeadId = 0;
                        resHeads.forEach(function(elem){
                          var head = {};

                          head.id = resHeadId;
                          head.k = elem[0];
                          head.v = elem[1];

                          rr.resHeadersArr.push(head);
                          resHeadId++;
                        });
                      }
                      else {
                        rr.resHeadersArr.push({ id: 0 });
                      }

                      if (rr.queries) {
                        var qs = Object.entries(rr.queries);
                        var qId = 0;
                        qs.forEach(function(elem){
                          var q = {};

                          q.id = qId;
                          q.k = elem[0];
                          q.v = elem[1];

                          rr.queriesArr.push(q);
                          qId++;
                        });
                      }
                      else {
                        rr.queriesArr.push({ id: 0 });
                      }

                      $scope.servicevo.rawpairs.push(rr);
                      rrid++;
                    });
                })

                .catch(function(err) {
                    console.log(err);
                });
            };
            this.getService();

            $scope.addTemplate = function() {
              $scope.servicevo.matchTemplates.push({ id: 0, val: '' });
            };

            $scope.removeTemplate = function(index) {
              $scope.servicevo.matchTemplates.splice(index, 1);
            };

            $scope.addNewRRPair = function() {
              var newItemNo = $scope.servicevo.rawpairs.length;
              $scope.servicevo.rawpairs.push({
                  id: newItemNo,
                  queriesArr: [{
                    id: 0
                  }],
                  reqHeadersArr: [{
                    id: 0
                  }],
                  resHeadersArr: [{
                    id: 0
                  }]
              });
            };

            $scope.addNewReqHeader = function(rr) {
              var newItemNo = rr.reqHeadersArr.length;
              rr.reqHeadersArr.push({'id':newItemNo});
            };

            $scope.removeReqHeader = function(rr) {
              var lastItem = rr.reqHeadersArr.length-1;
              rr.reqHeadersArr.splice(lastItem);
            };

            $scope.addNewResHeader = function(rr) {
              var newItemNo = rr.resHeadersArr.length;
              rr.resHeadersArr.push({'id':newItemNo});
            };

            $scope.removeResHeader = function(rr) {
              var lastItem = rr.resHeadersArr.length-1;
              rr.resHeadersArr.splice(lastItem);
            };

            $scope.addQuery = function(rr) {
              var newItemNo = rr.queriesArr.length;
              rr.queriesArr.push({'id':newItemNo});
            };

            $scope.removeQuery = function(rr) {
              var lastItem = rr.queriesArr.length-1;
              rr.queriesArr.splice(lastItem);
            };

            $scope.updateService = function(servicevo) {
              try {
                if (helperFactory.isDuplicateReq(servicevo)) {
                  $('#dupRequest-modal').modal('toggle');
                } else {
                  apiHistoryService.publishServiceToAPI(servicevo, true);
                }
              }
              catch(e) {
                $('#failure-modal').modal('toggle');
              }
            };

            $scope.setContentType = function(rr, type) {                
              if (rr.reqHeadersArr.length < 2)
                $scope.addNewReqHeader(rr);

              if (rr.resHeadersArr.length < 2)
                $scope.addNewResHeader(rr);

              // set values
              rr.reqHeadersArr[0].v = type;
              rr.resHeadersArr[0].v = type;
              
              rr.reqHeadersArr[0].k = 'Content-Type';
              rr.resHeadersArr[0].k = 'Content-Type';

              $scope.$broadcast('angucomplete-alt:changeInput', 'req-header-0', rr.reqHeadersArr[0].k);
              $scope.$broadcast('angucomplete-alt:changeInput', 'res-header-0', rr.resHeadersArr[0].k);
            };

            $scope.serviceInfo = function() {
              console.log($routeParams.id);
              $http.get('/api/services/' + $routeParams.id)

              .then(function(response) {
                  var data = response.data;
                  console.log(data);
                  feedbackService.displayServiceInfo(data);
                  $('#serviceInfo-modal').modal('toggle');
              })

              .catch(function(err) {
                  console.log(err);
                  $('#failure-modal').modal('toggle');
              });
            };

          $scope.totalDisplayed = 10;

          $scope.loadMore = function () {
            $scope.totalDisplayed += 10;
          };


    }])


    .controller("serviceHistoryController", ['$scope', '$http', '$timeout', 'sutService', 'feedbackService', 'apiHistoryService', 'userService', 'authService', 'FileSaver', 'Blob',
        function($scope,$http,$timeout,sutService,feedbackService,apiHistoryService,userService,authService,FileSaver,Blob){
            $scope.sutlist = sutService.getAllSUT();
            $scope.userlist = userService.getAllUsers();
            $scope.servicelist = [];

            $scope.filtersSelected = function(sut, user) {
                if (sut && !user) {
                    apiHistoryService.getServiceForSUT(sut.name)

                    .then(function(response) {
                        var data = response.data;
                        console.log(data);
                        $scope.servicelist = data;
                      })

                    .catch(function(err) {
                        console.log(err);
                    });
                }

                else if (user && !sut) {
                    apiHistoryService.getServiceByUser(user.name)

                    .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      $scope.servicelist = data;
                    })

                    .catch(function(err) {
                        console.log(err);
                    });
                }

                else if (user && sut) {
                    apiHistoryService.getServicesFiltered(sut.name, user.name)

                    .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      $scope.servicelist = data;
                    })

                    .catch(function(err) {
                        console.log(err);
                    });
                }
            };
            $scope.filtersSelected(null, { name: authService.getUserInfo().username });

            $scope.clearSelected = function() {
              $scope.selectedSut = null;
              $scope.selectedUser = null;
              $scope.servicelist = [];
            };

            $scope.deleteService = function(service) {
                apiHistoryService.deleteServiceAPI(service)

                .then(function(response) {
                    var data = response.data;
                    console.log(data);
                    $scope.servicelist.forEach(function(elem, i, arr){
                        if (elem._id === data.id)
                            arr.splice(i, 1);
                    });
                })

                .catch(function(err) {
                    console.log(err);
                });
            };

            $scope.toggleService = function(service) {
                apiHistoryService.toggleServiceAPI(service)

                .then(function(response) {
                    var data = response.data;
                    console.log(data);
                    service.running = !service.running;
                })

                .catch(function(err) {
                    console.log(err);
                });
            };

            $scope.exportService = function(serv) {
                // clone the service
                var service = JSON.parse(JSON.stringify(serv));

                // clean up data before export
                delete service._id;
                delete service.sut._id;
                delete service.user;
                delete service.__v;
                delete service.$$hashKey;

                service.basePath = service.basePath.replace('/' + service.sut.name, '');
                service.rrpairs.forEach(function(rr) {
                  delete rr._id;
                });

                var data = new Blob([JSON.stringify(service, null, "  ")], { type: 'application/json;charset=utf-8' });
                FileSaver.saveAs(data, service.name + '.json');
            };

            $scope.serviceInfo = function(serviceID) {
              console.log('printing service id: ' + serviceID);
                $http.get('/api/services/' + serviceID)

                .then(function(response) {
                    var data = response.data;
                    console.log(data);
                    feedbackService.displayServiceInfo(data);
                    $('#serviceInfo-modal').modal('toggle');
                })

                .catch(function(err) {
                    console.log(err);
                    $('#failure-modal').modal('toggle');
                });
            };
    }])

    .controller("dataGenController", ['$scope', '$parse', 'FileSaver', 'Blob', 'genDataService',
      function($scope, $parse, FileSaver, Blob, genDataService){
          $scope.addColumn = newColumn;
          $scope.numRows= 100;
          $scope.gen = {};
          $scope.gen.columns = [];

          //setting some default vals
          $scope.idBool = true;
          $scope.fileType = 'JSON';
          $scope.rowOffset = 0;

          function mapJSON(){
            var dataArr = [];

            for(var c=0; c < $scope.numRows + 1; c++){
              if($scope.idBool){
                var id = $scope.rowOffset;
                dataArr.forEach(function (newJobItem){
                  newJobItem.id = id++;
                });
              }

              for(var i=0; i < $scope.gen.columns.length; i++){
                dataArr.forEach(function (hVal){
                  var header = $scope.gen.columns[i].header;
                  var dataType = $scope.gen.columns[i].dataType;
                  hVal[header] = genDataService.getDataType(dataType);
                });
              }
              dataArr.push({});
            }

            var lastItem = dataArr.length-1;
            dataArr.splice(lastItem);
            return dataArr;
          };

          function mapCSV(){
              var json = mapJSON()
              var fields = Object.keys(json[0])
              var replacer = function(key, value) { return value === null ? '' : value }
              var csv = json.map(function(row){
                return fields.map(function(fieldName){
                  return JSON.stringify(row[fieldName], replacer)
                }).join(',')
              })
              csv.unshift(fields.join(',')) // add header column

              return csv.join('\r\n');
          };

          function map_dl_XML(){
            xmlData = genDataService.json2xml(mapJSON());
            var blob = new Blob([xmlData], {type : 'text/xml;charset=utf-8;'});
            FileSaver.saveAs(blob, 'mockiato-data.xml');
          };

          $scope.printColumns = function() {
                if($scope.numRows > 1000){
                  return alert("You may generate up to 1,000 rows of data at a time. Utilize the row id index for more.");
                }

                if($scope.fileType == "JSON"){
                  downloadJSON(mapJSON());
                }
                else if($scope.fileType == "CSV"){
                  downloadCSV(mapCSV());
                }

                else if($scope.fileType == "XML"){
                  map_dl_XML();
                }

                else {
                  alert("No integration for that file type yet");
                }
          };

          function newColumn() {
              $scope.gen.columns.push({});
          };

          $scope.remColumn = function() {
              var lastItem = $scope.gen.columns.length-1;
              $scope.gen.columns.splice(lastItem);
          };

          function downloadCSV(data){
              var exportFilename = 'mockiato-data';
              var csvData = new Blob([data], {type: 'text/csv;charset=utf-8;'});
              //IE11 & Edge
              if (navigator.msSaveBlob) {
                  navigator.msSaveBlob(csvData, exportFilename);
              } else {
                  //In FF link must be added to DOM to be clicked
                  var link = document.createElement('a');
                  link.href = window.URL.createObjectURL(csvData);
                  link.setAttribute('download', exportFilename);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              }

          };

          function downloadJSON(data){
            var blob = new Blob([JSON.stringify(data, null, "   ")], {type : 'application/json'});
            FileSaver.saveAs(blob, 'mockiato-data.json');
          };

          //setting some default vals
          newColumn();
          $scope.gen.columns[0].header = 'first_name';
          $scope.gen.columns[0].dataType = 'First Name';

          newColumn();
          $scope.gen.columns[1].header = 'last_name';
          $scope.gen.columns[1].dataType = 'Last Name';

          newColumn();
          $scope.gen.columns[2].header = 'email';
          $scope.gen.columns[2].dataType = 'Email Address';

    }])


    .controller("mainController", ['$rootScope', '$location', 'authService',
        function($rootScope,$location,authService){
            if (window.location.port)
              $rootScope.mockiatoHost = 'http://' + window.location.hostname + ':' + window.location.port;
            else
              $rootScope.mockiatoHost = 'http://' + window.location.hostname;

            $rootScope.virt = {
              baseUrl: '',
              type: ''
            };
            $rootScope.virt.operations = [];

            $rootScope.$on("$routeChangeSuccess", function(userInfo) {
                console.log(userInfo);
                $rootScope.virt.operations = [];
            });

            $rootScope.$on("$routeChangeError", function(event, current, previous, eventObj) {
                if (eventObj.authenticated === false) {
                    $location.path("/login");
                }
            });

            $rootScope.logout = function() {
                authService.logout();
                $location.path("/login");
            };

            if (location.href.indexOf('#regS') !== -1) {
              $('#regSuccess-modal').modal('toggle');
            }
    }])
;
