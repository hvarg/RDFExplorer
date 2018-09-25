angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', '$timeout', '$http'];

function MainCtrl ($scope, pGraph, query, request, $timeout, $http) {
  var vm = this;
  /* General stuff */
  vm.tool = 'none';
  vm.toolToggle = toolToggle;

  vm.search = search;
  vm.tutorial = tutorial;
  vm.graph = pGraph;

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
  vm.searchChange = searchChange;

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
    if (vm.tool == 'sparql') pGraph.getQueries();
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function onSearch (data) {
    /*var r = {}
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
    }*/
    //console.log(data);
    vm.searchResults = [];
    data.forEach(r => {
      vm.searchResults.push({uri: r.concepturi, label: r.label, desc: r.description});
      if (r.label) request.setLabel(r.concepturi, r.label);
    });

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
    //TODO: fix when null;
    if (vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.lastSearch = input;
      vm.searchWait = true;
      vm.noResults  = false; 
      //$http.get('https://en.wikipedia.org/w/api.php?action=wbsearchentities&format=json&language=en&search='+input).then(
      $http.get('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=20&uselang=en&type=item&continue=0&search='+input).then(
        function onSuccess (response) {
          onSearch(response.data.search);
        },
        function onError (response) { onSearchErr(); console.log('Error: ' + response.data); }
      );
      //request.execQuery(query.search(input), onSearch, onSearchErr);
    }
    vm.searchActive = true;
  }

  function searchChange () {
    var now = vm.searchInput + '';
    $timeout(function () {
      if (now && now == vm.searchInput) search();
    }, 400);
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
        { intro: 'Hello, this tutorial will guide you in the exploration of a RDF dataset and the creation of SPARQL queries.'},
        { element: '#step1', intro: 'You can start searching <b>resources</b> here', position: 'bottom-right-aligned'},
        { element: '#search-container', intro: 'As example, let us search <i>Euler</i>...', position: 'top-right-aligned'},
        { element: '#search-results-panel', intro: 'Search results are displayed here, blue bordered elements are resources that match our search', position: 'right-aligned'},
        //{ element: '#search-query', intro: 'The first element represents the search query itself, green borders denotes that a resource is <b>variable</b>', position: 'right-aligned'},
        { element: '#search-results-panel', intro: 'Bordered elements can be dragged...', position: 'right-aligned'},
        { element: '#d3vqb', intro: '... and dropped here, this space is the <i>query creator</i>.', position: 'right-aligned'},
        { element: '#d3vqb', intro: 'Using <i> shift+click </i> you can create new resources. Pressing <i>shift</i> and dragging from one resource to another will create a property and an edge', position: 'right-aligned'},
        { element: '#right-buttons', intro: 'More tools are displayed here, from right to left: help, configuration, describe, edit and query panel.', position: 'left-aligned'},
        { element: '#right-buttons', intro: 'Those tools will help you to edit variables (add filters, options, etc), and to create your query by dragging and droping properties or relations from the partial results.', position: 'left-aligned'},
        { intro: 'Thats all!'},
      ]
    });
    intro.start().onbeforechange(function () {
      switch (intro._currentStep) {
        case 2:
          $timeout(s=>{vm.searchInput  = 'E'}, 300);
          $timeout(s=>{vm.searchInput += 'u'}, 600);
          $timeout(s=>{vm.searchInput += 'l'}, 900);
          $timeout(s=>{vm.searchInput += 'e'}, 1200);
          $timeout(s=>{vm.searchInput += 'r'; search();}, 1500);
          break;
      }
    });
  }
}
