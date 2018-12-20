var serv = angular.module('mockapp.services',['mockapp.factories'])

    .service('authService', ['$http', '$window', '$location', '$rootScope', 'servConstants', 
        function($http, $window, $location, $rootScope, servConstants) {
            var userInfo;

            // handle page refresh
            function init() {
                var storedUserInfo = $window.sessionStorage.getItem('userInfo');
                if (storedUserInfo) {
                    userInfo = JSON.parse(storedUserInfo);
                }

                var storedLoggedIn = $window.sessionStorage.getItem('loggedIn');
                if (storedLoggedIn) {
                    $rootScope.loggedIn = JSON.parse(storedLoggedIn);
                }
            }
            init();

            this.getUserInfo = function() {
                return userInfo;
            };

            this.login = function(username, password) {
                var credentials = {
                    username: username,
                    password: password
                };

                $http.post('/api/login', credentials)

                .then(function(response) {
                    var data = response.data;
                    console.log(data);

                    userInfo = {
                        token: data.token,
                        username: username
                    };

                    // save token in session storage
                    $rootScope.loggedIn = true;
                    $window.sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
                    $window.sessionStorage.setItem('loggedIn', JSON.stringify($rootScope.loggedIn));

                    // redirect user to home
                    $location.path('/');
                })

                .catch(function(err) {
                    console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.LOGIN_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.LOGIN_ERR_BODY);
                    $('#genricMsg-dialog').modal('toggle');
                });
            };

            this.logout = function() {
                $rootScope.loggedIn = false;
                $window.sessionStorage['loggedIn'] = null;
                $window.sessionStorage['userInfo'] = null;
                userInfo = null;
            };
    }])

    //token expiration logout
  .service('authInterceptorService', ['$q', '$window', '$rootScope', '$injector', '$location', function ($q, $window, $rootScope, $injector, $location) {
      var responseError = function (rejection) {
        if (rejection.status === 403) {
          //logout w.o circular dependency
          var injectAuth = $injector.get('authService');
          injectAuth.logout();
          $location.path('login');
          $window.location.reload();
        }
        return $q.reject(rejection);
      };

      return {
        responseError: responseError
      };
    }])

    .service('feedbackService', ['$rootScope',
        function($rootScope) {
          this.displayServiceInfo = function(data) {
            $rootScope.virt.operations = [];
            $rootScope.virt.baseUrl = '/virtual' + data.basePath;
            $rootScope.virt.delay= data.delay;
            $rootScope.virt.delayMax= data.delayMax;
            $rootScope.virt.type = data.type;
            $rootScope.virt.name = data.name;
              data.rrpairs.forEach(function(rr) {
                var op = {
                  'verb': rr.verb,
                  'path': rr.path || '/'
                };

                // append query strings to path
                if (rr.queries) {
                  // trim last slash
                  if (op.path.slice(-1) == '/')
                    op.path = op.path.slice(0,-1);

                  var qs = '?';
                  var qArr = Object.entries(rr.queries);

                  qArr.forEach(function(q) {
                    qs = qs + q[0] + '=' + q[1] + '&';
                  });

                  // trim last &
                  qs = qs.slice(0, -1);
                  
                  op['queries'] = qs;
                }

                $rootScope.virt.operations.push(op);
              });
          };

          this.displayRecorderInfo = function(data){
            $rootScope.virt.operations = [];
            $rootScope.virt.baseUrl = '/recording/live' + data.path;
            $rootScope.virt.delay= data.delay;
            $rootScope.virt.delayMax= data.delayMax;
            $rootScope.virt.type = data.protocol;
            $rootScope.virt.name = data.name;
          }
    }])

    .service('apiHistoryService', ['$http', '$location', 'authService', 'feedbackService', 'xmlService', 'servConstants','$routeParams',
        function($http, $location, authService, feedbackService, xmlService, servConstants,$routeParams) {

            //gets all recordings, unfiltered
            this.getRecordings = function(){
                return $http.get('/api/recording');
            }

            this.getRecordingById = function(id){
              return $http.get('/api/recording/' + id);
            }

            this.getRecordingRRPairsWithIndex = function(id,index){
              return $http.get('/api/recording/' + id + "/" + index);
            }

            this.deleteRecording = function(id){
              return $http.delete('/api/recording/' + id)
            }

            this.getServiceForSUT = function(name) {
                return $http.get('/api/services/sut/' + name);
            };

            this.getServiceByUser = function(name) {
                return $http.get('/api/services/user/' + name);
            };

            this.getServicesFiltered = function(sut, user) {
                return $http.get('/api/services?sut=' + sut + '&user=' + user);
            };

            this.publishServiceToAPI = function(servicevo, isUpdate, isRecording) {
                // clean up autosuggest selections
                servicevo.rawpairs.forEach(function(rr) {
                  var selectedStatus = rr.resStatus;
                  if (selectedStatus && selectedStatus.description) rr.resStatus = selectedStatus.description.value;

                  if (rr.reqHeadersArr && rr.reqHeadersArr.length > 0) {
                    console.log(rr.reqHeadersArr);
                    rr.reqHeadersArr.forEach(function(head) {
                      var selectedHeader = head.k;
                      if (selectedHeader) {
                        if (selectedHeader.description) head.k = selectedHeader.description.name;
                        else if (selectedHeader.originalObject) head.k = selectedHeader.originalObject;
                      }
                    });
                  }

                  if (rr.resHeadersArr && rr.resHeadersArr.length > 0) {
                    rr.resHeadersArr.forEach(function(head) {
                      var selectedHeader = head.k;
                      if (selectedHeader) {
                        if (selectedHeader.description) head.k = selectedHeader.description.name;
                        else if (selectedHeader.originalObject) head.k = selectedHeader.originalObject;
                      }
                    });
                  }
                });

                // build service model for API call
                var rrpairs = [];
                servicevo.rawpairs.forEach(function(rr){
                    var reqPayload;
                    var resPayload;
                    var rrpair = {};

                    // if service type is SOAP, set HTTP method to POST
                    if (servicevo.type === 'SOAP') {
                      rr.method = 'POST';
                    }

                    // if service type is SOAP or MQ, set payload type to XML
                    if (servicevo.type === 'SOAP' || servicevo.type === 'MQ') {
                      rr.payloadType = 'XML';
                    }

                    // parse and display error if JSON is malformed
                    if (rr.payloadType === 'JSON') {
                      try {
                        //Handle empty json object payload
                        if (rr.responsepayload)  {
                          var trimmed = rr.responsepayload.trim();
                          if(trimmed == "{}" || trimmed == "[]"){
                            resPayload = trimmed;
                          }else{
                            resPayload = JSON.parse(rr.responsepayload);
                          }
                        }
                        if (rr.requestpayload) reqPayload = JSON.parse(rr.requestpayload);
                      }
                      catch(e) {
                        console.log(e);
                        throw 'RR pair is malformed';
                      }
                    }
                    // verify that XML is well formed
                    else if (rr.payloadType === 'XML') {
                      var reqValid = true;
                      var resValid = true;

                      if (rr.requestpayload)  reqValid = xmlService.validateXml(rr.requestpayload);
                      if (rr.responsepayload) resValid = xmlService.validateXml(rr.responsepayload);

                      if (reqValid && resValid) {
                        reqPayload = rr.requestpayload;
                        resPayload = rr.responsepayload;
                      }
                      else {
                        throw 'RR pair is malformed';
                      }
                    }
                    else {
                      reqPayload = rr.requestpayload;
                      resPayload = rr.responsepayload;
                    }

                    // convert array of queries to object literal
                    var queries = {};
                    rr.queriesArr.forEach(function(q){
                      queries[q.k] = q.v;
                    });

                    // only save queries if there are any
                    if (Object.keys(queries).length > 0) {
                      rr.queries = queries;
                    }

                    // convert array of response headers to object literal
                    var resHeaders = {};
                    rr.resHeadersArr.forEach(function(headerObj){
                      resHeaders[headerObj.k] = headerObj.v;
                    });

                    // only save headers if there are any
                    if (Object.keys(resHeaders).length > 0) {
                      rr.resHeaders = resHeaders;
                    }

                    // convert array of response headers to object literal
                    var reqHeaders = {};
                    rr.reqHeadersArr.forEach(function(headerObj){
                      reqHeaders[headerObj.k] = headerObj.v;
                    });

                    // only save headers if there are any
                    if (Object.keys(reqHeaders).length > 0) {
                      rr.reqHeaders = reqHeaders;
                    }

                    // only save request data for non-GETs
                    if (rr.method !== 'GET') {
                      rr.reqData = reqPayload;
                    }
                    rr.resData = resPayload;

                    // remove unneccessary properties
                    if(rr.path){
                      if (!isUpdate) {
                        rrpair.path = '/' + rr.path;
                      }
                      else {
                        rrpair.path = rr.path;
                      }
                    }

                    rrpair.verb = rr.method;
                    rrpair.queries = rr.queries;
                    rrpair.payloadType = rr.payloadType;
                    rrpair.reqHeaders = rr.reqHeaders;
                    rrpair.reqData = rr.reqData;
                    rrpair.resStatus = rr.resStatus;
                    rrpair.resHeaders = rr.resHeaders;
                    rrpair.resData = rr.resData;
                    rrpair.label = rr.label;

                    rrpairs.push(rrpair);
                });

                var templates = [];
                servicevo.matchTemplates.forEach(function(template) {
                  templates.push(template.val);
                });

                var servData = {
                    sut: { name: servicevo.sut.name },
                    name: servicevo.name,
                    basePath: '/' + servicevo.basePath,
                    type: servicevo.type,
                    delay: servicevo.delay,
                    delayMax: servicevo.delayMax,
                    matchTemplates: templates,
                    rrpairs: rrpairs
                };

                // publish the virtual service
                var token = authService.getUserInfo().token;

                //add new SUT
                $http.post('/api/systems/', servicevo.sut)
                .then(function(response) {
                    console.log(response.data);
                })
                .catch(function(err) {
                    console.log(err);
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
                      $('#genricMsg-dialog').modal('toggle');
                });

                // update => put (create => post)
                if (!isUpdate) {
                  $http.post('/api/services?token=' + token, servData)
                  .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      if(data.error == 'twoSeviceDiffNameSameBasePath'){
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.TWOSRVICE_DIFFNAME_SAMEBP_ERR_BODY);
                      $('#genricMsg-dialog').modal('toggle');
                      }
                      else{
                      if(isRecording){
                        $http.delete('/api/recording/' + $routeParams.id).then(function(){
                          $location.path('/update/' + data._id + '/frmServCreate');
                        });
                      }else{
                        $location.path('/update/' + data._id + '/frmServCreate');
                      }
                    }
                  })

                  .catch(function(err) {
                    console.log(err);
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_FAIL_ERR_BODY);
                      $('#genricMsg-dialog').modal('toggle');
                  });
                }
                else {
                  $http.put('/api/services/' + servicevo.id + '?token=' + token, servData)

                  .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      feedbackService.displayServiceInfo(data);
                      $('#success-modal').modal('toggle');
                  })

                  .catch(function(err) {
                      console.log(err);
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').modal('toggle');
                  });
                }
            };

            this.getServiceById = function(id) {
                return $http.get('/api/services/' + id);
            };

            this.deleteServiceAPI = function(service) {
                var token = authService.getUserInfo().token;
                return $http.delete('/api/services/' + service._id + '?token=' + token);
            };

            this.toggleServiceAPI = function(service) {
                var token = authService.getUserInfo().token;
                return $http.post('/api/services/' + service._id + '/toggle?token=' + token);
            };

            this.publishRecorderToAPI = function(servicevo){

                //create recorder
                var recorder = {
                  type:servicevo.type,
                  sut:servicevo.sut.name,
                  name:servicevo.name,
                  remoteHost:servicevo.remoteHost,
                  remotePort:servicevo.remotePort,
                  basePath:servicevo.basePath,
                  headerMask:[]
                  
                }

                
                //Extract headers
                for(var i = 0; i < servicevo.reqHeadersArr.length; i ++){
                  var head = servicevo.reqHeadersArr[i];
                  if(head.k)
                    recorder.headerMask.push(head.k.originalObject);
                }
                console.log(servicevo);


                //publish service
                var token = authService.getUserInfo().token;
                $http.put('/api/recording' + '?token=' + token, recorder)
                
                .then(function(response) {
                    var data = response.data;
                    console.log(data);
                    feedbackService.displayRecorderInfo(data);
                    $('#record-success-modal').modal('toggle');
                    $location.path('/viewRecorder/' + data._id);
                })

                .catch(function(err) {
                    console.log(err);
                    if(err.data.error == "OverlappingRecorderPathError"){
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.DUP_RECORDER_PATH_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.DUP_RECORDER_PATH_BODY);
                    }else{
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_FAIL_ERR_TITLE);
                    }
                    $('#genricMsg-dialog').modal('toggle');
                });

            };
    }])

    .service('sutService', ['sutFactory',
        function(sutFactory) {
            this.getAllSUT = function() {
                var sutlist = sutFactory.getAllSUT();
                return sutlist;
            };
    }])

    .service('zipUploadAndExtractService', ['$http', '$location', 'authService', 'servConstants',
    function ($http, $location, authService, servConstants) {
        this.zipUploadAndExtract = function(uploadRRPair, message) {
          var fd = new FormData();
          fd.append('zipFile', uploadRRPair);
          var params = {};
          params.token = authService.getUserInfo().token;
          $http.post('/api/services/zipUploadAndExtract', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
          })
          .then(function(response){
             if(response.data!=""){
              return message(response.data);
              }
          })
          .catch(function(err){
            console.log(err);
            return message(servConstants.SOME_ERR_IN_UPLOADING_ZIP);
          });
        };
    }])

    .service('publishExtractedRRPairService', ['$http', '$location', 'authService', 'servConstants',
    function ($http, $location, authService, servConstants) {
        this.publishExtractedRRPair = function(bulkUpload, uploaded_file_name_id, message) {
          var fd = new FormData();
          var params = {};
          params.token = authService.getUserInfo().token;
          params.group = bulkUpload.sut.name;
          params.type  = bulkUpload.type;
          params.name  = bulkUpload.name;
          params.url = bulkUpload.base;
          params.uploaded_file_name_id = uploaded_file_name_id;

          //add new SUT
          $http.post('/api/systems/', bulkUpload.sut)
            .then(function (response) {
              console.log(response.data);
            })
            .catch(function (err) {
              console.log(err);
              $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
              $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
              $('#genricMsg-dialog').modal('toggle');
            });


            $http.post('/api/services/publishExtractedRRPairs', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var data = response.data;
                if(data.error == 'twoSeviceDiffNameSameBasePath'){
                  $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                  $('#genricMsg-dialog').find('.modal-body').text(servConstants.TWOSRVICE_DIFFNAME_SAMEBP_ERR_BODY);
                  $('#genricMsg-dialog').find('.modal-footer').html(servConstants.CLOSE_PRMRY_BTN_FOOTER);
                  $('#genricMsg-dialog').modal('toggle');
                  }
                  else{
                $location.path('/update/' + data._id + '/frmServCreate');
              }})
              .catch(function (err) {
                console.log(err.data.error);
                return message(err.data.error);
              });
        };
    }])

    .service('specUploadService', ['$http', '$location', 'authService',
    function ($http, $location, authService, servConstants) {
        this.specUpload = function(uploadSpec, message) {
          var fd = new FormData();
          fd.append('specFile', uploadSpec);
          var params = {};
          params.token = authService.getUserInfo().token;
          $http.post('/api/services/specUpload', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
          })
          .then(function(response){
             if(response.data!=""){
              return message(response.data);
              }
          })
          .catch(function(err){
            console.log(err);
            return message();
          });
        };
    }])

    .service('publishSpecService', ['$http', '$location', 'authService', 'servConstants',
    function ($http, $location, authService, servConstants) {
        this.publishSpec = function(spec, uploaded_file_id, uploaded_file_name) {
          var fd = new FormData();
          var params = {};
          params.token = authService.getUserInfo().token;
          params.group = spec.sut.name;
          params.type  = spec.type;
          params.name  = spec.name;
          params.url   = spec.url;
          params.uploaded_file_id = uploaded_file_id;
          params.uploaded_file_name = uploaded_file_name;
          //add new SUT
          $http.post('/api/systems/', spec.sut)
            .then(function (response) {
              console.log(response.data);
            })
            .catch(function (err) {
              console.log(err);
              $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
              $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
              
              $('#genricMsg-dialog').modal('toggle');
            });

            $http.post('/api/services/publishUploadedSpec', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var data = response.data;
                if(data.error == 'twoSeviceDiffNameSameBasePath'){
                  $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                  $('#genricMsg-dialog').find('.modal-body').text(servConstants.TWOSRVICE_DIFFNAME_SAMEBP_ERR_BODY);
                  $('#genricMsg-dialog').find('.modal-footer').html(servConstants.CLOSE_PRMRY_BTN_FOOTER);
                  $('#genricMsg-dialog').modal('toggle');
                  }
                  else{
                $location.path('/update/' + data._id + '/frmServCreate');
               } })
              .catch(function (err) {
                console.log(err);
                $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_SPEC_FAIL_ERR_BODY);
                $('#genricMsg-dialog').modal('toggle');
              });
        };
    }])

    .service('genDataService', [
        function() {

          this.getDataType = function(dataType){
            var dataOut;
            switch(dataType){
              case "First Name":
                dataOut = chance.first();
                break;
              case "Last Name":
                dataOut = chance.last();
                break;
              case "Boolean":
                dataOut = chance.bool();
                break;
              case "Country":
                dataOut = chance.country({full: true});
                break;
              case "Birthday":
                dataOut = chance.birthday({string: true});
                break;
              case "Email Address":
                dataOut = chance.email({domain: 'example.com'});
                break;
              case "IP Address":
                dataOut = chance.ip();
                break;
              case "Street Address":
                dataOut = chance.address();
                break;
              case "Date":
                dataOut = chance.date({string: true});
                break;
              case "Day of Week":
                dataOut = chance.weekday();
                break;
              case "Year":
                dataOut = chance.year({min: 1900, max: 2100});
                break;
              case "Integer":
                dataOut = chance.integer({min: 1, max: 10});
                break;

              case "String":
                dataOut = chance.string({ length: 10 });
                break;

              case "Numeric String":
                dataOut = chance.string({ length: 10, pool: '0123456789'});
                break;

              case "String w/o Special Chars":
                dataOut = chance.string({ length: 10, pool: '0123456789qwertyuiopasdfghjklzxcvbnm' });
                break;

              default:
                //handles all chancejs functions that are spelled exactly the same in interface. ie: Zip to zip()
                dataOut = eval("chance." + dataType.toLowerCase() + "()");
            }

            return dataOut;
          };

          this.json2xml = function(data){
            var toXml = function(v, name, ind) {
               var xml = "";
               if (v instanceof Array) {
                  for (var i=0, n=v.length; i<n; i++)
                     xml += ind + toXml(v[i], name, ind+"\t") + "\n";
               }
               else if (typeof(v) == "object") {
                  var hasChild = false;
                  xml += ind + "\n<" + name;
                  for (var m in v) {
                     if (m.charAt(0) == "@")
                        xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
                     else
                        hasChild = true;
                  }
                  xml += hasChild ? ">" : "/>";
                  if (hasChild) {
                     for (var m in v) {
                        if (m == "#text")
                           xml += v[m];
                        else if (m == "#cdata")
                           xml += "<![CDATA[" + v[m] + "]]>";
                        else if (m.charAt(0) != "@")
                           xml += toXml(v[m], m, ind+"\t");
                     }
                     xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "\n</" + name + ">";
                  }
               }
               else {
                  xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
               }
               return xml;
            }, xml="<?xml version='1.0' encoding='UTF-8'?>";
            for (var m in data)
               xml += toXml(data[m], "record", "\t\n");
            //  return xml;
            return "  " ? xml.replace(/\t/g, "  ") : xml.replace(/\t|\n/g, "\n");

          }
        }])

    .service('templateService', ['$http', '$location', 'authService', 'feedbackService', 'servConstants', 
        function($http, $location, authService, feedbackService, servConstants) {
            this.importTemplate = function(templateStr) {
                var template;

                try {
                  template = JSON.parse(templateStr);
                }
                catch(e) {
                  console.log(e);
                  $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                  $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_FAIL_ERR_BODY_IMPORT_TEMPLATE);
                  $('#genricMsg-dialog').modal('toggle');
                  return;
                }

                var token = authService.getUserInfo().token;

                // add SUT
                $http.post('/api/systems/', template.sut)
                .then(function(response) {
                    console.log(response.data);
                })
                .catch(function(err) {
                    console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').modal('toggle');
                });

                // add service
                $http.post('/api/services?token=' + token, template)
                .then(function(response) {
                    var data = response.data;
                    $location.path('/update/' + data._id + '/frmServCreate');
                })
                .catch(function(err) {
                    console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.PUB_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').modal('toggle');
                });
            };

    }])

    .service('userService', ['userFactory',
        function(userFactory) {
            this.getAllUsers = function() {
                return userFactory.getAllUsers();
            };
    }])

    .service('suggestionsService', ['statusCodesFactory', 'headersFactory',
        function(statusCodesFactory, headersFactory) {
            this.getStatusCodes = function() {
                return statusCodesFactory.getStatusCodes();
            };

            this.getPossibleHeaders = function() {
                return headersFactory.getPossibleHeaders();
            };
    }])

    .service('xmlService', ['$http',
        function($http) {
          this.validateXml = function(txt) {
            var xmlDoc;

            // code for IE
            if (window.ActiveXObject) {
              xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
              xmlDoc.async = false;
              xmlDoc.loadXML(document.all(txt).value);

              if (xmlDoc.parseError.errorCode!=0) {
                console.log(xmlDoc.parseError.reason);
                return false;
              }
            }
            // code for Chrome, Firefox, Opera, etc.
            if (document.implementation.createDocument) {
              var parser = new DOMParser();
              xmlDoc = parser.parseFromString(txt,"text/xml");

              if (xmlDoc.getElementsByTagName("parsererror").length>0) {
                console.log(xmlDoc.getElementsByTagName("parsererror")[0]);
                return false;
              }
            }

            return true;
          };
      }]);

//Put all the hard coding or constants here for Services.      
serv.constant("servConstants", {
        "LOGIN_ERR_TITLE" : "Login Error",
        "LOGIN_ERR_BODY" : "Invalid credentials. Please try again.",
        "PUB_FAIL_ERR_TITLE" : "Publish Failure Error",
        "PUB_FAIL_ERR_BODY" : "Please ensure your request / response pairs are well formed.",
        "PUB_FAIL_ERR_BODY_IMPORT_TEMPLATE" : "Please ensure you have uploaded a file in JSON format.",
        "TWOSRVICE_DIFFNAME_SAMEBP_ERR_BODY" : "There is another service already exist in our system with same basepath.",
        "UPLOAD_FAIL_ERR_TITLE" : "Upload Failure Error",
        "UPLOAD_FAIL_ERR_BODY" : "Error occured in bulk upload.",
        "ADD_SUT_FAIL_ERR_TITLE" : "SUT Add Error",
        "ADD_SUT_FAIL_ERR_BODY" : "Error occured in creating new SUT.",
        "PUB_SPEC_FAIL_ERR_BODY": "Spec publish failed. Please verify again the URL you have entered or spec file you have uploaded.",
        "SOME_ERR_IN_UPLOADING_ZIP" : "There is some problem in uploading this zip file." ,
        "CLOSE_PRMRY_BTN_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-lg btn-primary">Close</button>',
        "DUP_RECORDER_PATH_TITLE" : "Publish Failure: Duplicate Path",
        "DUP_RECORDER_PATH_BODY" : "This recorder's group and path overlap with an active recorder.", 
      });