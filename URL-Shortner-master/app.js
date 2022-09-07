const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const localh = '127.0.0.1'
//Cache

const redis = require('redis');

const client = redis.createClient(6379);

const shorthash = require('short-hash'); //Library for hashing

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', require('ejs').renderFile);
const bodyParser = require('body-parser');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//const home_url = "http://localhost:3000/re/";

const db = require('mongodb').MongoClient;
db.connect()
  .then(client => {
    console.log("Connected to Database");
  })

// Use middleware to set the default Content-Type
app.use(function (req, res, next) {
  res.header('Content-Type', 'application/json');
  next();
});

//Default route
app.get('/', (req, res) => {
  res.header('Content-Type', 'text/html');
  res.render('index.html')
})

app.post('/generate', (req, res) => {
  console.log("Reached here")
  //generates a hashed URL

  //get the url
  const original_url = req.body.url;


  //Generate hash of the url  http://goolgdnskndkms.com --->ghikjbhn
  const hash = (shorthash(original_url) + "").slice(4);

  //Store value in Mongo
  var ref = db.collection('Hash').insertOne({ 
    hash: hash,
    url: original_url })

  
  var base_url = req.protocol + "://" + req.headers.host + "/re/";

  //http://localhost/re/ghikjbhn

  console.log(base_url)
  console.log("Sending response");
  res.send({ hash: base_url + hash });

})

// db.collection.findOne({hash:ghikjbhn })

app.get('/re/:hash', (req, res) => {
  //get the hashcode
  var hash = req.params.hash; //ghikjbhn
  console.log(hash)

  client.on('connect', function () {
    console.log('cache connected');
  }).on('error', function (error) {
    console.log(error);
  });

  //Check if key is in cache


  client.exists(hash, function (err, reply) {
    if (reply === 0) {
      //Doesn't exist, call Mongodb
      //read the hash key value pair from Mongo
      var ref = db.collection('Hash').findOne({hash: hash})
        .then((data) => {
          var original_url = data.url;

          return original_url;
        }).then((original_url) => {
          //redirect to the original url
          console.log('original url', original_url)
          res.redirect(original_url);
        })
    } else {
      //redirect

      client.get(hash, (err, reply) => {
        res.redirect(reply);
      })
    }
  });



});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})