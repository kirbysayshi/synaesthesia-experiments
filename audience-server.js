var path = require('path');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = process.env.HTTP_PORT || 3000;

server.listen(port, console.log.bind(console, 'Listening on ' + port));

app.set('views', __dirname);
app.set('view engine', 'vash');

app.use(express.static('.'));

app.get('/:room', function (req, res) {
  var room = req.params.room;
  res.render('audience-index.vash', {
    sectionCount: 6
  });

  setTimeout(function() {
    console.log('emitting news')
    io.of(room).emit('news', { something: 'blarg+' + room });
  }, 3000)
});

io.on('connection', function (socket) {
  console.log('connection', );
  //socket.emit('news', { hello: 'world' });
  //socket.on('my other event', function (data) {
  //  console.log(data);
  //});
});