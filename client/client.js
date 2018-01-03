// TODO : http://stackoverflow.com/questions/38240504/refresh-expired-jwt-in-browser-when-using-google-sign-in-for-websites
// OR   : http://stackoverflow.com/questions/32150845/how-to-refresh-expired-google-sign-in-logins?rq=1
// READ : http://stackoverflow.com/questions/3105296/if-rest-applications-are-supposed-to-be-stateless-how-do-you-manage-sessions
// READ : http://www.cloudidentity.com/blog/2014/03/03/principles-of-token-validation/
// TODO : https://jsfiddle.net/JamesWClark/8p8subj9/
// CLIENT API: https://developers.google.com/identity/sign-in/web/reference#gapiauth2authresponse

// CRITICAL TODO: https://stackoverflow.com/a/37580494/1161948


var profile; // google user profile
var authResponse; // google user auth response

function start() {
    gapi.load('auth2', function() {
        auth2 = gapi.auth2.init({
            client_id : '570807057244-dgdihgn2co89soo39sb6td3o2j0m6f5p.apps.googleusercontent.com',
            // Scopes to request in addition to 'profile' and 'email'
            //scope: 'additional_scope'
        })
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
    
    // true = include access_token, see: https://stackoverflow.com/a/44773920/1161948
    authResponse = googleUser.getAuthResponse(true); 
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

// give an error message on pseudo loopback interface
if (window.location.hostname === '127.0.0.1') {
    $('#app').html('Google Web Login requires `localhost` and not `127.0.0.1`. Try <a href="http://localhost:1898/client">here</a> instead.');
    $('#app').show();
}

// detect awake from computer sleep, used to refresh auth tokens
var wakeWorker = new Worker('workers/detect-wake.js');
wakeWorker.onmessage = function (ev) {
  if (ev && ev.data === 'wakeup') {
     console.log('awake');
      // TODO: refresh auth token if it's expired
  }
}
