var url = require('url');
var io = require('socket.io-client/socket.io.js');

var room = window.location.pathname.replace(/^\//, '');
console.log('room?', room);

var socket = io(window.location.host + '/' + room);
socket.on('news', function (data) {
  console.log(data);
  //socket.emit('my other event', { my: 'data' });
});