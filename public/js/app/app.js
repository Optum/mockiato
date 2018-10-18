var mockapp = angular.module('mockapp',['mockapp.controllers','mockapp.services','mockapp.factories', 'ngSanitize','ngRoute','ngMessages', 'bootstrap.fileField','ui.bootstrap','ngFileSaver', 'angucomplete-alt'])


    .config(["$routeProvider", "$httpProvider", function($routeProvider, $httpProvider){
        //IE caching issue fix
        //initialize get if not there
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }

        //disable IE ajax request caching
        $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
        // extra
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';

        $routeProvider
            .when("/addservice", {
                templateUrl: "partials/addapiform.html",
                controller: "myMenuAppController",
                resolve: {
                    auth: ['$q', 'authService', function($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })

            .when("/update/:id", {
                templateUrl: "partials/updateForm.html",
                controller: "updateController",
                resolve: {
                    auth: ['$q', 'authService', function($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })

            .when("/addTemplate", {
                templateUrl: "partials/templateForm.html",
                controller: "templateController",
                resolve: {
                    auth: ['$q', 'authService', function($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })

            .when("/fetchservices", {
                templateUrl: "partials/servicehistory.html",
                controller: "serviceHistoryController",
                resolve: {
                    auth: ['$q', 'authService', function($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })

            .when("/selectService", {
                templateUrl: "partials/selectService.html",
                resolve: {
                    auth: ['$q', 'authService', function($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })
            
            .when("/spec", {
                templateUrl: "partials/spec.html",
                controller: "specController",
                resolve: {
                    auth: ['$q', 'authService', function ($q, authService) {
                        var userInfo = authService.getUserInfo();

                        if (userInfo) {
                            return $q.when(userInfo);
                        } else {
                            return $q.reject({ authenticated: false });
                        }
                    }]
                }
            })
            .when("/mq", {
                templateUrl: "partials/mq.html"
            })

            .when("/helppage", {
                templateUrl: "partials/help.html",
                controller: "ContactFormController"

            })

            .when("/datagen", {
                templateUrl: "partials/datagen.html",
                controller: "dataGenController"

            })

            .when('/login', {
                templateUrl: 'partials/login.html',
                controller: 'authController'
            })

            .otherwise({
                redirectTo: "/selectService"
            });
    }]);

    // Object.entries polyfill for IE
    if (!Object.entries)
        Object.entries = function( obj ){
        var ownProps = Object.keys( obj ),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array
        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
    };


var AppUtils = AppUtils || {};
AppUtils.helpers = {
    isDuplicateReq: function (servicevo) {
        var isSameReq = false;
        LOOP1:
        for (var i = 0; i < servicevo.rawpairs.length - 1; i++) {
            var obj1 = servicevo.rawpairs[i];
            for (var j = i + 1; j < servicevo.rawpairs.length; j++) {
                var obj2 = servicevo.rawpairs[j];
                var isAnyReqPairDuplicate = true;
                LOOP2:
                for (var [key, value] of Object.entries(obj1)) {
                    for (var [k, v] of Object.entries(obj2)) {
                        if (key == 'id') break;
                        else if (k == 'id' || key !== k) continue;
                        else if (
                            ['path'].includes(key) && ['path'].includes(k) && !angular.equals(v, value)
                            || ['queriesArr'].includes(key) && ['queriesArr'].includes(k) && !angular.equals(v, value)
                            || ['reqHeadersArr'].includes(key) && ['reqHeadersArr'].includes(k) && !angular.equals(v, value)
                            || ['method', 'payloadType', 'requestpayload', 'path', 'queriesArr', 'reqHeadersArr'].includes(key)
                            && !angular.equals(v, value)
                        ) {
                            isAnyReqPairDuplicate = false;
                            break LOOP2;
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