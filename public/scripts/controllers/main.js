angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

//MainCtrl.$inject = [];

function MainCtrl () {
  var vm = this;

  vm.name = 'RDF Visualization'

  vm.test = test;

  function test () {
    console.log("TEST!");
  }
}
