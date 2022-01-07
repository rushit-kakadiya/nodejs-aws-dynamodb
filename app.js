const createError = require('http-errors'),
  express = require('express'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  morgan = require('morgan'),
  cors = require('cors'),
  compression = require('compression');

require('dotenv').config('.env');

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// // Initialize the Amazon Cognito credentials provider
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//   IdentityPoolId: process.env.IDENTITY_POOL_ID
// });

app.use(morgan('dev'));
app.use(compression({
  level: 6,
  threshold: 10 * 1000,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression(req, res)
  }
}))

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.options('*', cors());

const userRoutes = require('./routes/user');
app.use('/', userRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
