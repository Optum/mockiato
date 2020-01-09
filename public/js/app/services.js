var serv = angular.module('mockapp.services',['mockapp.factories'])

    .service('modalService',['$http','$rootScope','servConstants',
    function($http,$rootScope,servConstants){
      function setRemoteModal(title,remoteBodyLocation,footer){
        $http.get(remoteBodyLocation).then(function(rsp){
          $('#genricMsg-dialog').find('.modal-title').text(title);
          $('#genricMsg-dialog').find('.modal-body').html(rsp.data);
          $('#genricMsg-dialog').find('.modal-footer').html(footer);
          $('#genricMsg-dialog').modal('toggle');
        });
      }
      this.showTemplateHelp = function(){
        setRemoteModal(servConstants.MCH_HELP_TITLE,"/partials/modals/templateHelpModal.html","");
      }
      this.showRecorderHelp = function(){
        setRemoteModal(servConstants.RECORD_HELP_TITLE,"/partials/modals/recorderHelpModal.html","");
      }
      this.showLiveInvocationHelp = function(){
        setRemoteModal(servConstants.INVOKE_HELP_TITLE,"/partials/modals/liveInvocationHelpModal.html","");
      }
    }])
    .service('utilityService',[function(){
      this.emptyOutJSON = function(jsonObject){
        var jsonObject2 = jsonObject;
        for (var key in jsonObject2){
          if(jsonObject.hasOwnProperty(key)){
            if(typeof jsonObject2[key] == "object")
              if(Array.isArray(jsonObject[key]))
                jsonObject2[key] = "";
              else
                jsonObject2[key] = this.emptyOutJSON(jsonObject2[key]);
            else
              jsonObject2[key] = "";
          }
        }
        return jsonObject2;
      };

      this.prettifyXml = function(sourceXml)
      {
          var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
          var xsltDoc = new DOMParser().parseFromString([
              // describes how we want to modify the XML - indent everything
              '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
              '  <xsl:strip-space elements="*"/>',
              '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
              '    <xsl:value-of select="normalize-space(.)"/>',
              '  </xsl:template>',
              '  <xsl:template match="node()|@*">',
              '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
              '  </xsl:template>',
              '  <xsl:output indent="yes"/>',
              '</xsl:stylesheet>',
          ].join('\n'), 'application/xml');
      
          var xsltProcessor = new XSLTProcessor();  
          
          xsltProcessor.importStylesheet(xsltDoc);

          var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
          var resultXml = new XMLSerializer().serializeToString(resultDoc);
          if(resultXml.includes("<parsererror"))
            return null;
          return resultXml;
          
      };
    }])
    .service('domManipulationService',[function(){
      this.expandTextarea = function(ele){
        if(!ele._oldTransition)
          ele._oldTransition = ele.style.transition;
        ele.style.transition = "height 1s ease";
        ele._mockiatoOldHeight = ele.offsetHeight;
        ele.style.height = ele._mockiatoOldHeight + "px";
        ele.style.height = ele.scrollHeight + "px";
        
        setTimeout(function(){
          ele.style.transition = ele._oldTransition;
          delete ele._oldTransition;
        },1000);
      }
      this.collapseTextarea = function(ele){
        if(!ele._oldTransition)
          ele._oldTransition = ele.style.transition;
        ele.style.transition = "height 1s ease";
        ele.style.height = ele._mockiatoOldHeight + "px";
        
        setTimeout(function(){
          ele.style.transition = ele._oldTransition;
          delete ele._oldTransition;
        },1000);
      }
    }])
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
                    $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
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
                  'path': rr.path || ''
                };

                // append query strings to path
                if (rr.queries) {
                  // trim last slash
                  if (op.path.slice(-1) == '/')
                    op.path = op.path.slice(0,-1);

                  var qs = '?';
                  var qArr = Object.entries(rr.queries);                  
                  qArr.forEach(function(q) {
                    if( q[0] != '' && q[1] != ''){
                      qs = qs + q[0] + '=' + q[1] + '&';
                    }
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
            $rootScope.virt.baseUrl = '/recording/live/' + data.sut.name.toLowerCase() + data.path;
            $rootScope.virt.delay= data.delay;
            $rootScope.virt.delayMax= data.delayMax;
            $rootScope.virt.type = data.protocol;
            $rootScope.virt.name = data.name;
          }
    }])

    .service('apiHistoryService', ['$http', '$location', 'authService', 'feedbackService', 'xmlService', 'servConstants','$routeParams',
        function($http, $location, authService, feedbackService, xmlService, servConstants,$routeParams) {

            this.deleteRecordedLiveRRPair = function(serviceId,rrPairId){
              var token = authService.getUserInfo().token;
              return $http.delete('/api/services/' + serviceId + '/recorded/' + rrPairId + "?token=" + token);
            }

            this.addRRPairToService = function(serviceId,rr){
              var token = authService.getUserInfo().token;
              return $http.patch('/api/services/' + serviceId + '/rrpairs?token=' + token, rr);
            }

            this.getRecordedLiveRRPairs = function(serviceId){
              return $http.get('/api/services/' + serviceId + '/recorded');
            }

            //gets all recordings, unfiltered
            this.getRecordings = function(){
                return $http.get('/api/recording');
            }

            this.startRecorder = function(recorder){
              return $http.patch('/api/recording/' + recorder._id + "/start");
              
            }

            this.stopRecorder = function(recorder){
              return $http.patch('/api/recording/' + recorder._id + "/stop");
            }

            this.getRecordingById = function(id){
              return $http.get('/api/recording/' + id);
            }

            this.getRecordingBySUT = function(name){
              return $http.get('/api/recording/sut/' + name);
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

            this.getRecentModifiedServices = function(num,user){
              return $http.get('/api/services/search?sortBy=updated&authorizedOnly=' + user + '&limit=' + num);
            }

            this.getServiceForArchiveSUT = function(name) {
              return $http.get('/api/services/sut/' + name + '/archive');
            };

            this.getServiceForDraftSUT = function(name) {
              return $http.get('/api/services/sut/' + name + '/draft');
            };

            this.getServiceByUser = function(name) {
                return $http.get('/api/services/user/' + name);
            };
            
            this.getServiceByArchiveUser = function(name) {
              return $http.get('/api/services/user/' + name + '/archive');
            };

            this.getServiceByDraftUser = function(name) {
              return $http.get('/api/services/user/' + name + '/draft');
            };

            this.getServicesFiltered = function(sut, user) {
                return $http.get('/api/services?sut=' + sut + '&user=' + user);
            };

            this.getServicesArchiveFiltered = function(sut, user) {
              return $http.get('/api/services/archive?sut=' + sut + '&user=' + user);
            };

            this.getServicesDraftFiltered = function(sut, user) {
              return $http.get('/api/services/draft?sut=' + sut + '&user=' + user);
            };

            this.publishServiceToAPI = function(servicevo, isUpdate, isRecording) {
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
                      if (rr.responsepayload) {
                        var trimmed = rr.responsepayload.trim();
                        if (trimmed == "{}" || trimmed == "[]") {
                          resPayload = trimmed;
                        } else {
                          let entry = JSON.parse(rr.responsepayload);
                          /* For a wrong json data above line will fail and control will go to catch block. 
                            For special json eg. "test" is a valid json. but we want don't want to support
                            this specail one word json. below code will restrict to set this type of JSON.*/
                          if (typeof (entry) === 'object' && entry !== null) {
                            resPayload = JSON.parse(rr.responsepayload);
                          } else
                            throw 'special json';
                        }
                      }
                      if (rr.requestpayload) {
                        let entry = JSON.parse(rr.requestpayload);
                        if (typeof (entry) === 'object' && entry !== null) {
                          reqPayload = JSON.parse(rr.requestpayload);
                        } else
                          throw 'special json';
                      }
                    }
                    catch (e) {
                      console.log(e);
                      if (e == 'special json')
                        throw 'JSON in a RR pair is not supported.';
                      else
                        throw 'JSON in a RR pair is malformed.';
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
                        throw 'XML in an RR Pair is malformed.';
                      }
                    }
                    else {
                      reqPayload = rr.requestpayload;
                      resPayload = rr.responsepayload;
                    }

                    // convert array of queries to object literal
                    var queries = {};
                    rr.queriesArr.forEach(function(q){
                      if(queries[q.k])
                        throw 'Duplicate Query Exists in an RR pair.';
                      if(q.k)//for update service blank query key fix
                      queries[q.k] = q.v;
                    });

                    // only save queries if there are any
                    if (Object.keys(queries).length > 0) {
                      rr.queries = queries;
                    }else if(Object.keys(queries).length == 0){
                      rr.queries = undefined;
                    }

                    // convert array of response headers to object literal
                    var resHeaders = {};
                    rr.resHeadersArr.forEach(function(headerObj){
                      if(headerObj.k)
                      resHeaders[headerObj.k] = headerObj.v;
                    });

                    // only save headers if there are any
                    if (Object.keys(resHeaders).length > 0) {
                      rr.resHeaders = resHeaders;
                    }else if(Object.keys(resHeaders).length == 0){
                      rr.resHeaders = undefined;
                    }

                    // convert array of response headers to object literal
                    var reqHeaders = {};
                    rr.reqHeadersArr.forEach(function(headerObj){
                      if(headerObj.k)
                      reqHeaders[headerObj.k] = headerObj.v;
                    });

                    // only save headers if there are any
                    if (Object.keys(reqHeaders).length > 0) {
                      rr.reqHeaders = reqHeaders;
                    }else if(Object.keys(reqHeaders).length == 0){
                      rr.reqHeaders = undefined;
                    }
                     // only save request data for non-GETs
                    if (rr.method !== 'GET') {
                      rr.reqData = reqPayload;
                    }
                    // save request data for get when Checkbox selected
                    else{
                    if(rr.getPayloadRequired=== true) 
                    {
                      rr.reqData = reqPayload;
                    }
                    else{ if(rr.getPayloadRequired=== false){
                      rr.reqData = undefined;
                    }}
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
                    rrpair.getPayloadRequired = rr.getPayloadRequired;

                    rrpairs.push(rrpair);
                });

                var templates = [];
                servicevo.matchTemplates.forEach(function(template) {
                  templates.push(template.val);
                });

                var servData = {
                    sut: { name: servicevo.sut.name },
                    mqInfo: servicevo.mqInfo,
                    name: servicevo.name,
                    basePath: '/' + servicevo.basePath,
                    type: servicevo.type,
                    delay: servicevo.delay,
                    delayMax: servicevo.delayMax,
                    matchTemplates: templates,
                    rrpairs: rrpairs
                };
                failStringsArray = [];
                  if(servicevo.failStrings){
                    
                    servicevo.failStrings.forEach(function(item){
                      failStringsArray.push(item.val);
                   });
                  }
                  
                  failCodesArray = [];
                  if(servicevo.failStatuses){
                    servicevo.failStatuses.forEach(function(item){
                      failCodesArray.push(item.val);
                    });
                  }
                  servData.liveInvocation = 
                  {
                    enabled : servicevo.liveInvocationCheck,
                    remoteHost : servicevo.remoteHost,
                    remotePort : servicevo.remotePort,
                    remoteBasePath : servicevo.remotePath,
                    failStatusCodes : failCodesArray,
                    failStrings : failStringsArray,
                    ssl : servicevo.invokeSSL,
                    record : servicevo.liveRecordCheck,
                    liveFirst : servicevo.liveInvokePrePost == 'PRE'
                  };
                  console.log("This is default response", servicevo.defaultResponsePayload );

                  let defStatus;
                  if(servicevo.defResStatus && servicevo.defResStatus.description){
                    defStatus = servicevo.defResStatus.description.value;
                  }else if (servicevo.defResStatus){
                    defStatus = servicevo.defResStatus;
                  }
                servData.defaultResponse =
                {
                  enabled : servicevo.defaultResponseCheck,
                  defaultResponsePayload : servicevo.defaultResponsePayload,
                  defResStatus : defStatus
                };
                console.log("This is servData", servData.defaultResponse);
                // publish the virtual service
                var token = authService.getUserInfo().token;

                // update => put (create => post)
                if (!isUpdate) {
                  $http.post('/api/services?token=' + token, servData)
                  .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      if(isRecording){
                        $http.delete('/api/recording/' + $routeParams.id).then(function(){
                          $location.path('/update/' + data._id + '/frmServCreate');
                        });
                      }else{
                        $location.path('/update/' + data._id + '/frmServCreate');
                      }
                  })

                  .catch(function(err) {
                    console.log(err);
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(err.data.error);
                      $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                      $('#genricMsg-dialog').modal('toggle');
                  });
                }
                else {
                  $http.put('/api/services/' + servicevo.id + '?token=' + token, servData)

                  .then(function(response) {
                      var data = response.data;
                      console.log(data);
                                            
                      if($routeParams.frmWher == 'frmDraft'){
                        $location.path('/selectService/'+ data._id);
                      }else{
                      feedbackService.displayServiceInfo(data);
                      $('#success-modal').modal('toggle');
                    }
                  })

                  .catch(function(err) {
                      console.log(err);
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(err.data.error);
                      $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                      $('#genricMsg-dialog').modal('toggle');
                  });
                }
            };

            this.saveServiceAsDraft = function(servicevo, isUpdate) {
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
                         // resPayload = JSON.parse(rr.responsepayload);
                         resPayload = rr.responsepayload;
                        }
                      }
                      if (rr.requestpayload) reqPayload = rr.requestpayload;
                    }
                    catch(e) {
                      console.log(e);
                     // throw 'RR pair is malformed';
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
                  // save request data for get when Checkbox selected
                  else{
                  if(rr.getPayloadRequired=== true) 
                  {
                    rr.reqData = reqPayload;
                  }
                  else{ if(rr.getPayloadRequired=== false){
                    rr.reqData = undefined;
                  }}
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
                  rrpair.getPayloadRequired = rr.getPayloadRequired;

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
              failStringsArray = [];
                if(servicevo.failStrings){
                  
                  servicevo.failStrings.forEach(function(item){
                    failStringsArray.push(item.val);
                 });
                }
                
                failCodesArray = [];
                if(servicevo.failStatuses){
                  servicevo.failStatuses.forEach(function(item){
                    failCodesArray.push(item.val);
                  });
                }
                servData.liveInvocation = 
                {
                  enabled : servicevo.liveInvocationCheck,
                  remoteHost : servicevo.remoteHost,
                  remotePort : servicevo.remotePort,
                  remoteBasePath : servicevo.remotePath,
                  failStatusCodes : failCodesArray,
                  failStrings : failStringsArray,
                  ssl : servicevo.invokeSSL,
                  liveFirst : servicevo.liveInvokePrePost == 'PRE'
                };
                
                let defStatus;
                  if(servicevo.defResStatus && servicevo.defResStatus.description){
                    defStatus = servicevo.defResStatus.description.value;
                  }else if (servicevo.defResStatus){
                    defStatus = servicevo.defResStatus;
                  }
                servData.defaultResponse =
                {
                  enabled : servicevo.defaultResponseCheck,
                  defaultResponsePayload : servicevo.defaultResponsePayload,
                  defResStatus : defStatus
                };

              // publish the virtual service
              var token = authService.getUserInfo().token;

              // update => put (create => post)
              if (!isUpdate) {
                $http.post('/api/services/draftservice?token=' + token, servData)
                .then(function(response) {
                    var data;
                    if(response.data.mqservice)
                        data = response.data.mqservice;
                    else
                        data = response.data.service;
                    console.log(data);                   
               
                    $location.path('/showDraftService/' + data._id + '/frmDraft');
                 
                    $('#service-save-success-modal').modal('toggle');
                })

                .catch(function(err) {
                  console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.SERVICE_SAVE_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.SERVICE_SAVE_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                    $('#genricMsg-dialog').modal('toggle');
                });
              }
              else {
                $http.put('/api/services/draftservice/' + servicevo.id + '?token=' + token, servData)

                .then(function(response) {
                    var data;
                    if(response.data.mqservice)
                        data = response.data.mqservice;
                    else
                        data = response.data.service;
                    
                    console.log(data);
                    $('#service-save-success-modal').modal('toggle');
                })

                .catch(function(err) {
                    console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.SERVICE_SAVE_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.SERVICE_SAVE_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                    $('#genricMsg-dialog').modal('toggle');
                });
              }
          };

          this.getServiceById = function(id) {
              return $http.get('/api/services/' + id);
          };

          this.getArchiveServiceById = function(id) {
            return $http.get('/api/services/archive/' + id);
          };

          this.getDraftServiceById = function(id) {
            return $http.get('/api/services/draft/' + id);
          };

          this.deleteServiceAPI = function(service) {
              var token = authService.getUserInfo().token;
              return $http.delete('/api/services/' + service._id + '?token=' + token);
          };

          this.deleteServiceArchive = function(service) {
            var token = authService.getUserInfo().token;
            return $http.delete('/api/services/archive/' + service._id + '?token=' + token);
          };

          this.deleteDraftService = function(service) {
            var token = authService.getUserInfo().token;
            return $http.delete('/api/services/draft/' + service._id + '?token=' + token);
          };


          this.restoreService = function(service) {
            var token = authService.getUserInfo().token;
            return $http.post('/api/services/archive/' + service._id + '/restore?token=' + token);
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
                  headerMask:[],
                  ssl:servicevo.ssl,
                  creator:servicevo.currentUser,
                  filters:{
                    enabled:servicevo.filterEnable,
                    bodyStrings:[],
                    headers:[],
                    statuses:[]
                  }
                  
                }

                var token = authService.getUserInfo().token;
                
                //Extract headers
                for(var i = 0; i < servicevo.reqHeadersArr.length; i ++){
                  var head = servicevo.reqHeadersArr[i];
                  if(head.k)
                    recorder.headerMask.push(head.k.originalObject);
                }

                //Extract filters
                servicevo.filterStatusCodes.forEach(function(code){
                  if(code.v){
                    recorder.filters.statuses.push(parseInt(code.v));
                  }
                });
                servicevo.filterStrings.forEach(function(string){
                  if(string.v){
                    recorder.filters.bodyStrings.push(string.v);
                  }
                });
                servicevo.filterHeaders.forEach(function(header){
                  if(header.k){
                    recorder.filters.headers.push({key:header.k,value:header.v});
                  }
                });


                console.log(servicevo);


                //publish service
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
                      $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                      $('#genricMsg-dialog').find('.modal-body').text(err.data.error);
                      $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                      $('#genricMsg-dialog').modal('toggle');
                });

            };
    }])

    .service('sutService', ['sutFactory', 'groupFactory', 'authService' , 'servConstants' , '$http', '$q',
        function(sutFactory, groupFactory, authService, servConstants, $http, $q) {
           
            this.getAllSUT = function() {
                var sutlist = sutFactory.getAllSUT();
                return sutlist;
            };

            this.getAllSUTPromise = function(){
              return new Promise(function(resolve,reject){
                $http.get('/api/systems').then(function(response){
                  var sutlist = [];
                  response.data.forEach(function(sutData) {
                    var sut = {
                      name: sutData.name
                    };
                   
                    sutlist.push(sut);
                  });
                  resolve(sutlist);
              });
            });
          };

          this.getGroupsToBeDeleted = function(user){
              var deleteSutList = sutFactory.getGroupsToBeDeleted(user);
              return deleteSutList;
          };
            this.getMembers = function(selectedSut){
              var memberlist = groupFactory.getMembers(selectedSut)
              return memberlist;
            };

            this.getGroupsByUser = function(user){
              var someGroups = sutFactory.getGroupsByUser(user);
              return someGroups;
            };

            this.updateGroup = function(group, memberlist){

              var groupData = {
                name: group,
                members: memberlist
              };
              
              var token = authService.getUserInfo().token;

              $http.put('/api/systems/' + group + '?token=' + token, groupData)
                .then(function (response) {
                  console.log(response.data);
                })

                .catch(function (err) {
                  console.log(err);
                });
            }



            this.addGroup = function(createSut){
          //    createSut.members = [];
          //  createSut.members.push(authService.getUserInfo().username);
            var token = authService.getUserInfo().token;
            $http.post('/api/systems/'+'?token=' + token , createSut )
            .then(function (response) {
              console.log(response.data);
            })
            .catch(function (err) {
              console.log(err);
              $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
              $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
              $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
              $('#genricMsg-dialog').modal('toggle');
            });}

          
            this.deleteGroup = function(deleteSut){
             var token = authService.getUserInfo().token;
             return  $http.delete('/api/systems/'+deleteSut.name +'?token=' + token, deleteSut);
            };
            
    }])

    .service('zipUploadAndExtractService', ['$http', '$location', 'authService', 'servConstants',
    function ($http, $location, authService, servConstants) {
        this.zipUploadAndExtract = function(uploadRRPair, message) {
          var fd = new FormData();
          fd.append('zipFile', uploadRRPair);
          var params = {};
          params.token = authService.getUserInfo().token;
          $http.post('/api/services/fromPairs/upload', fd, {
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
          var token = authService.getUserInfo().token;
          
          var params = {};
          params.token = token;
          params.group = bulkUpload.sut.name;
          params.type  = bulkUpload.type;
          params.name  = bulkUpload.name;
          params.url = bulkUpload.base;
          params.uploaded_file_name_id = uploaded_file_name_id;

            $http.post('/api/services/fromPairs/publish', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var data = response.data;
                $location.path('/update/' + data._id + '/frmServCreate');
              })
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
          $http.post('/api/services/fromSpec/upload', fd, {
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
        this.publishSpec = function(spec, uploaded_file_id, uploaded_file_name,message) {
          var fd = new FormData();
          var token = authService.getUserInfo().token;

          var params = {};
          params.token = token;
          params.group = spec.sut.name;
          params.type  = spec.type;
          params.name  = spec.name;
          params.url   = spec.url;

          if (spec.base) params.base = '/' + spec.base;

          params.uploaded_file_id = uploaded_file_id;
          params.uploaded_file_name = uploaded_file_name;

            $http.post('/api/services/fromSpec/publish', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var data = response.data;
                $location.path('/update/' + data._id + '/frmServCreate');
               return message(response.data.error);
               })
              .catch(function (err) {
                console.log(err);
                $('#genricMsg-dialog').find('.modal-title').text(servConstants.PUB_FAIL_ERR_TITLE);
                $('#genricMsg-dialog').find('.modal-body').text(err.data.error);
                $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                $('#genricMsg-dialog').modal('toggle');
              });
        };
    }])

    .service('restClientService', ['$http', '$rootScope', 'authService', 'getSizeFactory', 'servConstants',
    function ($http, rootScope, authService, getSizeFactory, servConstants) {
        this.callRestClient = function(serviceVo, rr, message) {

          if(rr.payloadType=='JSON' && !rr.reqHeaders)
            rr.reqHeaders={"Content-Type": "application/json"};
          else if(rr.reqHeaders && rr.payloadType=='JSON' && rr.reqHeaders['Content-Type']!=='application/json')
            rr.reqHeaders['Content-Type']='application/json';

          var data = {
            "basePath" : rootScope.mockiatoHost + '/virtual' + serviceVo.basePath,
            "method" : rr.method,
            "relativePath" : rr.path,
            "queries" : rr.queries,
            "reqHeaders" : rr.reqHeaders,
            "reqData" : rr.reqData
          };

          var params = {};
          params.token = authService.getUserInfo().token;
          //send any number of params here.

            $http.post('/restClient/request', JSON.stringify(data), {
              //define configs here
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var size = getSizeFactory.getSize(response);
                response.respSize = size;
                var time = response.config.responseTimestamp - response.config.requestTimestamp;
                response.timeTaken = time + ' ' + 'ms';
                return message(response);
               })
              .catch(function (err) {
                var time = new Date().getTime() - err.config.requestTimestamp;
                err.timeTaken = time + ' ' + 'ms';
                var size = getSizeFactory.getSize(err);
                err.respSize = size;
                return message(err);
              });
        };
    }])

    .service('apiTestService', ['$http', '$rootScope', 'authService', 'getSizeFactory', 'servConstants', 'getQueryParamsFactory',
    function ($http, rootScope, authService, getSizeFactory, servConstants, getQueryParamsFactory) {
        this.callAPITest = function(tab, message) {
          var queryParams = getQueryParamsFactory.getQueryParams(tab.requestURL);
          var reqHeader = {};
          //remove blank headers
          for (var i = 0; i < tab.reqHeadersArr.length; i++) {
            if(tab.reqHeadersArr[i].k && !tab.reqHeadersArr[i].k.originalObject)
              {tab.reqHeadersArr.splice(i, 1); i=i-1;}
          }
          for (var i = 0; i < tab.reqHeadersArr.length; i++) {
            var key;
            if(tab.reqHeadersArr[i].k && tab.reqHeadersArr[i].k.originalObject.name)
               key = tab.reqHeadersArr[i].k.originalObject.name;
            else if(tab.reqHeadersArr[i].k)
               key = tab.reqHeadersArr[i].k.originalObject;
            if(key)
            reqHeader[key] = tab.reqHeadersArr[i].v;
        }

        if(reqHeader.hasOwnProperty('Content-Type') && reqHeader['Content-Type'].startsWith('application/json')){
          if(tab.requestpayload)//for blank request payload double quote was showing on ui after response.
          tab.requestpayload=JSON.parse(tab.requestpayload);
        }
          var data = {
            "basePath" : tab.requestURL.split('?')[0],
            "method" : tab.method,
            "relativePath" : '',
            "queries" : queryParams,
            "reqHeaders" : reqHeader,
            "reqData" : tab.requestpayload
          };

          if(reqHeader.hasOwnProperty('Content-Type') && reqHeader['Content-Type'].startsWith('application/json')){
            if(tab.requestpayload)//for blank request payload double quote was showing on ui after response.
            tab.requestpayload=JSON.stringify(tab.requestpayload,null,"    ");
          }

          var params = {};
          //login not required for Rest Client Tool.
          //params.token = authService.getUserInfo().token;
          //send any number of params here.

            $http.post('/restClient/request', JSON.stringify(data), {
              //define configs here
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
            })
              .then(function (response) {
                var size = getSizeFactory.getSize(response);
                response.respSize = size;
                var time = response.config.responseTimestamp - response.config.requestTimestamp;
                response.timeTaken = time + ' ' + 'ms';
                return message(response);
               })
              .catch(function (err) {
                var time = new Date().getTime() - err.config.requestTimestamp;
                err.timeTaken = time + ' ' + 'ms';
                var size = getSizeFactory.getSize(err);
                err.respSize = size;
                return message(err);
              });
        };
    }])

    .service('genDataService', [
        function() {

          this.getDataType = function(dataType){
            if(dataType != null){
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
                  $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
                  $('#genricMsg-dialog').modal('toggle');
                  return;
                }

                var token = authService.getUserInfo().token;

                // add SUT
                $http.post('/api/systems' + '?token=' + token, template.sut)
                .then(function(response) {
                    console.log(response.data);
                })
                .catch(function(err) {
                    console.log(err);
                    $('#genricMsg-dialog').find('.modal-title').text(servConstants.ADD_SUT_FAIL_ERR_TITLE);
                    $('#genricMsg-dialog').find('.modal-body').text(servConstants.ADD_SUT_FAIL_ERR_BODY);
                    $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);
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
                      $('#genricMsg-dialog').find('.modal-body').text(err.data.error);
                      $('#genricMsg-dialog').find('.modal-footer').html(servConstants.BACK_DANGER_BTN_FOOTER);  
                      $('#genricMsg-dialog').modal('toggle');   
                });
            };

    }])

    .service('userService', ['userFactory','$http',
        function(userFactory,$http) {
            this.getAllUsers = function() {
                return userFactory.getAllUsers();
            };
            this.getAllUsersPromise = function() {
              return new Promise(function(resolve,reject){
                $http.get('/api/users').then(function(response){
                  var userlist = [];
                  response.data.forEach(function(userData){
                    userlist.push({name:userData.uid});
                  });
                  resolve(userlist);
                });
              });
          };
          this.getAdmin = function() {
            return new Promise(function(resolve,reject){
              $http.get('/api/users/admin').then(function(response){
                var adminlist = [];
                adminlist.push({name:response.data});
                resolve(adminlist);
              });
            });
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
        "PUB_FAIL_ERR_BODY_IMPORT_TEMPLATE" : "Please ensure you have uploaded a file in JSON format.",
        "UPLOAD_FAIL_ERR_TITLE" : "Upload Failure Error",
        "UPLOAD_FAIL_ERR_BODY" : "Error occured in bulk upload.",
        "ADD_SUT_FAIL_ERR_TITLE" : "SUT Add Error",
        "ADD_SUT_FAIL_ERR_BODY" : "Error occured in creating new SUT.",
        "SOME_ERR_IN_UPLOADING_ZIP" : "There is some problem in uploading this zip file." ,
        "DUP_RECORDER_PATH_TITLE" : "Publish Failure: Duplicate Path",
        "SERVICE_SAVE_FAIL_ERR_TITLE" : "Service Info Failure",
        "SERVICE_SAVE_FAIL_ERR_BODY": "Service Info save as draft failed",
        "BACK_DANGER_BTN_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-danger">Back</button>',
        "MCH_HELP_TITLE" : "Match Templates Help",
        "RECORD_HELP_TITLE" : "Using Live Recording",
        "INVOKE_HELP_TITLE" : "Using Live Invocation"
      });
