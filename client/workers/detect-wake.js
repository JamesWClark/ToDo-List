// https://stackoverflow.com/a/25100973/1161948
var lastTime = (new Date()).getTime();
var checkInterval = 1000;

setInterval(function () {
    var currentTime = (new Date()).getTime();

    if (currentTime > (lastTime + checkInterval * 2)) {  // ignore small delays
        postMessage("wakeup");
    }

    lastTime = currentTime;
}, checkInterval);