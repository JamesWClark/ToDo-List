# ToDo-List

A restful API built with Node.js, Express, and the MongoDB driver.  

To get up and running with this app, use the following Terminal commands.

In one terminal window, run an instance of MongoDB:

    mongod

In a different terminal window, clone this repository:

    git clone https://github.com/JamesWClark/ToDo-List.git

Change to the `node` directory:

    cd Todo-List/node

Install required dependencies (see [package.json](https://github.com/JamesWClark/ToDo-List/blob/master/node/package.json)):

    npm install

Run the app:

    node server
    
*Note: Cross origin support is available out of the box, but it can be disabled by removing or commenting out the line of code `app.use(allowCrossDomain);` from `node/server.js`. To test cross origin, run the `client` folder from another web server. The `client/client.js` script uses a `route` function to pass all requests to `localhost:3000`.*

    // prepends the url of node.js server
    function route(url) {
        return 'http://localhost:3000' + url;
    }
  
*Therefore, if a port change is necessary then it must be matched in both `client/client.js` and `node/server.js`.*
  
  
  
  
Favicon source:  
https://pixabay.com/p-27781/  
https://pixabay.com/en/write-writing-pencil-paper-27781/  