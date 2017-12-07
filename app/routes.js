 // app/routes.js
    module.exports = function(app) {
        // route to handle all angular requests
        app.get('/', function(req, res) {
            // load our public/index.html file
            res.sendFile(__dirname+'/public/index.html');
        });
    };
