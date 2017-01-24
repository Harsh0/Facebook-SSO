var express           =     require('express')
  , passport          =     require('passport')
  , util              =     require('util')
  , FacebookStrategy  =     require('passport-facebook').Strategy
  , cookieParser      =     require('cookie-parser')
  , bodyParser        =     require('body-parser')
  , config            =     require('./configuration/config')
  , mongoose          =     require('mongoose')
  , app               =     express();

//Connect to Database
if(config.username&&config.password){
    var conString = 'mongodb://'+config.username+':'+config.password+'@'+config.host+':'+config.port+'/'+config.database;
}else{
    var conString = 'mongodb://'+config.host+':'+config.port+'/'+config.database;
}
mongoose.connect(conString);
var db = mongoose.connection;
db.on('error',console.error.bind(console,'Connection error.......!!!!!'));
db.once('open',function(){
 console.log("Connected to MongoDB successfully");
});

//User Schema
var Schema = mongoose.Schema;
var userSchema = new Schema({
  _id:String,
  username:String
});
var User = mongoose.model('userdetails',userSchema);


// Passport session setup.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


// Use the FacebookStrategy within Passport.

passport.use(new FacebookStrategy({
    clientID: config.facebook_api_key,
    clientSecret:config.facebook_api_secret ,
    callbackURL: "http://localhost:8080/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      //Check whether the User exists or not using profile.id
      User.findById(profile.id,function(err,data){
          if(err) throw err;
          if(data){
                console.log("User already exists in database");
          }else{
                console.log("There is no such user, adding now");
              //add user in database
              var user = {_id:profile.id,'username':profile.displayName};
              user = new User(user);
              user.save(function(error){
                  if(error) throw error;
                  console.log("User Added!");
              });
          }
      });
      return done(null, profile);
    });
  }
));


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('express-session')({ secret: 'my secret', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/auth/facebook', passport.authenticate('facebook',{scope:'email'}));


app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect : '/', failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.listen(8080);
