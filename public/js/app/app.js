var mockapp = angular.module('mockapp',['mockapp.controllers','mockapp.services','mockapp.factories', 'ngSanitize','ngRoute','ngMessages', 'bootstrap.fileField','ui.bootstrap','ngFileSaver', 'angucomplete-alt'])


    .config(["$routeProvider", "$httpProvider", function($routeProvider, $httpProvider){
        //IE caching issue fix
        //initialize get if not there
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }

        //token expiration catch
        $httpProvider.interceptors.push('authInterceptorService');
        
        //disable IE ajax request caching
        $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
        // extra
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';

        $routeProvider
            .when("/addservice", {
                templateUrl: "fusepartials/addapiform.html",
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
            .when("/update/:id/recorded", {
                templateUrl: "fusepartials/recordedInvokePairs.html",
                controller: "mergeRecordedController",
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
            .when("/update/:id/:frmWher", {
                templateUrl: "fusepartials/updateForm.html",
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
            
            .when("/showArchiveService/:id/:frmWher", {
                templateUrl: "fusepartials/updateForm.html",
                controller: "showArchiveController",
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

            .when("/showDraftService/:id/:frmWher", {
                templateUrl: "fusepartials/updateForm.html",
                controller: "showDraftController",
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
                templateUrl: "fusepartials/templateForm.html",
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

            .when("/fetchservices/:sut?/:user?", {
                templateUrl: "fusepartials/servicehistory.html",
                controller: "serviceHistoryController",
                reloadOnUrl: false,
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

            .when("/fetchDeletedServices/:sut?/:user?", {
                templateUrl: "fusepartials/deletedServices.html",
                controller: "deletedServiceController",
                reloadOnUrl: false,
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

            .when("/fetchDraftServices/:sut?/:user?", {
                templateUrl: "fusepartials/draftServices.html",
                controller: "draftServiceController",
                reloadOnUrl: false,
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

            .when("/selectService/:id", {
                templateUrl: "fusepartials/selectService.html",
                controller: "selectServiceController",
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
            
            .when("/spec/:specType", {
                templateUrl: "fusepartials/spec.html",
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

            .when("/admin", {
                templateUrl: "fusepartials/admin.html",
                controller: "adminController",
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

            .when("/bulkUpload", {
                templateUrl: "fusepartials/bulkUpload.html",
                controller: "bulkUploadController",
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

            .when("/helppage", {
                templateUrl: "fusepartials/help.html",
                controller: "ContactFormController"

            })

            .when("/datagen", {
                templateUrl: "fusepartials/datagen.html",
                controller: "dataGenController"

            })

            .when('/login', {
                templateUrl: 'fusepartials/login.html',
                controller: 'authController'
            })
            
            .when('/createRecorder', {
                templateUrl: 'fusepartials/createRecorderForm.html',
                controller: 'createRecorderController'
            })
            .when("/fetchrecorders/:sut?", {
                templateUrl: "fusepartials/recorderList.html",
                controller: "recorderListController",
                reloadOnUrl: false,
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
            .when("/viewRecorder/:id", {
                templateUrl: "fusepartials/viewRecorder.html",
                controller: "viewRecorderController",
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
            .otherwise({
                redirectTo: "/selectService/home"
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