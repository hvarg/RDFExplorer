angular.module('rdfvis', [
  'angular-loading-bar',
  'ngAnimate',
  'ngCookies',
  'ui.bootstrap',
  'rdfvis.services',
  'rdfvis.controllers',
  'rdfvis.directives',
]);

angular.module('rdfvis.services', []);
angular.module('rdfvis.controllers', []);
angular.module('rdfvis.directives', []);

// angular-loading-bar spinner off
angular.module('rdfvis').config([
  'cfpLoadingBarProvider', cfpLoadingBarProvider => {
    cfpLoadingBarProvider.includeSpinner = false;
  }
]);
