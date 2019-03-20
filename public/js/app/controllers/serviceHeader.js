var ctrl = angular.module("mockapp.controllers")
.controller("serviceHeaderController",['suggestionsService','$scope',
    function(suggestionsService,$scope){
        $scope.addFailStatus = function () {
            $scope.servicevo.failStatuses.push({ val: '' });
          }
          $scope.removeFailStatus = function (index) {
            $scope.servicevo.failStatuses.splice(index, 1);
          }
          $scope.addFailString = function () {
            $scope.servicevo.failStrings.push({ val: '' });
          }
          $scope.removeFailString = function (index) {
            $scope.servicevo.failStrings.splice(index, 1);
          }
          $scope.addTemplate = function () {
            $scope.servicevo.matchTemplates.push({ id: 0, val: '' });
          };
    
          $scope.removeTemplate = function (index) {
            $scope.servicevo.matchTemplates.splice(index, 1);
          };
    
    }]);