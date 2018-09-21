var serv = angular.module('mockapp.services',['mockapp.factories'])

    .service('authService', ['$http', '$window', '$location', '$rootScope',
        function($http, $window, $location, $rootScope) {
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
                    $('#loginFail-modal').modal('toggle');
                });
            };

            this.logout = function() {
                $rootScope.loggedIn = false;
                $window.sessionStorage['loggedIn'] = null;
                $window.sessionStorage['userInfo'] = null;
                userInfo = null;
            };
    }])

    .service('feedbackService', ['$rootScope',
        function($rootScope) {
          this.displayServiceInfo = function(data) {
            $rootScope.virt.operations = [];
            $rootScope.virt.baseUrl = '/virtual' + data.basePath;
            $rootScope.virt.delay= data.delay;
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
    }])

    .service('apiHistoryService', ['$http', 'authService', 'feedbackService', 'xmlService',
        function($http, authService, feedbackService, xmlService) {
            this.getServiceForSUT = function(name) {
                return $http.get('/api/services/sut/' + name);
            };

            this.getServiceByUser = function(name) {
                return $http.get('/api/services/user/' + name);
            };

            this.getServicesFiltered = function(sut, user) {
                return $http.get('/api/services?sut=' + sut + '&user=' + user);
            };

            this.publishServiceToAPI = function(servicevo, isUpdate) {
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
                        if (rr.requestpayload)  reqPayload = JSON.parse(rr.requestpayload);
                        if (rr.responsepayload) resPayload = JSON.parse(rr.responsepayload);
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

                    rrpairs.push(rrpair);
                });

                var servData = {
                    sut: { name: servicevo.sut.name },
                    name: servicevo.name,
                    basePath: '/' + servicevo.basePath,
                    type: servicevo.type,
                    delay: servicevo.delay,
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
                    $('#failure-modal').modal('toggle');
                });

                // update => put (create => post)
                if (!isUpdate) {
                  $http.post('/api/services?token=' + token, servData)

                  .then(function(response) {
                      var data = response.data;
                      console.log(data);
                      feedbackService.displayServiceInfo(data);
                      $('#success-modal').modal('toggle');
                  })

                  .catch(function(err) {
                      console.log(err);
                      $('#failure-modal').modal('toggle');
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
                      $('#failure-modal').modal('toggle');
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
    }])

    .service('sutService', ['sutFactory',
        function(sutFactory) {
            this.getAllSUT = function() {
                var sutlist = sutFactory.getAllSUT();
                return sutlist;
            };
    }])

  .service('specService', ['$http', '$location', 'authService', 'feedbackService',
    function ($http, $location, authService, feedbackService) {
        this.publishFromSpec = function(spec, file) {
          var fd = new FormData();
          fd.append('spec', file);

          var params = {};
          params.token = authService.getUserInfo().token;
          params.group = spec.sut.name;
          params.type  = spec.type;
          params.name  = spec.name;
          params.url   = spec.url;
          
          //add new SUT
          $http.post('/api/systems/', spec.sut)
            .then(function (response) {
              console.log(response.data);
            })
            .catch(function (err) {
              console.log(err);
              $('#failure-modal').modal('toggle');
            });

          $http.post('/api/services/fromSpec', fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined},
              params: params
          })
          .then(function(response){
            var data = response.data;
            console.log(data);
            //redirect to update page for created service
            $location.path('/update/' + data._id);
            feedbackService.displayServiceInfo(data);
            $('#success-modal').modal('toggle');
          })
          .catch(function(err){
            console.log(err);
            $('#failure-modal').modal('toggle');
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

    .service('templateService', ['$http', 'authService', 'feedbackService',
        function($http, authService, feedbackService) {
            this.importTemplate = function(templateStr) {
                var template;

                try {
                  console.log(templateStr);
                  template = JSON.parse(templateStr);
                }
                catch(e) {
                  console.log(e);
                  $('#failure-modal').modal('toggle');
                  return;
                }

                var token = authService.getUserInfo().token;
                $http.post('/api/services?token=' + token, template)

                .then(function(response) {
                    var data = response.data;
                    console.log(data);
                    feedbackService.displayServiceInfo(data);
                    $('#success-modal').modal('toggle');
                })

                .catch(function(err) {
                    console.log(err);
                    $('#failure-modal').modal('toggle');
                });
            };

    }])

    .service('userService', ['userFactory',
        function(userFactory) {
            this.getAllUsers = function() {
                var userlist = userFactory.getAllUsers();
                return userlist;
            };
    }])

    .service('suggestionsService', ['statusCodesFactory', 'headersFactory',
        function(statusCodesFactory, headersFactory) {
            this.getStatusCodes = function() {
                var codesList = statusCodesFactory.getStatusCodes();
                return codesList;
            };

            this.getPossibleHeaders = function() {
                var headerList = headersFactory.getPossibleHeaders();
                return headerList;
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
