var ctrl = angular.module("mockapp.controllers")
  .controller("rrPairController", ['suggestionsService', '$scope', 'ctrlConstants','domManipulationService','utilityService',
    function (suggestionsService, $scope, ctrlConstants,domManipulationService,utilityService){
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

              /**
               * Creates a template from a given RR pair's request
               */
              $scope.makeTemplateFromRequest = function(rr){
                try{
                  if(rr.payloadType == "JSON"){
                    console.log("doing it");
                    let req = JSON.parse(rr.requestpayload);
                    req = utilityService.emptyOutJSON(req);
                    $scope.servicevo.matchTemplates.push({id:0,val:JSON.stringify(req,null,2)})
                  }else if(rr.payloadType == "XML"){
                    let xml = rr.requestpayload;
                    xml = xml.replace(/>[^<]+<\//g,"></");
                    xml = utilityService.prettifyXml(xml);
                    $scope.servicevo.matchTemplates.push({id:0,val:xml});

                  }else{
                    console.log("not doig it");
                    console.log(rr);
                  }
                }catch(e){
                  $('#genricMsg-dialog').find('.modal-title').text("Error creating matching template");
                  $('#genricMsg-dialog').find('.modal-body').html(e.message);
                  $('#genricMsg-dialog').find('.modal-footer').html("");
                  $('#genricMsg-dialog').modal('toggle');
                }
              }

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

              $scope.expandResponse = function($index,rr){
                var ele = document.getElementsByClassName("responsePayload")[$index];
                rr.resExpanded = true;
                domManipulationService.expandTextarea(ele);        
              }
              $scope.collapseResponse = function($index,rr){
                var ele = document.getElementsByClassName("responsePayload")[$index];
                rr.resExpanded = false;
                domManipulationService.collapseTextarea(ele);
              }
              $scope.expandRequest = function($index,rr){
                var ele = document.getElementsByClassName("requestPayload")[$index];
                rr.reqExpanded = true;
                domManipulationService.expandTextarea(ele);        
              }
              $scope.collapseRequest = function($index,rr){
                var ele = document.getElementsByClassName("requestPayload")[$index];
                rr.reqExpanded = false;
                domManipulationService.collapseTextarea(ele);
              }
        
        }]);
    
