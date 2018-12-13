angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', '$timeout', '$http',
'logService', '$uibModal', '$animate'];

function MainCtrl ($scope, pGraph, query, request, $timeout, $http, log, $uibModal, $animate) {
  var vm = this;
  /** init **/
  log.init();

  /* General stuff */
  vm.tool = 'none';
  vm.toolToggle = toolToggle;

  vm.search = search;
  vm.tutorial = tutorial;
  vm.modalHelp = modalHelp;
  vm.graph = pGraph;
  vm.log = log;

  /* vars */
  vm.searchInput = null;
  vm.searchResults = [];
  vm.searchActive = false;
  vm.searchWait = false;
  vm.noResults  = false;
  vm.lastSearch = '';
  vm.tdata = {}; //interactive tutorial data.

  /* functions */
  vm.updateSVG = pGraph.refresh;
  vm.getZoom = null;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;
  vm.searchChange = searchChange;

  /* scope */
  $scope.drag = drag;
  $scope.dragExample = dragExample;
  $scope.dragSearch = dragSearch;
  $scope.$on('newSettings', function(event, data) { vm.lastSearch = ''; });
  $scope.$on('tool', function(event, data) {
    vm.tool = data; 
    document.getElementById('right-panel').scrollTop=0;
  });

  /* Tools display function */
  function toolToggle (panel) {
    var msg = 'Changed from ' + vm.tool; //log related
    vm.tool = (vm.tool == panel) ? 'none' : panel;
    log.add('Tool', msg + ' to ' + vm.tool);
    if (vm.tool == 'describe' && pGraph.getSelected()) pGraph.getSelected().describe();
    if (vm.tool == 'edit' && pGraph.getSelected()) pGraph.getSelected().edit();
    if (vm.tool == 'sparql') pGraph.getQueries();
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function onSearch (data) {
    log.add('Search', '"' + vm.lastSearch + '": ' + data.length + ' results');
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
      //$http.get('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=20&uselang=en&type=item&continue=0&search='+input).then(
      $http({
        method: 'GET',
        url: 'https://www.wikidata.org/w/api.php',
        params: {
          action: 'wbsearchentities',
          format: 'json',
          language: 'en',
          uselang: 'en',
          type: 'item',
          continue: '0',
          limit: '20',
          search: input,
          origin: '*',
        }
      }).then(
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
    var msg = uri ? 'URI: ' + uri + ' (' + uri.getLabel() + ') ' : '';
    msg += prop ? 'Property: ' + prop + ' (' + prop.getLabel() + ') ' : '';
    msg += special ? 'SP: ' + special + ' ' : '';
    log.add('Drag', msg);
  }

  function dragExample (ev, type) {
    ev.dataTransfer.setData("special", "example");
    ev.dataTransfer.setData("type", type);
    log.add('Drag', 'Example ' + type);
  }

  function dragSearch (ev) {
    ev.dataTransfer.setData("special", "search");
    ev.dataTransfer.setData("alias", vm.lastSearch);
  }

  function tutorial () {
    vm.tool = 'none';
    log.add('Tour', 'Started')
    vm.searchActive = false;

    var intro = introJs();
    intro.setOptions({
      steps: [
        { intro: 'Hello! This tutorial will guide you in the usage of this interface.'},
        { element: '#step1',
          intro: 'You can start searching <b style="color: #1f77b4;">resources</b> here',
          position: 'bottom-right-aligned'},
        { element: '#search-container', 
          intro: 'As example, let us search <i>Einstein</i>...',
          position: 'top-right-aligned'},
        { element: '#search-results-panel',
          intro: 'The search results are displayed here, each of these elements can be dragged...',
          position: 'bottom-right-aligned'},
        { element: '#vqb-main',
          intro: '... and dropped here, this space is the <i>query creator</i>.',
          position: 'right-aligned'},
        { element: '#vqb-main',
          intro: 'Clicking in a <b style="color: #1f77b4;">resource</b> here will open the ' +
                 'explorer tool (<i class="fa fa-list"></i>)',
          position: 'right-aligned'},
        { element: '#right-panel',
          intro: 'Here you can explore the properties of this <b style="color: #1f77b4;">resource</b>, '+
                 'bordered elements can be dragged and droped into the <i>query creator</i>.',
          position: 'right-aligned'},
        { element: '#right-panel',
          intro: 'As an example let us drag some of these properties...',
          position: 'right-aligned'},
        { element: '#vqb-main',
          intro: '... into the <i>query creator</i>. When you drop a <b style="color: #ff7f0e;">property</b> ' +
                 'a <b style="color: #2ca02c;">variable</b> will be created that will collect the desired ' +
                 'information. <b style="color: #2ca02c;">Variables</b> always begin with a <b>?</b>.',
          position: 'right-aligned'},
        { element: '#vqb-main',
          intro: 'Clicking a <b style="color: #2ca02c;">variable</b> will open the edit tool (<i class="fa fa-pencil"></i>).',
          position: 'right-aligned'},
        { element: '#right-panel',
          intro: 'Here you can change if this element is a <b style="color: #2ca02c;">variable</b> or a ' +
                 'constraint (<b style="color: #1f77b4;">resource</b>). ' + 
                 '<b style="color: #2ca02c;">Variables</b> will display posible solutions so you can check what are you collecting.',
          position: 'left-aligned'},
        { element: '#right-panel',
          intro: 'Next to each possible result there is a <i class="fa fa-plus"></i> symbol, clicking it ' + 
                 'will add that value as a constraint but will not set the <b style="color: #1f77b4;">resource</b> as one. ' +
                 'To set this <b style="color: #1f77b4;">resource</b> as constraint (or as ' +
                 '<b style="color: #2ca02c;">variable</b>) you should click on the tabs above.',
          position: 'left-aligned'},
        { element: '#right-buttons',
          intro: 'More tools are displayed here. You can switch tools at any time. ' +
                 'Lets us check the <i>query</i> tool (<i class="fa fa-code"></i>)',
          position: 'left-aligned'},
        { element: '#right-panel',
          intro: 'Here you can see the SPARQL equivalent of the query you\'ve drawn in the <i>query creator</i>. ' +
                 'Executing this query will give you all required results.',
          position: 'left-aligned'},
        { intro: 'For more options right-click on any element of the <i>query creator</i>.'
        },
        { element: '#help-button',
          intro: 'If you need more help or want to see some examples click here.'
        },
      ]
    });

    intro.start().onbeforechange(function () {
      switch (intro._currentStep) {
        case 2:
          $timeout(s=>{vm.searchInput  = 'E'}, 200);
          $timeout(s=>{vm.searchInput += 'i'}, 300);
          $timeout(s=>{vm.searchInput += 'n'}, 400);
          $timeout(s=>{vm.searchInput += 's'}, 600);
          $timeout(s=>{vm.searchInput += 't'}, 800);
          $timeout(s=>{vm.searchInput += 'e'}, 900);
          $timeout(s=>{vm.searchInput += 'i'}, 1000);
          $timeout(s=>{vm.searchInput += 'n'; search();}, 1100);
          break;

        case 4:
          vm.searchActive = true;
          var base = angular.element( document.querySelector( '#result0' ) );
          var pos = base.offset();
          vm.tdata.elem = base.clone().attr('id', 'example-move');
          vm.tdata.elem.css('left', pos.left);
          vm.tdata.elem.css('top', pos.top);
          vm.tdata.elem.prependTo('#vqb-main');
          vm.tdata.elem.css('-webkit-animation', 'simulate-drag 1.5s 1');
          $timeout(function () {
            vm.tdata.elem.remove();
            var uri = vm.searchResults[0].uri;
            vm.tdata.resource = pGraph.getNodeByUri(uri);
            if (!vm.tdata.resource) {
              vm.tdata.resource = pGraph.addNode();
              vm.tdata.resource.addUri(uri);
              vm.tdata.resource.mkConst();
            }
            vm.tdata.resource.setPosition(pos.left+300+110, pos.top+15);
            pGraph.refresh();
          }, 1500);
          break;

        case 5:
          vm.searchActive = false;
          if (vm.tdata.resource) {
            vm.tdata.resource.onClick();
            pGraph.refresh();
          }
          break;

        case 7:
          document.getElementById('objptitle').scrollIntoView({behavior: 'smooth'});
          break;

        case 8:
          document.getElementById('objptitle').scrollIntoView({behavior: 'smooth'});
          var base = angular.element( document.querySelector( '#propId0' ) );
          var pos = base.offset();
          vm.tdata.elem2 = base.clone().attr('id', 'example-move')
          vm.tdata.elem2.addClass('propRect');
          vm.tdata.elem2.css('width', 200);
          vm.tdata.elem2.css('border-color', 'rgb(255, 127, 14)')
          vm.tdata.elem2.css('left', pos.left);
          vm.tdata.elem2.css('top', pos.top);
          vm.tdata.elem2.prependTo('#vqb-main');
          vm.tdata.elem2.css('-webkit-animation', 'simulate-drag2 1.5s 1');
          $timeout(function () {
            var prop = vm.tdata.elem2[0].getAttribute("title");
            vm.tdata.elem2.remove();
            vm.tdata.resource2 = pGraph.addNode();
            vm.tdata.resource2.setPosition(700, 150);
            var p = vm.tdata.resource.getPropByUri(prop);
            if (!p) {
              p = vm.tdata.resource.newProp();
              p.addUri(prop);
              p.mkConst();
            }
            pGraph.addEdge(p, vm.tdata.resource2);
            pGraph.refresh();
          }, 1500);
          break;

        case 9:
          if (vm.tdata.resource2) {
            vm.tdata.resource2.onClick();
            pGraph.refresh();
          }
          break;

        case 13:
          toolToggle('sparql')
          $scope.$apply();
          break;

      }
    });
  }

  function modalHelp () {
    log.add('Tutorial', 'Started')
    $uibModal.open({
      animation: true,
      windowClass: 'show',
      templateUrl: '/modal/help',
      size: 'lg',
    }).result.then(function(){}, function(res){});
  }
}
