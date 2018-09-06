angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', '$timeout'];

function MainCtrl ($scope, pGraph, query, request, $timeout) {
  var vm = this;
  /* General stuff */
  vm.tool = 'none';
  vm.toolToggle = toolToggle;

  vm.search = search;
  vm.tutorial = tutorial;

  /* vars */
  vm.searchInput = null;
  vm.searchResults = [];
  vm.searchActive = false;
  vm.searchWait = false;
  vm.noResults  = false;
  vm.lastSearch = '';

  /* functions */
  vm.updateSVG = pGraph.refresh;
  vm.getZoom = null;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;

  /* scope */
  $scope.drag = drag;
  $scope.dragSearch = dragSearch;
  $scope.$on('newSettings', function(event, data) { vm.lastSearch = ''; });
  $scope.$on('tool', function(event, data) {
    vm.tool = data; 
    document.getElementById('right-panel').scrollTop=0;
  });

  /* Tools display function */
  function toolToggle (panel) {
    vm.tool = (vm.tool == panel) ? 'none' : panel;
    if (vm.tool == 'describe' && pGraph.getSelected()) pGraph.getSelected().describe();
    if (vm.tool == 'edit' && pGraph.getSelected()) pGraph.getSelected().edit();
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function onSearch (data) {
    var r = {}
    data.results.bindings.forEach(res => {
      if (!r[res.uri.value]) r[res.uri.value] = [];
      r[res.uri.value].push( res );
    });
    vm.searchResults = [];
    for (key in r) {
      var tmp = {uri: r[key][0].uri, label: r[key][0].label, types: []};
      r[key].forEach(res => {
        if (res.type) {
          tmp.types.push( {uri: res.type, label: res.tlabel } );
        }
      });
      vm.searchResults.push(tmp);
    }

    //vm.searchResults = data.results.bindings;
    vm.searchError = false;
    vm.searchWait = false;
    if (vm.searchResults.length == 0) vm.noResults = true;
  }

  function onSearchErr (resp) {
    vm.searchWait = false;
    vm.noResults = false;
    vm.searchError = true;
    vm.lastSearch = '';
  }

  function search () {
    if (vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.lastSearch = input;
      vm.searchWait = true;
      vm.noResults  = false; 
      request.execQuery(query.search(input), onSearch, onSearchErr);
    }
    vm.searchActive = true;
  }

  function drag (ev, uri, prop, special) {
    if (!special) special = '';
    ev.dataTransfer.setData("uri", uri);
    ev.dataTransfer.setData("prop", prop);
    ev.dataTransfer.setData("special", special);
  }

  function dragSearch (ev) {
    ev.dataTransfer.setData("special", "search");
    ev.dataTransfer.setData("alias", vm.lastSearch);
  }

  function tutorial () {
    var intro = introJs();
    intro.setOptions({
      steps: [
        { intro: 'Hello, this tutorial will guide you in the exploration of a RDF dataset.'},
        { element: '#step1', intro: 'You can start searching <b>resources</b> here', position: 'bottom-right-aligned'},
        { element: '#search-container', intro: 'Search results will be displayed here', position: 'right-aligned'},
        { element: '#d3vqb', intro: 'You can drag and drop the search results here', position: 'right-aligned'},
        { intro: 'You can also create new resource using <i> shift+click </i> and new edges pressing <i> shift </i> and dragging from one resource to another'},
        { element: '#right-buttons', intro: 'More tools are displayed here', position: 'left-aligned'},
      ]
    });
    intro.start();
  }
}
