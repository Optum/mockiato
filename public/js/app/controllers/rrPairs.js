var ctrl = angular.module("mockapp.controllers")
  .controller("rrPairController", ['suggestionsService', '$scope', 'ctrlConstants',
    function (suggestionsService, $scope, ctrlConstants){
            $scope.addNewRRPair = function () {
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
                if (newItemNo > 10){
                  $scope.loadMore();
                  window.scrollTo(0, document.body.scrollHeight);
                }
              };

              $scope.removeRRPair = function (index) {
                $('#genricMsg-dialog').find('.modal-title').text(ctrlConstants.DEL_CONFIRM_TITLE);
                $('#genricMsg-dialog').find('.modal-body').html(ctrlConstants.DEL_CONFIRM_RRPAIR_BODY);
                $('#genricMsg-dialog').find('.modal-footer').html(ctrlConstants.DEL_CONFIRM_FOOTER);
                $('#genricMsg-dialog').modal('toggle');
                $scope.rrPairNo = index;
                $('#modal-btn-yes').on("click", function () {
                  $scope.servicevo.rawpairs.splice($scope.rrPairNo, 1);
                  $scope.$apply();
                });
              };

              $scope.addNewReqHeader = function (rr) {
                var newItemNo = rr.reqHeadersArr.length;
                rr.reqHeadersArr.push({ 'id': newItemNo });
              };
        
              $scope.removeReqHeader = function (rr, index) {
                rr.reqHeadersArr.splice(index, 1);
              };
        
              $scope.addNewResHeader = function (rr) {
                var newItemNo = rr.resHeadersArr.length;
                rr.resHeadersArr.push({ 'id': newItemNo });
              };
        
              $scope.removeResHeader = function (rr, index) {
                rr.resHeadersArr.splice(index, 1);
              };
        
              $scope.addQuery = function (rr) {
                var newItemNo = rr.queriesArr.length;
                rr.queriesArr.push({ 'id': newItemNo });
              };
        
              $scope.removeQuery = function (rr, index) {
                rr.queriesArr.splice(index, 1);
              };
        
              $scope.removeQuery = function (rr, index) {
                rr.queriesArr.splice(index, 1);
              };

              $scope.totalDisplayed = 10;
              $scope.loadMore = function () {
                $scope.totalDisplayed += 10;
              };

              $scope.setContentType = function (rr, type) {
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
        
        }]);
    
