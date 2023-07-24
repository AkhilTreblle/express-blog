var express = require('express');

var app = express();

var routes = require('./routes/web');
const session = require('express-session');
app.use(session({
    secret: 'my-express',
    resave: false,
    saveUninitialized: false
  }));
  //View engine
app.set('view engine', 'ejs');
//For retrieving public folder
app.use('/static', express.static('public'));

app.use(function(req, res, next) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});
app.use('/',routes);
app.listen(3030);