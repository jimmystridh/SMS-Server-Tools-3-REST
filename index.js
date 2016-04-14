var restify = require('restify'),
    shortId = require('shortid'),
    smsDir = process.env.SMS_DIR || '/var/spool/sms',
    fs = require('fs'),
    path = require('path'),
    port = process.env.PORT || 8090;

function getSent(req, res, next) {
    var dir = path.join(smsDir,'sent');
    fs.readdir(dir, function(err, files) {
        res.send(files.map(function(v) { 
                      return { name:v,
                               time:fs.statSync(path.join(dir,v)).mtime.getTime()
                             }; 
        }).sort(function(a, b) { return a.time - b.time; }).map(function(v) { return v.name; }));
        
        next();
    });
}

function sendSms(req, res, next) {
    var id = "sms_" + shortId.generate(),
        message = req.body.message,
        to = req.body.to,
        flash = req.body.flash === true || req.body.flash === "true",
        spoolFile = "";

    spoolFile = "To: " + to + "\n";
    if(flash) spoolFile += "Flash: yes\n";
    spoolFile += "\n";
    spoolFile += message;
    fs.writeFile(path.join(smsDir,'outgoing',id), spoolFile, function(err) {
        if(err) {
            res.status(503);
            res.send({
                "code": "Error_saving",
                "message": "There was an error saving the message to the spooler: " + err,
                "id": id
            });
            next();
        } else {
            res.send({
                "code": "Sent",
                "message": "Message '"+message+"' was sent to the spooler to be delivered to "+to,
                "id": id
            });
        }


        
    
    });

}

var server = restify.createServer();

server.use(restify.CORS());
server.use(restify.bodyParser({ mapParams: false }));

server.get('/sms/sent', getSent);
//server.get('/sms/sent/:file', getSentFile);
server.post('/sms', sendSms);
server.get('/', restify.serveStatic({
  directory: './public/',
  default: 'index.html'
}));

server.listen(port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
