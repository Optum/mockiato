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


//Put all the hard coding or constants here for controller.      
ctrl.constant("ctrlConstants", {
  "DUP_REQ_ERR_TITLE": "Duplicate Request Error",
  "DUP_REQ_ERR_BODY": "Two Requests are same. Either change request data or relative path of duplicate requests.",
  "PUB_FAIL_ERR_TITLE": "Publish Failure Error",
  "PUB_FAIL_ERR_BODY": "Please ensure your request / response pairs are well formed.",
  "DUP_RECORDER_PATH_TITLE": "Publish Failure: Duplicate Path",
  "DUP_RECORDER_PATH_BODY": "This recorder's group and path overlap with an active recorder.",
  "REG_SUCCESS_TITLE": "REGISTRATION SUCCESS",
  "REG_SUCCESS_BODY": "<p><center><span style='color:#008000;font-weight:bold;font-size: 50px;'>&#x2714;</span><br></br><span style='font-weight:bold;font-size: 16px;'>Registration completed successfully</span><br></br><span>Thank you. You can log in for service virtualization now</span></center></p>",
  "CLOSE_PRMRY_BTN_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-lg btn-primary">Close</button>',
  "DATAGEN_ALERT_MSG_1000ROWS": "You may generate up to 1,000 rows of data at a time. Utilize the row id index for more.",
  "DEL_CONFIRM_TITLE": "Delete Confirmation",
  "RESTORE_CONFIRM_TITLE": "Restore Confirmation",
  "DEL_CONFIRM_BODY": "This service will be deleted and moved to Archive. Do you want to continue ?",
  "DEL_REC_CONFIRM_BODY": "Do you really want to delete this recording?",
  "DEL_CONFIRM_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-warning" id="modal-btn-yes">Yes</button><button type="button" data-dismiss="modal" class="btn btn-default" id="modal-btn-no">No</button>',
  "DEL_CONFIRM_USER_BODY": 'Do you really want to remove this user from the group?',
  "DEL_CONFIRM_RRPAIR_BODY": 'Do you really want to delete this RRPair ?',
  "BULK_UPLOAD_SUCCESS_MSG": "Bulk Upload Success! File Uploaded - ",
  "BULK_UPLOAD_FAILURE_MSG": "Unexpected Error. Bulk Upload Fail. File Uploaded - ",
  "BULK_UPLOAD_FILE_TYPE_FAILURE_MSG": "Uploaded file type is not zip. File Uploaded - ",
  "SPEC_UPLOAD_SUCCESS_MSG": "Spec Upload Success! File Uploaded - ",
  "SPEC_UPLOAD_FAILURE_MSG": "Unexpected Error. Spec Upload Fail. File Uploaded - ",
  "SPEC_FILE_TYPE_URL_PUBLISH_ERROR": "Your uploaded file type Or URL don't match with Spec type.",
  "SPEC_FILE_TYPE_UPLOAD_ERROR": "Upload Fail - Your uploaded file type don't match with Spec type. Uploaded File - ",
  "DUPLICATE_CONFIRM_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-danger">Back</button>',
  "IMPORT_ERR_MSG": "You should upload only correct json file.",
  "SUCCESS": "success",
  "GRP_ALREADY_EXIST_MSG": "Group Name Already exist.",
  "DEL_Permanent_CONFIRM_BODY": "This service will be deleted permanently. Do you want to continue ?",
  "RESTORE_CONFIRM_BODY": "This service will be restored. You can find this service in browse tab. Continue ?",
  "GRP_CREATED_SUCCESS_MSG": "Group Created Successfully",
  "GRP_DELETION_SUCCESS_MSG": "Group Deleted Successfully",
  "DEL_DRAFTSERVICE_BODY": "This service Info will be deleted. Do you want to continue ?",
  "PUB_FAIL_SERV_SAVE_BODY": " Please ensure your request / response pairs are well formed.                   " +
    "Do you want to save the Service Info as draft",
  "PUB_FAIL_SERV_SAVE_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-success" id="modal-btn-yes">Save as Draft</button><button type="button" data-dismiss="modal" class="btn btn-danger" id="modal-btn-no">Back</button>',
  //"PUB_FAIL_SERV_SAVE_FOOTER" : '<button type="button" data-dismiss="modal" class="btn btn-danger" id="modal-btn-no">Back</button>',
  "SERV_INFO_NOT_FOUND": "Service Info not found",
  "SERV_SAVE_FAIL_ERR_TITLE": "Service Info Failure",
  "BACK_DANGER_BTN_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-danger">Back</button>',
  "MRG_CONFIRM_TITLE": "Merge Confirmation",
  "MRG_CONFIRM_BODY": "Do you want to merge this RRPair into the service?",
  "MRG_CONFIRM_FOOTER": '<button type="button" data-dismiss="modal" class="btn btn-success" id="modal-btn-yes">Yes</button><button type="button" data-dismiss="modal" class="btn btn-default" id="modal-btn-no">No</button>',
  "SERVICE_RESTORE_FAIL_TITLE": "Restore Fail"
});