var ctrl = angular.module("mockapp.controllers",['mockapp.services','mockapp.factories','ngFileSaver'])

    .controller('authController', ['$scope','authService',
        function($scope,authService) {
            $scope.loginUser = function(credentials) {
                authService.login(credentials.username, credentials.password);
            };
    }])

  .controller("templateController", ['$scope', 'templateService', 'ctrlConstants',
    function ($scope, templateService, ctrlConstants) {
      $scope.uploadSuccessHint = '';
      $scope.uploadErrMessage = '';
      $scope.importDoc = function () {
        $scope.uploadSuccessHint = '';
        $scope.uploadErrMessage = '';
        if ($scope.importTemp.name.endsWith('.json')) {
          $scope.uploadSuccessHint = ctrlConstants.SUCCESS;
          $scope.uploadErrMessage = '';
        } else {
          $scope.uploadErrMessage = ctrlConstants.IMPORT_ERR_MSG;
          $scope.uploadSuccessHint = '';
        }
      };
      $scope.publish = function () {
        templateService.importTemplate($scope.previewTemp);
      };
    }])

    .controller("myMenuAppController", ['$scope', 'apiHistoryService', 'sutService', 'suggestionsService', 'helperFactory', 'ctrlConstants', 
        function($scope,apiHistoryService,sutService,suggestionsService,helperFactory,ctrlConstants){
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
              if ($scope.sutChecked == false){
                  $scope.sutlist = sutService.getAllSUT();
                  $scope.groupMessage = "";
               }
            };

            $scope.checkDuplicateGroup = function (){
              var count=0;
              $scope.groupMessage = "";
              if($scope.sutChecked == true){
                for(var i=0; i<$scope.sutlist.length;i++){
                 if($scope.sutlist[i].name == $scope.servicevo.sut.name)
                 {
                   count++;
                 }
                }
                if(count!=0){
                  $scope.groupMessage = ctrlConstants.GRP_ALREADY_EXIST_MSG;
                }}
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

            $scope.removeRRPair = function(index) {
              $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DEL_CONFIRM_TITLE);
              $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.DEL_CONFIRM_RRPAIR_BODY);
              $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DEL_CONFIRM_FOOTER);
              $('#genricMsg-dialog').modal('toggle');
              $scope.rrPairNo = index;
              $('#modal-btn-yes').on("click", function () {
                  $scope.servicevo.rawpairs.splice($scope.rrPairNo,1);
                  $scope.$apply();
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
                $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DUP_REQ_ERR_TITLE);
                $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.DUP_REQ_ERR_BODY);
                $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DUPLICATE_CONFIRM_FOOTER);
                $('#genricMsg-dialog').modal('toggle');
              } else {
                apiHistoryService.publishServiceToAPI(servicevo);
              }
            }
            catch (e) {
              $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
              $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
              $('#genricMsg-dialog').modal('toggle');
            }
          };
    }])

    .controller("createRecorderController", ['$scope', 'apiHistoryService', 'sutService', 'suggestionsService', 'helperFactory', 'ctrlConstants', 
      function($scope,apiHistoryService,sutService,suggestionsService,helperFactory,ctrlConstants){
        $scope.sutlist = sutService.getAllSUT();
        $scope.servicevo = {};
        $scope.servicevo.matchTemplates = [{ id: 0, val: '' }];
        $scope.possibleHeaders = suggestionsService.getPossibleHeaders();
        $scope.servicevo.reqHeadersArr = [{id:0}];
        $scope.dropdown = function() {
              if ($scope.sutChecked == false){
                  $scope.sutlist = sutService.getAllSUT();
                  $scope.groupMessage = "";
               }
            };
        $scope.addNewReqHeader = function(service) {
          var newItemNo = service.reqHeadersArr.length;
          service.reqHeadersArr.push({'id':newItemNo});
        };

        $scope.removeReqHeader = function(service) {
          var lastItem = service.reqHeadersArr.length-1;
          service.reqHeadersArr.splice(lastItem);
        };

        $scope.createRecorder = function (servicevo) {
          apiHistoryService.publishRecorderToAPI(servicevo);
        };

    }])
    .controller("viewRecorderController", ['$scope', '$http', '$routeParams', 'apiHistoryService', 'feedbackService', 'suggestionsService', 'helperFactory', 'ctrlConstants', '$timeout',
      function($scope, $http, $routeParams, apiHistoryService, feedbackService, suggestionsService, helperFactory, ctrlConstants,$timeout){
        $scope.statusCodes = suggestionsService.getStatusCodes();
        $scope.possibleHeaders = suggestionsService.getPossibleHeaders();
        var totalRRPairs = 0;

        

        function processRRPairs(rrpairs){
          var rrpairsRaw = [];
          var rrid = 0;
          rrpairs.forEach(function(rr){
            rr.id = rrid++;
            console.log(rr);
            rr.queriesArr = [];
            rr.reqHeadersArr = [];
            rr.resHeadersArr = [];
            rr.method = rr.verb;

            if (rr.payloadType === 'JSON') {
              rr.requestpayload = JSON.stringify(rr.reqData);
              rr.responsepayload = JSON.stringify(rr.resData);

              //Handle empty JSON object- stringify surrounds in "" 
              if(rr.responsepayload == "\"[]\"" || rr.responsepayload == "\"{}\""){
                rr.responsepayload = rr.responsepayload.substring(1,3);
              }
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

            rrpairsRaw.push(rr);
          });
          return rrpairsRaw;
        }

        //Polls for new data + applies every X millis
        function pollForNewRRPair(delay){
          $timeout(function(){
              apiHistoryService.getRecordingRRPairsWithIndex($routeParams.id,totalRRPairs).then(function(response){
                if(response.data.length){
                  console.log(response.data);
                  var rrpairs = processRRPairs(response.data);
                  rrpairs.forEach(function(rr){
                    rr.id = totalRRPairs++;
                    
                  });
                  $scope.servicevo.rawpairs = $scope.servicevo.rawpairs.concat(rrpairs);
                  console.log(rrpairs);
                }
                if($routeParams.id)
                  pollForNewRRPair(delay);
            }).catch(function(err){
                if($routeParams.id)
                  pollForNewRRPair(delay);
            });
          }
          
          ,delay);

        }
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

        $scope.removeReqHeader = function(rr) {
          var lastItem = rr.reqHeadersArr.length-1;
          rr.reqHeadersArr.splice(lastItem);
        };

        $scope.addNewResHeader = function(rr) {
          var newItemNo = rr.resHeadersArr.length;
          rr.resHeadersArr.push({'id':newItemNo});
        };

        $scope.addNewReqHeader = function(rr) {
          var newItemNo = rr.reqHeadersArr.length;
          rr.reqHeadersArr.push({'id':newItemNo});
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
        //Get this recorder's data
        apiHistoryService.getRecordingById($routeParams.id)
        .then(function(response) {
          console.log(response);
          var recorder = response.data;
          var service = recorder.service;
          $scope.servicevo = {
            id: service._id,
            sut: service.sut,
            name: service.name,
            type: service.type,
            basePath: service.basePath
          };
          $scope.servicevo.matchTemplates = [{ id: 0, val: '' }];
          $scope.servicevo.rawpairs = processRRPairs(service.rrpairs);
          totalRRPairs = service.rrpairs.length;
          

          pollForNewRRPair(3000);
        });

        $scope.publishService = function(servicevo) {
          try {
            if (helperFactory.isDuplicateReq(servicevo)) {
            $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DUP_REQ_ERR_TITLE);
            $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.DUP_REQ_ERR_BODY);
            $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DUPLICATE_CONFIRM_FOOTER);
            $('#genricMsg-dialog').modal('toggle');
            } else {
              apiHistoryService.publishServiceToAPI(servicevo, false,true);

            }
          }
          catch(e) {
            console.log(e);
            $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
            $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
            $('#genricMsg-dialog').modal('toggle');
          }
        };


    }])
    .controller("updateController", ['$scope', '$http', '$routeParams', 'apiHistoryService', 'feedbackService', 'suggestionsService', 'helperFactory', 'ctrlConstants', 
        function($scope, $http, $routeParams, apiHistoryService, feedbackService, suggestionsService, helperFactory, ctrlConstants){
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
                      delayMax: service.delayMax,
                      txnCount: service.txnCount,
                      basePath: service.basePath,
                      
                    };
                    if(service.lastUpdateUser){
                      $scope.servicevo.lastUpdateUser = service.lastUpdateUser.uid;
                    }
                    if(service.createdAt){
                      $scope.servicevo.createdAt = service.createdAt;
                    }
                    if(service.updatedAt){
                      $scope.servicevo.updatedAt = service.updatedAt;
                    }

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
                        rr.requestpayload = JSON.stringify(rr.reqData, null, 4);
                        rr.responsepayload = JSON.stringify(rr.resData, null, 4);

                        //Handle empty JSON object- stringify surrounds in "" 
                        if(rr.responsepayload == "\"[]\"" || rr.responsepayload == "\"{}\""){
                          rr.responsepayload = rr.responsepayload.substring(1,3);
                        }
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

            $scope.removeRRPair = function(index) {
              $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DEL_CONFIRM_TITLE);
              $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.DEL_CONFIRM_RRPAIR_BODY);
              $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DEL_CONFIRM_FOOTER);
              $('#genricMsg-dialog').modal('toggle');
              $scope.rrPairNo = index;
              $('#modal-btn-yes').on("click", function () {
                  $scope.servicevo.rawpairs.splice($scope.rrPairNo,1);
                  $scope.$apply();
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
                $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DUP_REQ_ERR_TITLE);
                $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.DUP_REQ_ERR_BODY);
                $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DUPLICATE_CONFIRM_FOOTER);
                $('#genricMsg-dialog').modal('toggle');
                } else {
                  apiHistoryService.publishServiceToAPI(servicevo, true);
                }
              }
              catch(e) {
                $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
                $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
                $('#genricMsg-dialog').modal('toggle');
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
                    $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').modal('toggle');
              });
            };

          $scope.totalDisplayed = 10;

          $scope.loadMore = function () {
            $scope.totalDisplayed += 10;
          };

          //To Show Service Success Modal when a new service is created.
          if($routeParams.frmWher=='frmServCreate'){
            $http.get('/api/services/' + $routeParams.id)
              .then(function(response) {
                  var data = response.data;
                  console.log(data);
                  feedbackService.displayServiceInfo(data);
              })
              .catch(function(err) {
                  console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').modal('toggle');
              });
            $('#success-modal').modal('toggle');
          }
    }])
    .controller("recorderListController", ['$scope', '$http', '$timeout', 'sutService', 'feedbackService', 'apiHistoryService', 'userService', 'authService', 'FileSaver', 'Blob', 'ctrlConstants', 
    function($scope,$http,$timeout,sutService,feedbackService,apiHistoryService,userService,authService,FileSaver,Blob,ctrlConstants){
      $scope.sutlist = sutService.getAllSUT();
      $scope.userlist = userService.getAllUsers();
      $scope.recordingList = [];
      apiHistoryService.getRecordings().then(function(response){
        var data = response.data;
        $scope.recordingList = data;
      });


      $scope.deleteRecording = function (recording) {
        $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DEL_CONFIRM_TITLE);
        $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.DEL_REC_CONFIRM_BODY);
        $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DEL_CONFIRM_FOOTER);
        $('#genricMsg-dialog').modal('toggle');
        $('#modal-btn-yes').on("click", function () {
          apiHistoryService.deleteRecording(recording._id)
            .then(function (response) {

              $scope.recordingList.forEach(function (elem, i, arr) {
                if (elem._id === recording._id)
                  arr.splice(i, 1);
              });
            })
            .catch(function (err) {
              console.log(err);
            });
        });
      };


    }])

    .controller("serviceHistoryController", ['$scope', '$http', '$timeout', 'sutService', 'feedbackService', 'apiHistoryService', 'userService', 'authService', 'FileSaver', 'Blob', 'ctrlConstants', 
        function($scope,$http,$timeout,sutService,feedbackService,apiHistoryService,userService,authService,FileSaver,Blob,ctrlConstants){
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

          $scope.deleteService = function (service) {
            $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DEL_CONFIRM_TITLE);
            $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.DEL_CONFIRM_BODY);
            $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DEL_CONFIRM_FOOTER);
            $('#genricMsg-dialog').modal('toggle');
            $('#modal-btn-yes').on("click", function () {
              apiHistoryService.deleteServiceAPI(service)
                .then(function (response) {
                  var data = response.data;
                  console.log(data);
                  $scope.servicelist.forEach(function (elem, i, arr) {
                    if (elem._id === data.id)
                      arr.splice(i, 1);
                  });
                })
                .catch(function (err) {
                  console.log(err);
                });
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

                if (service.basePath) {
                  service.basePath = service.basePath.replace('/' + service.sut.name, '');
                }
                
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
                      $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(ctrlConstants.PUB_FAIL_ERR_BODY);
                      $('#genricMsg-dialog').modal('toggle');
                });
            };
    }])

    .controller("dataGenController", ['$scope', '$parse', 'FileSaver', 'Blob', 'genDataService', 'ctrlConstants', 
      function($scope, $parse, FileSaver, Blob, genDataService, ctrlConstants){
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
                  return alert(ctrlConstants.DATAGEN_ALERT_MSG_1000ROWS);
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


    .controller("mainController", ['$rootScope', '$location', 'authService', 'ctrlConstants', 
        function($rootScope,$location,authService,ctrlConstants){
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
              $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.REG_SUCCESS_TITLE);
              $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.REG_SUCCESS_BODY);
              $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.CLOSE_PRMRY_BTN_FOOTER);
              $('#genricMsg-dialog').modal('toggle');
            }
    }])

    .controller("bulkUploadController", ['$scope', 'sutService' , 'zipUploadAndExtractService', 'publishExtractedRRPairService', 'ctrlConstants', 
    function($scope, sutService, zipUploadAndExtractService, publishExtractedRRPairService, ctrlConstants) {
      $scope.sutlist = sutService.getAllSUT();
      $scope.bulkUpload = {};
      $scope.dropdown = function () {
        if ($scope.sutChecked == false) {
          $scope.sutlist = sutService.getAllSUT();
          $scope.groupMessage = "";
        }
      };

      $scope.checkDuplicateGroup = function (){
         var count=0;
        $scope.groupMessage = "";
        if($scope.sutChecked == true){
          for(var i=0; i<$scope.sutlist.length;i++){
           if($scope.sutlist[i].name == $scope.bulkUpload.sut.name)
           {
             count++;
           }
          }
          if(count!=0){
            $scope.groupMessage = ctrlConstants.GRP_ALREADY_EXIST_MSG;
          }}
      };
      $scope.uploadAndExtractZip = function () {
        $scope.uploadSuccessMessage = "";
        $scope.uploadErrMessage = "";
        $scope.uploaded_file_name_id = "";
        if ($scope.uploadRRPair) {
          $scope.uploadSuccessMessage = "";
          $scope.uploadErrMessage = "";
          if($scope.uploadRRPair.name.endsWith(".zip"))
          {
            zipUploadAndExtractService.zipUploadAndExtract($scope.uploadRRPair, function (file_upload_name_id) {
              if (file_upload_name_id) {
                $scope.uploadSuccessMessage = ctrlConstants.BULK_UPLOAD_SUCCESS_MSG + $scope.uploadRRPair.name;
                $scope.uploadErrMessage = ""
                $scope.uploaded_file_name_id = file_upload_name_id;
              } else {
                $scope.uploadErrMessage = ctrlConstants.BULK_UPLOAD_FAILURE_MSG + $scope.uploadRRPair.name;
                $scope.uploadSuccessMessage = "";
              }
            });
          }
          else{
            $scope.uploadErrMessage = ctrlConstants.BULK_UPLOAD_FILE_TYPE_FAILURE_MSG + $scope.uploadRRPair.name;
            $scope.uploadSuccessMessage = "";
          }
        }
      };
      $scope.publishExtractedRRPairFiles = function (bulkUpload) {
        publishExtractedRRPairService.publishExtractedRRPair(bulkUpload, $scope.uploaded_file_name_id, function (message){
          $scope.uploadErrMessage = message;
          $scope.uploadSuccessMessage = "";
        });
      };
}])

.controller("specController", ['$scope','$routeParams' , 'sutService', 'specUploadService', 'publishSpecService', 'ctrlConstants', 
        function($scope, $routeParams, sutService, specUploadService, publishSpecService, ctrlConstants) {
          $scope.sutlist = sutService.getAllSUT();
          $scope.spec = {}; 
          $scope.spec.type = $routeParams.specType;
          if ($scope.spec.type == 'openapi') { $scope.spec.heading = 'OpenAPI' } else if ($scope.spec.type == 'wsdl') { $scope.spec.heading = 'WSDL' }

          $scope.dropdown = function () {
            if ($scope.sutChecked == false) {
              $scope.sutlist = sutService.getAllSUT();
              $scope.groupMessage = "";
            }
          };
          
          $scope.checkDuplicateGroup = function (){
           var count=0;
            $scope.groupMessage = "";
            if($scope.sutChecked == true){
              for(var i=0; i<$scope.sutlist.length;i++){
               if($scope.sutlist[i].name == $scope.spec.sut.name)
               {
                 count++;
               }
              }
              if(count!=0){
                $scope.groupMessage = ctrlConstants.GRP_ALREADY_EXIST_MSG;
              }}
          };
          
          $scope.callUploadSpec = function () {
            $scope.uploadSuccessMessage = "";
            $scope.uploadErrMessage = "";
            $scope.uploaded_file_name_id = "";
            if ($scope.uploadSpec) {
              $scope.uploadSuccessMessage = "";
              $scope.uploadErrMessage = "";
              if (($scope.spec.type == 'openapi' && ($scope.uploadSpec.name.endsWith(".yaml") || $scope.uploadSpec.name.endsWith(".yml") || $scope.uploadSpec.name.endsWith(".json")))
                || ($scope.spec.type == 'wsdl' && $scope.uploadSpec.name.endsWith(".wsdl"))) {
                specUploadService.specUpload($scope.uploadSpec, function (uploaded_file_id) {
                  if (uploaded_file_id) {
                    $scope.uploadSuccessMessage = ctrlConstants.SPEC_UPLOAD_SUCCESS_MSG + $scope.uploadSpec.name;
                    $scope.uploaded_file_id = uploaded_file_id;
                    $scope.uploadErrMessage = "";
                  } else {
                    $scope.uploadErrMessage = ctrlConstants.SPEC_UPLOAD_FAILURE_MSG + $scope.uploadSpec.name;
                    $scope.uploadSuccessMessage = "";
                  }
                });
              }
              else {
                $scope.uploadErrMessage = ctrlConstants.SPEC_FILE_TYPE_UPLOAD_ERROR + $scope.uploadSpec.name;
                $scope.uploadSuccessMessage = "";
              }
            }
          };
          
          $scope.publishspec = function (spec) {
            $scope.uploadSuccessMessage = "";
            $scope.uploadErrMessage = "";
            //conditions are complex here. Any change will break validations. - Pradeep
            if ((typeof spec.url !== 'undefined' && spec.url !== "" && $scope.spec.type == 'openapi' && (spec.url.endsWith(".yaml") || spec.url.endsWith(".yml") || spec.url.endsWith(".json")))
              || (typeof spec.url !== 'undefined' && spec.url !== "" && $scope.spec.type == 'wsdl' && spec.url.endsWith("?wsdl"))
              || ((typeof spec.url == 'undefined' || spec.url == "") && $scope.uploadSpec && $scope.spec.type == 'openapi' && ($scope.uploadSpec.name.endsWith(".yaml") || $scope.uploadSpec.name.endsWith(".yml")  || $scope.uploadSpec.name.endsWith(".json")))
              || ((typeof spec.url == 'undefined' || spec.url == "") && $scope.uploadSpec && $scope.spec.type == 'wsdl' && $scope.uploadSpec.name.endsWith(".wsdl"))
            ) {
              var filename; var file_id;
              if ($scope.uploadSpec || $scope.uploaded_file_id) {
                file_id = $scope.uploaded_file_id;
                filename = $scope.uploadSpec.name;
              } else {
                file_id = "";
                filename = "";
              }
              publishSpecService.publishSpec(spec, file_id, filename);
            } else {
              $scope.uploadErrMessage = ctrlConstants.SPEC_FILE_TYPE_URL_PUBLISH_ERROR;
              $scope.uploadSuccessMessage = "";
            }
          };
    }])
    ;

//Put all the hard coding or constants here for controller.      
ctrl.constant("ctrlConstants", {
  "DUP_REQ_ERR_TITLE" : "Duplicate Request Error",
  "DUP_REQ_ERR_BODY" : "Two Requests are same. Either change request data or relative path of duplicate requests.",
  "PUB_FAIL_ERR_TITLE" : "Publish Failure Error",
  "PUB_FAIL_ERR_BODY" : "Please ensure your request / response pairs are well formed.",
  "DUP_RECORDER_PATH_TITLE" : "Publish Failure: Duplicate Path",
  "DUP_RECORDER_PATH_BODY" : "This recorder's group and path overlap with an active recorder.",
  "REG_SUCCESS_TITLE" : "REGISTRATION SUCCESS",
  "REG_SUCCESS_BODY" : "<p><center><span style='color:#008000;font-weight:bold;font-size: 50px;'>&#x2714;</span><br></br><span style='font-weight:bold;font-size: 16px;'>Registration completed successfully</span><br></br><span>Thank you. You can log in for service virtualization now</span></center></p>",
  "CLOSE_PRMRY_BTN_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-lg btn-primary">Close</button>', 
  "DATAGEN_ALERT_MSG_1000ROWS" : "You may generate up to 1,000 rows of data at a time. Utilize the row id index for more.",
  "DEL_CONFIRM_TITLE" : "Delete Confirmation",
  "DEL_CONFIRM_BODY" : "Do you really want to delete this service ?",
  "DEL_REC_CONFIRM_BODY" : "Do you really want to delete this recording?",
  "DEL_CONFIRM_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-warning" id="modal-btn-yes">Yes</button><button type="button" data-dismiss="modal" class="btn btn-default" id="modal-btn-no">No</button>',
  "DEL_CONFIRM_RRPAIR_BODY" : 'Do you really want to delete this RRPair ?',
  "BULK_UPLOAD_SUCCESS_MSG" : "Bulk Upload Success! File Uploaded - ",
  "BULK_UPLOAD_FAILURE_MSG" : "Unexpected Error. Bulk Upload Fail. File Uploaded - ",
  "BULK_UPLOAD_FILE_TYPE_FAILURE_MSG" : "Uploaded file type is not zip. File Uploaded - ",
  "SPEC_UPLOAD_SUCCESS_MSG" : "Spec Upload Success! File Uploaded - ",
  "SPEC_UPLOAD_FAILURE_MSG" : "Unexpected Error. Spec Upload Fail. File Uploaded - ",
  "SPEC_FILE_TYPE_URL_PUBLISH_ERROR" : "Your uploaded file type Or URL don't match with Spec type.",
  "SPEC_FILE_TYPE_UPLOAD_ERROR" : "Upload Fail - Your uploaded file type don't match with Spec type. Uploaded File - ",
  "DUPLICATE_CONFIRM_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-danger">Back</button>',
  "IMPORT_ERR_MSG" : "You should upload only correct json file.",
  "SUCCESS" : "success",
  "GRP_ALREADY_EXIST_MSG" : "Group Name Already exist.",
});
