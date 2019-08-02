var ctrl = angular.module("mockapp.controllers")
  .controller("rrPairController", ['suggestionsService', '$scope', '$location', 'ctrlConstants','domManipulationService','utilityService',
    function (suggestionsService, $scope, $location, ctrlConstants,domManipulationService,utilityService){
            //To Check if it's for service cration page or service update page.
            /* if ($location.path().slice(1) === 'addservice') {
              $scope.isCreateServPage=true;
            } */
            $scope.addNewRRPair = function () {
                var newItemNo = $scope.servicevo.rawpairs.length;
                $scope.servicevo.rawpairs.push({
                  id: newItemNo,
                  queriesArr: [{
                    id: 0
                  }],
                  reqHeadersArr: [{
                    id: 0, 'k': " "
                   }],
                  resHeadersArr: [{
                    id: 0, 'k': " "
                   }],
                   resStatus: " ",
                   isDup: false
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
              $scope.copyRRPair = function(index){
                var newItemNo = $scope.servicevo.rawpairs.length;
                $scope.rrPairCopy = $scope.servicevo.rawpairs[index];
                var newArray = {};
               newArray= angular.copy($scope.rrPairCopy);
                 // clean up autosuggest selections of Headers and Status from the copied RR Pair
               var selectedStatus = newArray.resStatus;
               if (selectedStatus && selectedStatus.description) newArray.resStatus = selectedStatus.description.value;

               if (newArray.reqHeadersArr && newArray.reqHeadersArr.length > 0) {
                 newArray.reqHeadersArr.forEach(function(head) {
                   var selectedHeader = head.k;
                   if (selectedHeader) {
                     if (selectedHeader.description) head.k = selectedHeader.description.name;
                     else if (selectedHeader.originalObject) head.k = selectedHeader.originalObject;
                   }
                 });
               }

               if (newArray.resHeadersArr && newArray.resHeadersArr.length > 0) {
                newArray.resHeadersArr.forEach(function(head) {
                   var selectedHeader = head.k;
                   if (selectedHeader) {
                     if (selectedHeader.description) head.k = selectedHeader.description.name;
                     else if (selectedHeader.originalObject) head.k = selectedHeader.originalObject;
                   }
                 });
               }
               console.log("After updating Header & status",newArray);
                newArray.id = newItemNo;
                $scope.servicevo.rawpairs.push(newArray);
                console.log($scope.servicevo.rawpairs);
              };
              /**
               * Creates a template from a given RR pair's request
               */
              $scope.makeTemplateFromRequest = function(rr){
                try{
                  let newTemplate = null;
                  if(rr.payloadType == "JSON"){
                    let req = JSON.parse(rr.requestpayload);
                    req = utilityService.emptyOutJSON(req);
                    newTemplate = JSON.stringify(req,null,2);
                  }else if(rr.payloadType == "XML" || $scope.servicevo.type == "SOAP"){
                    let xml = rr.requestpayload;
                    xml = xml.replace(/>[^<]+<\//g,"></");
                    xml = utilityService.prettifyXml(xml);
                    newTemplate = xml;
                  }

                  if(newTemplate){
                    let addNewTemplate = true;
                    $scope.servicevo.matchTemplates.forEach(function(temp){
                      if(temp.val == newTemplate){
                        addNewTemplate = false;
                        return;
                      }
                      
                    });
                    if(addNewTemplate){
                      $scope.servicevo.matchTemplates.push({id:0,val:newTemplate});
                    }
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
                rr.reqHeadersArr.push({ 'id': newItemNo, 'k': " " });
              };
        
              $scope.removeReqHeader = function (rr, index) {
                rr.reqHeadersArr.splice(index, 1);
              };
        
              $scope.addNewResHeader = function (rr) {
                var newItemNo = rr.resHeadersArr.length;
                rr.resHeadersArr.push({ 'id': newItemNo, 'k': " " });
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
    
