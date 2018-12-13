angular.module('survey', [
  'angular-loading-bar',
  'ngAnimate',
  'ngCookies',
  'ui.bootstrap',
]);

/* angular-loading-bar spinner off
angular.module('survey').config([
  'cfpLoadingBarProvider', cfpLoadingBarProvider => {
    cfpLoadingBarProvider.includeSpinner = false;
  }
]);*/

angular.module('survey').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$http', '$cookies'];

function MainCtrl ($http, $c) {
  var vm = this;

  function guid() {
    return "sss".replace(/s/g, s4);
  }

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  var userId = $c.get('userId');
  if (!userId) {
    var ex = new Date();
    ex.setDate(ex.getDate() + 7);
    userId = guid();
    $c.put('userId', userId, {'expires': ex})
  }

  vm.data = {
    user: {gender: 'male', age: '18-24', degree: null, group: 'A1', id: userId},
    tasks: [
      [ // Set 1
        {sparql: null, time: null}, {sparql: null, time: null},
        {sparql: null, time: null}, {sparql: null, time: null}, {sparql: null, time: null},
      ],
      [ // Set 2
        {sparql: null, time: null}, {sparql: null, time: null},
        {sparql: null, time: null}, {sparql: null, time: null}, {sparql: null, time: null},
      ]
    ],
    tlx: [
      {for: null, score: [50, 50, 50, 50, 50, 50]},
      {for: null, score: [50, 50, 50, 50, 50, 50]},
    ],
    likert: [
      {for: null, score: [3,3,3]},
      {for: null, score: [3,3,3]},
    ],
    simple: [
      {for: null, value: ''},
      {for: null, value: ''},
    ]
  }

  vm.step = 0;
  vm.urlStep = 0;
  vm.taskStep = 0;

  vm.url = null;
  vm.taskSet = null;

  vm.tlx = [
    {category: "Exigencia Mental", text: "¿Qué tan demandante mentalmente fueron las tareas?", lmin:"Muy baja", lmax:"Muy alta", },
    {category: "Exigencia Fisica", text: "¿Qué tan demandante fisicamente fueron las tareas?", lmin:"Muy baja", lmax:"Muy alta", },
    {category: "Exigencia Temporal", text: "¿Qué tan rápido fue el ritmo impuesto para hacer las tareas?", lmin:"Muy baja", lmax:"Muy alta", },
    {category: "Rendimiento", text: "¿Qué tan exitoso fue en lograr lo que le fue requerido?", lmin:"Perfecto", lmax:"Fracaso", },
    {category: "Esfuerzo", text: "¿Qué tan duro tuvo que trabajar para lograr un nivel adecuado de rendimiento?", lmin:"Muy baja", lmax:"Muy alta", },
    {category: "Frustración", text: "¿Qué tan inseguro, irritado, estresado o molesto está por la tarea?", lmin:"Muy baja", lmax:"Muy alta", },
  ]

  vm.likert = [
    { text: "Tengo confianza en las respuestas que proveí", lmin:"Completamente en desacuerdo", lmax:"Completamente de acuerdo", },
    { text: "Estoy satisfecho con la herramienta", lmin:"Completamente en desacuerdo", lmax:"Completamente de acuerdo", },
    { text: "Es probable que recomiende la herramienta a un amigo o colega", lmin:"Completamente en desacuerdo", lmax:"Completamente de acuerdo", },
  ]

  vm.clock = null;

  vm.next = next;
  vm.subtitle = subtitle;
  vm.download = download;
  vm.upload = upload;

  loadState();
  loadData();

  function subtitle () {
    if (vm.step == 1) return 'Identificación de usuario';
    if (vm.step == 2) return 'Tarea ' + (vm.taskStep+1) + ' de 5';
    if (vm.step == 3) return 'Nasa-TLX para ' + vm.url[vm.urlStep].slice(8);;
    if (vm.step == 4) return 'Likert para ' + vm.url[vm.urlStep].slice(8);
  }

  function next () {
    switch (vm.step) {
      case 0: // User agreement
        vm.step += 1;
        saveState();
        break;

      case 1: // Identification
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});

        vm.group = vm.data.user.group;
        if (vm.group[0] === 'A') {
          vm.url = ["https://explorer.csrg.cl", "https://query.wikidata.org"];
        } else {
          vm.url = ["https://query.wikidata.org", "https://explorer.csrg.cl"];
        }
        vm.taskSet = Number(vm.group[1]);

        vm.step += 1;
        vm.clock = Date.now();
        saveState();
        saveData();
        break;

      case 2: // Tasks
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        vm.data.tasks[vm.taskSet -1][vm.taskStep].time = (Date.now() - vm.clock) / 1000;
        vm.data.tasks[vm.taskSet -1][vm.taskStep].for = vm.url[vm.urlStep];
        vm.clock = Date.now();
        vm.taskStep += 1;

        if (vm.taskStep == 5) {
          vm.step += 1;
          vm.taskStep = 0;
        }
        saveState();
        saveData();
        break;

      case 3: // TLX
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        vm.data.tlx[vm.urlStep].for = vm.url[vm.urlStep];
        vm.step += 1;
        saveState();
        saveData();
        break;

      case 4: // Others
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        vm.data.likert[vm.urlStep].for = vm.url[vm.urlStep];
        vm.data.simple[vm.urlStep].for = vm.url[vm.urlStep];
        if (vm.taskSet === Number(vm.group[1])) { //change to the other tool and task set
          vm.taskSet = (vm.taskSet % 2) + 1;
          vm.urlStep += 1;
          vm.clock = Date.now();
          vm.step = 2;
        } else {
          vm.step += 1;
          upload();
          uploadLogs();
        }
        saveState();
        saveData();
        break;
    }
  }

  function download () {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vm.data));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "answers.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  vm.send = true;
  vm.send2 = true;

  function upload () {
    vm.send = false;
    return $http({
      method: 'POST',
      url: '/upload-survey',
      data: vm.data
    }).then(
      r => { vm.send = true; console.log(r); },
      r => { console.log(r); });
  }

  function uploadLogs () {
    vm.send2 = false;
    var logs = [];
    var sessionId = Number($c.get('sessionId')) + 1;
    for (var i = 1; i < sessionId; i++) {
      var tl = angular.fromJson(window.localStorage.getItem('log' + i));
      if (tl) {
        tl.forEach( entry => {
          logs.push(entry);
        });
      } else {
        console.log('log ' + i + ' does not exists')
      }
    }

    return $http({
      method: 'POST',
      url: '/upload-logs',
      data: {uid: userId, logs: logs}
    }).then(
      r => { vm.send2 = true; console.log(r); },
      r => { console.log(r); });
  }

  function saveState () {
    var state = {
      group: vm.group,
      url: vm.url,
      taskSet: vm.taskSet,
      step: vm.step,
      urlStep: vm.urlStep,
      taskStep: vm.taskStep,
      clock: vm.clock,
    }
    window.localStorage.setItem('survey-state', angular.toJson(state));
  }

  function saveData () {
    window.localStorage.setItem('survey-data', angular.toJson(vm.data));
  }

  function loadState () {
    var state = angular.fromJson(window.localStorage.getItem('survey-state'));
    if (state) {
      vm.group = state.group;
      vm.url = state.url;
      vm.taskSet = state.taskSet;
      vm.step = state.step;
      vm.urlStep = state.urlStep;
      vm.taskStep = state.taskStep;
      vm.clock = state.clock;
    }
  }

  function loadData () {
    var data = angular.fromJson(window.localStorage.getItem('survey-data'));
    if (data) {
      vm.data = data;
    }
  }
}
