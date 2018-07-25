/* @preserve
 *
 * angular-bootstrap-file
 * https://github.com/itslenny/angular-bootstrap-file-field
 *
 * Version: 0.1.3 - 02/21/2015
 * License: MIT
 */

angular.module('bootstrap.fileField',[])
.directive('fileField', function() {
  return {
    require:'ngModel',
    restrict: 'E',
    link: function (scope, element, attrs, ngModel) {
        //set default bootstrap class
        if(!attrs.class && !attrs.ngClass){
            element.addClass('btn');
        }

        var fileField = element.find('input');

        //If an ACCEPT attribute was provided, add it to the input.
        if (attrs.accept) {
          fileField.attr('accept', attrs.accept);
        }

        fileField.bind('change', function(event){
            scope.$evalAsync(function () {
              ngModel.$setViewValue(event.target.files[0]);
              if(attrs.preview){
                var reader = new FileReader();
                reader.onload = function (e) {
                    scope.$evalAsync(function(){
                        try {
                          // pretty print JSON in preview
                          scope[attrs.preview]=JSON.stringify(JSON.parse(e.target.result),null,"  ");
                        }
                        catch(e) {
                          console.log(e);
                          $('#failure-modal').modal('toggle');
                          scope[attrs.preview] = null;
                          return;
                        }
                    });
                };
                reader.readAsText(event.target.files[0]);
              }
            });
        });
        fileField.bind('click',function(e){
            e.stopPropagation();
        });
        element.bind('click',function(e){
            e.preventDefault();
            fileField[0].click();
        });
    },
    template:'<button type="button"><ng-transclude></ng-transclude><input type="file" style="display:none"></button>',
    replace:true,
    transclude:true
  };
});
