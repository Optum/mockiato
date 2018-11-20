var dir = angular.module("mockapp.directives",[])

    .directive('integerNoDecimal', ['dirConstants', function(dirConstants) {
        return {
          require: 'ngModel',
          link: function(scope, elm, attrs, ctrl) {
            ctrl.$validators.integer = function(modelValue, viewValue) {
              if (ctrl.$isEmpty(modelValue)) {
                // consider empty models to be valid
                return false;
              }
              var re = new RegExp("^[0-9]*$");//call regex from constant shouldn't be hardcoded
              if (re.test(viewValue)) {
                // it is valid
                return true;
              }
      
              // it is invalid
              return false;
            };
          }
        };
      }]);


//Put all the hard coding or constants here for directives.      
dir.constant("dirConstants", {
    "INTEGER_REGEXP" : '^[0-9]*$'
});