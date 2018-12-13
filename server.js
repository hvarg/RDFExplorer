 // SET UP ====================================================================
const express     = require('express');
const morgan      = require('morgan');
const bodyParser  = require('body-parser');
const fs          = require('fs');

const port      = 8080;
const views     = __dirname + '/public/views/';

var app = express();
// EXPRESS CONFIGURATION ======================================================
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public')); 
app.use(morgan('dev'));
app.locals.pretty = true; //TODO check in all brow
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// SURVEY =====================================================================
app.post('/upload-survey', function(req, res) {
  var timestamp = Number(new Date);
  fs.writeFile(
    'survey-results/' + timestamp + '.json',
    JSON.stringify(req.body),
    'utf8',
    function () {
      res.sendStatus(200);
    }
  );
});

app.post('/upload-logs', function(req, res) {
  var timestamp = Number(new Date);
  fs.writeFile(
    'user-logs/' + timestamp + '.json',
    JSON.stringify(req.body),
    'utf8',
    function () {
      res.sendStatus(200);
    }
  );
});

// ROUTES =====================================================================
app.get('/survey', function(req, res) {
  res.render(views+'survey-es.pug');
});

app.get('/modal/help', function (req, res) {
  res.render(views+'modal/help.pug');
});

app.get('/*', function(req, res) {
  res.render(views+'index.pug');
});


// LISTEN =====================================================================
app.listen(port);
console.log("App listening on port", port);
