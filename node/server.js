// TODO: https://stackoverflow.com/questions/17769011/how-does-cookie-based-authentication-work
// TODO: https://developers.google.com/identity/sign-in/web/server-side-flow
// READ: https://community.auth0.com/questions/10010/clarification-on-token-usage
// REF: https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=ya29.GlsyBVAdGpJyOBOtE-35zDrVqFXEefrh8spD1TTeP7GAh7pwkNfIlADnd93Mn4UVQl7uCQIxZb8-6S5VQqyv3ANiDyE-t0HQLnCMy6gyRiyL3aStWvWO_MKogJE4
// READ: https://developers.google.com/identity/protocols/OAuth2
// READ: https://en.wikipedia.org/wiki/OAuth
// READ: https://groups.google.com/forum/#!topic/firebase-talk/rjR0zYiiEhM

var fs          = require('fs'); // file systems
var jwt         = require('jsonwebtoken'); // json web tokens
var http        = require('http'); // http protocol
var express     = require('express'); // web server
var request     = require('request'); // http trafficer
var jwkToPem    = require('jwk-to-pem'); // converts json web key to pem
var bodyParser  = require('body-parser'); // http body parser
var mongodb     = require('mongodb'); // MongoDB driver

var Mongo       = mongodb.MongoClient;
var ObjectID    = mongodb.ObjectID;

var keyCache    = {}; // public key cache

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME   = 'todo';
const CLIENT_ID = fs.readFileSync(__dirname + '/client_id', 'utf8');

/**
 * MongoDB operations
 * connects to MongoDB and registers a series of asynchronous methods
 */
Mongo.connect(MONGO_URL, function(err, client) {
  
    log('what is err? ', err);
  
    const db = client.db(DB_NAME);

    Mongo.ops = {};
    
    Mongo.ops.find = function(collection, json, callback) {
        db.collection(collection).find(json).toArray(function(error, docs) {
            if(callback) callback(error, docs);
        });
    };
    
    Mongo.ops.findOne = function(collection, json, callback) {
        db.collection(collection).findOne(json, function(error, doc) {
            if(callback) callback(error, doc);
        });
    };

    Mongo.ops.insert = function(collection, json, callback) {
        db.collection(collection).insert(json, function(error, result) {
            if(callback) callback(error, result);
        });
    };

    Mongo.ops.upsert = function(collection, query, json, callback) {
        db.collection(collection).updateOne(query, { $set: json }, { upsert: true }, function(error, result) {
            if (callback) callback(error, result);
        });
    };
    
    Mongo.ops.updateOne = function(collection, query, json, callback) {
        db.collection(collection).updateOne(query, { $set : json }, function(error, result) {
            if(callback) callback(error, result);
        });
    };
    
    Mongo.ops.deleteOne = function(collection, query, callback) {
        db.collection(collection).deleteOne(query, function(error, result) {
            if(callback) callback(error, result);
        });
    };
    
    Mongo.ops.deleteMany = function(collection, query, callback) {
        db.collection(collection).deleteMany(query, function(error, result) {
            if(callback) callback(error, result);
        });
    };
});

// web server
var app = express();
var webroot = __dirname + '/../client/';
var port = 3000;

// use middlewares
app.use('/', express.static(webroot));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(allowCrossDomain);
app.use(authorize);

app.post('/login', function(req, res) {
    var query = { id: req.body.id };
    Mongo.ops.upsert('login', query, req.body, function(error, result) {
      log('/login req.body = ', req.body);
      if(error) res.status(500).send(error);
      else res.status(201).send(result);      
    });
});

app.post('/task', function(req, res) {
    Mongo.ops.insert('task', payload(req), function(error, result) {
        log('post /task = ', payload(req));
        if(error) res.status(500).send(error);
        else res.status(201).send(result);
    });
});

app.put('/task/:taskId', function(req, res) {
    var query = { _id : new ObjectID(req.params.taskId) };
    query.userid = getUserId(req);
    Mongo.ops.updateOne('task', query, req.body, function(error, result) {
        log('put /task/:taskId = ', query);
        if(error) res.status(500).send(error);
        else res.status(200).send(result);
    });
});

app.delete('/task/:taskId', function(req, res) {
    var query = payload(req);
    query._id = new ObjectID(req.params.taskId);
    Mongo.ops.deleteOne('task', query, function(error, result) {
        log('delete /task/:taskId = ', query);
        if(error) res.status(500).send(error);
        else res.status(200).send(result);
    });
});

app.get('/tasks', function(req, res) {
    Mongo.ops.find('task', payload(req), function(error, docs) {
        log('get /tasks = ', payload(req));
        if(error) res.status(500).send(error);
        else res.status(200).send(docs);
    });
});

// listen on port 3000
app.listen(3000, function() {
    cacheWellKnownKeys();
    log('listening on port 3000');
});



/**
 * Middleware:
 * allows cross domain requests
 * ends preflight checks
 */
function allowCrossDomain(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    // end pre flights
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
    } else {
        next();
    }
}

/**
 * Middleware:
 * validates tokens and authorizes users
 */
function authorize(req, res, next) {

    // jwt.decode: https://github.com/auth0/node-jsonwebtoken#jwtdecodetoken--options
    // jwt.verify: https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback

    try {
        var token       = req.headers.authorization;
        var decoded     = jwt.decode(token, { complete: true });
        var keyID       = decoded.header.kid;
        var algorithm   = decoded.header.alg;
        var iss         = decoded.payload.iss;
        var pem         = getPem(keyID);

        if (iss === 'accounts.google.com' || iss === 'https://accounts.google.com') {
            var options = {
                audience: CLIENT_ID,
                issuer: iss,
                algorithms: [algorithm]
            }

            jwt.verify(token, pem, options, function(err) {
                if (err) {
                    res.writeHead(401);
                    res.end();
                } else {
                    next();
                }
            });            

        } else {
            res.writeHead(401);
            res.end();
        }
    } catch (err) {
        res.writeHead(401);
        res.end();
    }
}

/**
 * Generate a random token of length n
 */
function generateToken(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for(var i = 0; i < n; i++) {
        var randomCharIndex = Math.floor(Math.random() * chars.length);
        token += chars[randomCharIndex];
    }
    return token;
}

/**
 * Attach user ID to their payload
 */
function payload(req) {
    if(req.body) {
        var data = req.body;
        data.userid = getUserId(req);
        return data;        
    } else {
        return { userid : getUserId(req) };
    }
}

/**
 * Get userid from idtoken in authorization header
 */
function getUserId(req) {
    var idToken = req.headers.authorization;
    return jwt.decode(idToken).sub;
};

/**
 * Converts json web key to pem key
 */
function getPem(keyID) {
    var jsonWebKeys = keyCache.keys.filter(function(key) {
        return key.kid === keyID;
    });
    return jwkToPem(jsonWebKeys[0]);
}

/**
 * Cache Google's well known public keys
 */
function cacheWellKnownKeys() {

    // get the well known config from google
    request('https://accounts.google.com/.well-known/openid-configuration', function(err, res, body) {
        var config = JSON.parse(body);
        var address = config.jwks_uri; // ex: https://www.googleapis.com/oauth2/v3/certs

        // get the public json web keys
        request(address, function(err, res, body) {

            keyCache.keys = JSON.parse(body).keys;

            // example cache-control header: 
            // public, max-age=24497, must-revalidate, no-transform
            var cacheControl = res.headers['cache-control'];
            var values = cacheControl.split(',');
            var maxAge = parseInt(values[1].split('=')[1]);

            // update the key cache when the max age expires
            setTimeout(cacheWellKnownKeys, maxAge * 1000);

            log('Cached keys = ', keyCache.keys);
        });
    });
}

/**
 * Custom logger to prevent circular reference in JSON.parse(obj)
 */
function log(msg, obj) {
    console.log('\n');
    if (obj) {
        try {
            console.log(msg + JSON.stringify(obj));
        } catch (err) {
            var simpleObject = {};
            for (var prop in obj) {
                if (!obj.hasOwnProperty(prop)) {
                    continue;
                }
                if (typeof(obj[prop]) == 'object') {
                    continue;
                }
                if (typeof(obj[prop]) == 'function') {
                    continue;
                }
                simpleObject[prop] = obj[prop];
            }
            console.log('circular-' + msg + JSON.stringify(simpleObject)); // returns cleaned up JSON
        }
    } else {
        console.log(msg);
    }
}