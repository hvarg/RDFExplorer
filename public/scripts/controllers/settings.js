angular.module('rdfvis.controllers').controller('SettingsCtrl', SettingsCtrl);

SettingsCtrl.$inject = ['settingsService', 'requestService', 'queryService', '$http', '$scope'];

function SettingsCtrl (settings, request, query, $http, $scope) {
  var vm = this;

  vm.noResults  = false;
  vm.loading    = false;
  vm.endpoint   = null;
  vm.class      = null;
  vm.limit      = 10;

  vm.getClasses = getClasses;
  vm.cancel     = getSettings;
  vm.save       = setSettings;
  vm.default    = setDefault;

  function copyObj (obj) {
    return Object.assign({}, obj);
  }

  function getSettings () {
    vm.limit = settings.resultLimit;
    vm.endpoint = Object.assign({}, settings.endpoint); //to copy the object.
    vm.class = Object.assign({}, settings.searchClass ); 
  }
  
  function setSettings () {
    if (vm.class.uri) settings.searchClass = vm.class;
    if (vm.limit) settings.resultLimit = vm.limit;
    if (vm.endpoint) settings.endpoint = vm.endpoint;
    $scope.$emit('newSettings', 1);
    getSettings();
  }

  function setDefault () {
    settings.searchClass = copyObj(settings.default.searchClass);
    settings.endpoint    = copyObj(settings.default.endpoint);
    settings.resultLimit = settings.default.resultLimit;
    getSettings();
  }

  function getClasses (label) {
    var q = query.search(label, 'http://www.w3.org/2002/07/owl#Class');
    return request.execQuery(q, data => { return data.results.bindings; });
  }

  getSettings();
}
