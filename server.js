 // SET UP ====================================================================
const express     = require('express');
const morgan      = require('morgan');
const bodyParser  = require('body-parser');

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

// ROUTES =====================================================================
app.get('/modal/help', function (req, res) {
  res.render(views+'modal/help.pug');
});

app.get('/*', function(req, res) {
  res.render(views+'index.pug');
});


// LISTEN =====================================================================
app.listen(port);
console.log("App listening on port", port);
