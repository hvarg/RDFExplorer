angular.module('survey', [
  'angular-loading-bar',
  'ngAnimate',
  'ui.bootstrap',
]);

/* angular-loading-bar spinner off
angular.module('survey').config([
  'cfpLoadingBarProvider', cfpLoadingBarProvider => {
    cfpLoadingBarProvider.includeSpinner = false;
  }
]);*/

angular.module('survey').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$http'];

function MainCtrl ($http) {
  var vm = this;

  vm.data = {
    startUrl: "https://explorer.csrg.cl",
    user: {gender: 'male', age: null, degree: null},
    tasks: [
      {on: null, sparql: null, time: null}, {on: null, sparql: null, time: null},
      {on: null, sparql: null, time: null}, {on: null, sparql: null, time: null},
      {on: null, sparql: null, time: null}, {on: null, sparql: null, time: null},
      {on: null, sparql: null, time: null}, {on: null, sparql: null, time: null},
      {on: null, sparql: null, time: null}, {on: null, sparql: null, time: null},
    ],
    tlx: [
      {on: null, score: [50, 50, 50, 50, 50, 50]},
      {on: null, score: [50, 50, 50, 50, 50, 50]},
    ],
    likert: [
      {on: null, score: [3,3,3]},
      {on: null, score: [3,3,3]},
    ]
  }

  vm.step = 0;
  vm.urlStep = 0;
  vm.taskStep = 0;

  vm.url = [
    "https://explorer.csrg.cl",
    "https://query.wikidata.org"
  ];
  
  vm.tlx = [
    {category: "Mental Demand", text: "How mentally demanding was the task?", lmin:"Very Low", lmax:"Very High", },
    {category: "Physical Demand", text: "How physically demanding was the task?", lmin:"Very Low", lmax:"Very High", },
    {category: "Temporal Demand", text: "How hurried or rushed was the pace of the task?", lmin:"Very Low", lmax:"Very High", },
    {category: "Performance", text: "How successful were you in accomplishing what you were asked to do?", lmin:"Perfect", lmax:"Failure", },
    {category: "Effort", text: "How hard did you have to work to accomplish your level of performance?", lmin:"Very Low", lmax:"Very High", },
    {category: "Frustration", text: "How insecure, discouraged, irritated, stessed, and annoyed were you?", lmin:"Very Low", lmax:"Very High", },
  ]

  vm.likert = [
    { text: "How confident are you of the answers you gave", lmin:"Not at all Confident", lmax:"Highly Confident", },
    { text: "How satisfied you are with the tool", lmin:"Very Disatisfied", lmax:"Very Satisfied", },
    { text: "How likely are you to recommend the tool to a friend or colleague?", lmin:"Not Likely", lmax:"Very Likely", },
  ]

  vm.tasks = [
    "are trees (instances of tree)",
    "have hold the position of Pope and are female",
    "are lakes of countries that have south America as continent",
    "are mountains of Europe",
    "were born in Argentina and are female",
    "are states of the United States",
    "are films and are based on comics",
    "are sovereign states that shares border with territory of France",
    "were emperors with children who were also emperors",
    "are lakes of Chile with a vertical depth greater than 500",
  ]

  vm.clock = null;

  vm.next = next;
  vm.subtitle = subtitle;
  vm.download = download;
  vm.upload = upload;

  function subtitle () {
    if (vm.step == 1) return 'Part 1: User identification';
    if (vm.step == 2) return 'Part 2: Task ' + (vm.taskStep+1) + ' of 10';
    if (vm.step == 3) return 'Part 3: Nasa-TLX for ' + vm.url[vm.urlStep].slice(8);;
    if (vm.step == 4) return 'Part 4: Likert for ' + vm.url[vm.urlStep].slice(8);
  }

  function next () {
    switch (vm.step) {
      case 0:
        if (vm.data.startUrl == "https://explorer.csrg.cl") {
          vm.url = ["https://explorer.csrg.cl", "https://query.wikidata.org"];
        } else {
          vm.url = ["https://query.wikidata.org", "https://explorer.csrg.cl"];
        }
        vm.step += 1;
        break;
      case 1:
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        vm.step += 1;
        vm.clock = Date.now();
        break;
      case 2:
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        vm.data.tasks[vm.taskStep].on = vm.url[vm.urlStep];
        vm.data.tasks[vm.taskStep].time = (Date.now() - vm.clock) / 1000;
        vm.clock = Date.now();
        vm.taskStep += 1;
        vm.urlStep = (vm.urlStep + 1) % 2;
        if (vm.taskStep == 10) {
          vm.step += 1;
          vm.urlStep = 0;
        }
        break;
      case 3:
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        if (vm.urlStep == 0) {
          vm.data.tlx[vm.urlStep].on = vm.url[vm.urlStep];
          vm.urlStep = 1;
        } else {
          vm.data.tlx[vm.urlStep].on = vm.url[vm.urlStep];
          vm.urlStep = 0;
          vm.step += 1;
        }
        break;
      case 4:
        document.getElementById('top').scrollIntoView({behavior: 'smooth'});
        if (vm.urlStep == 0) {
          vm.data.likert[vm.urlStep].on = vm.url[vm.urlStep];
          vm.urlStep = 1;
        } else {
          vm.data.likert[vm.urlStep].on = vm.url[vm.urlStep];
          vm.urlStep = 0;
          vm.step += 1;
          upload();
        }
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
  
  function upload () {
    return $http({
      method: 'POST',
      url: '/upload-survey',
      data: vm.data
    }).then(
      r => { console.log(r); },
      r => { console.log(r); });
  }
}
