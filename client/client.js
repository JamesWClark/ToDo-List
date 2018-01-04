// TODO : http://stackoverflow.com/questions/38240504/refresh-expired-jwt-in-browser-when-using-google-sign-in-for-websites
// OR   : http://stackoverflow.com/questions/32150845/how-to-refresh-expired-google-sign-in-logins?rq=1
// READ : http://stackoverflow.com/questions/3105296/if-rest-applications-are-supposed-to-be-stateless-how-do-you-manage-sessions
// READ : http://www.cloudidentity.com/blog/2014/03/03/principles-of-token-validation/
// TODO : https://jsfiddle.net/JamesWClark/8p8subj9/
// CLIENT API: https://developers.google.com/identity/sign-in/web/reference#gapiauth2authresponse

var profile; // google user profile
var authResponse; // google user auth response

function start() {
    gapi.load('auth2', function() {
        auth2 = gapi.auth2.init({
            client_id : '570807057244-dgdihgn2co89soo39sb6td3o2j0m6f5p.apps.googleusercontent.com',
            // Scopes to request in addition to 'profile' and 'email'
            //scope: 'additional_scope'
        })
        
        // pending testing: https://stackoverflow.com/a/37580494/1161948
        // Listen for changes to current user.
        // (called shortly before expiration)
        auth2.currentUser.listen(function(googleUser){
            console.log(moment().format() + ': listener has fired an event');
            console.log('time to compare tokens');
            authResponse = googleUser.getAuthResponse();
            console.log(JSON.stringify(parseJwt(authResponse.id_token)));
            profile = googleUser.getBasicProfile();
            
        });
    })
}

//https://developers.google.com/identity/sign-in/web/server-side-flow
function signInCallback(authResult) {
    if(authResult['code']) {
        
        $('#signinButton').attr('style', 'display: none');
        
        console.log('authResult["code"] = ', authResult['code']);
    } else {
        console.log('signInCallback error');
    }
}

$('#signinButton').click(function() {
    auth2.grantOfflineAccess().then(signInCallback);
});

function onSignIn(googleUser) {
    
    // pass a true parameter = include access_token, see: https://stackoverflow.com/a/44773920/1161948
    // authResponse = googleUser.getAuthResponse(true); 
    authResponse = googleUser.getAuthResponse(); 
    profile = googleUser.getBasicProfile();
    
    console.log('googleUser = ', googleUser);
    console.log('profile = ', profile);
    console.log('authResponse = ', authResponse);

    var login = {
        id: profile.getId(),
        accessToken: authResponse.access_token,
        name: profile.getName(),
        givenName: profile.getGivenName(),
        familyName: profile.getFamilyName(),
        imageUrl: profile.getImageUrl(),
        email: profile.getEmail(),
        hostedDomain: googleUser.getHostedDomain()
    };

    http.post('/login', login, function(data, statusText, jqXHR) {
        if(jqXHR.status === 201) {
            console.log('login ok ' + data);
            // create a persistent access token cookie
        }
    });
    
    http.get('/tasks', function(data, statusText, jqXHR) {
        if(jqXHR.status === 200) {
            data.forEach(function(obj) {
                $('#todo-list').append('<div data-id="' + obj._id + '" contenteditable="true" class="dc well well-lg col-md-12">' + obj.text + '<span class="glyphicon glyphicon-trash"></span></div>');    
            });
        } else {
            alert('no milk :(');
        }
    }, function(jqXHR, textStatus, errorThrown) {
        alert('error');
    });
    
    $('.g-signin2').hide();
    $('#g-signout').show();
    $('#app').show();
}

function signOut() {
    gapi.auth2.getAuthInstance().signOut();
    $('.g-signin2').show();
    $('#g-signout').hide();
    $('#app').hide();
    $('#todo-list').html('');
}

function disconnect() {
    gapi.auth2.getAuthInstance().disconnect();
    $('.g-signin2').show();
    $('#g-signout').hide();
    $('#app').hide();
    $('#todo-list').html('');
}

var http = {};

// prepends the url of node.js server to any path
function route(path) {
    return 'http://localhost:3000' + path;
}

http.post = function(url, json, success, error) {
    $.ajax({
        url: route(url),
        method: 'POST',
        data: json,
        headers: {
            'Authorization': authResponse.id_token
        },
        success: function(data, statusText, jqXHR) {
            if (success) success(data, statusText, jqXHR);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (error) error(jqXHR, textStatus, errorThrown);
        }
    });
};

http.get = function(url, success, error) {
    $.ajax({
        url: route(url),
        method: 'GET',
        headers: {
            'Authorization': authResponse.id_token
        },
        success: function(data, statusText, jqXHR) {
            if (success) success(data, statusText, jqXHR);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (error) error(jqXHR, textStatus, errorThrown);
        }
    });
};

http.put = function(url, json, success, error) {
    $.ajax({
        url: route(url),
        method: 'PUT',
        data: json,
        headers: {
            'Authorization': authResponse.id_token
        },
        success: function(data, statusText, jqXHR) {
            if (success) success(data, statusText, jqXHR);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (error) error(jqXHR, textStatus, errorThrown);
        }
    });
};

http.delete = function(url, success, error) {
    $.ajax({
        url: route(url),
        method: 'DELETE',
        headers: {
            'Authorization': authResponse.id_token
        },
        success: function(data, statusText, jqXHR) {
            if (success) success(data, statusText, jqXHR);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (error) error(jqXHR, textStatus, errorThrown);
        }
    });
};

$('#new-task').keypress(function(e) {
    if (e.which == 13) { // the enter key
        e.preventDefault();
        
        var payload = { text: $(this).text() };
        
        http.post('/task', payload, function(data, statusText, jqXHR) {
            if (jqXHR.status === 201) {
                $('#todo-list').append('<div data-id="' + data.insertedIds[0] + '" contenteditable="true" class="dc well well-lg col-md-12">' + data.ops[0].text + '<span class="glyphicon glyphicon-trash"></span></div>');
                $('#new-task').html('');
            } else {
                alert('error :S');
            }
        });
    }
});

$('#app').on('keypress', '.dc', function(e) {
    if (e.which == 13) { // the enter key
        e.preventDefault();
        
        var taskElement = $(this);
        var data = { text: taskElement.text() };
        var taskId = taskElement.data('id');
        
        http.put('/task/' + taskId, data, function(data, statusText, jqXHR) {
            if(jqXHR.status === 200) {
                taskElement.blur();
            }
        });
    }
});

$('#app').on('click', '.well .glyphicon-trash', function() {
    var taskElement = $(this).parent();
    var taskId = taskElement.data('id');
    
    http.delete('/task/' + taskId, function(data, statusText, jqXHR) {
        if(jqXHR.status === 200) {
            taskElement.remove();
        }
    });
});

// https://stackoverflow.com/a/38552302/1161948
function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(atob(base64));
};

// give an error message on pseudo loopback interface
if (window.location.hostname === '127.0.0.1') {
    $('#app').html('Google Web Login requires `localhost` and not `127.0.0.1`. Try <a href="http://localhost:1898/client">here</a> instead.');
    $('#app').show();
}

// detect awake from computer sleep, used to refresh auth tokens
var wakeWorker = new Worker('workers/detect-wake.js');
wakeWorker.onmessage = function (ev) {
    if (ev && ev.data === 'wakeup') {
        console.log('computer woke from sleep');
        
        // pending testing: https://stackoverflow.com/a/37580494/1161948
        if (auth2.isSignedIn.get() == true) {
            console.log('user is signed in');
            console.log('check the id token expiry ' + authResponse.id_token);
            console.log('parsed = ' + JSON.stringify(parseJwt(authResponse.id_token)));
            // example: http://www.jsonmate.com/permalink/5a4d0b57a35702c60cc60d4c
            
            var jwt = parseJwt(authResponse.id_token);
            var now = moment(); 
            var exp = moment(parseInt('' + jwt.exp + '000'));
            console.log('expiry is ' + exp);
            console.log('now is ' + now);
            if(now.isSame(exp) || now.isAfter(exp)) {
                console.log('time to refresh the token');
                gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse().then(function() {
                    console.log('check it now - ' + JSON.stringify(parseJwt(authResponse.id_token)));
                });
            }
        }
    }
}
