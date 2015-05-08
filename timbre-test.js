var Clusterer = require('ncolorpalette-clusterer');

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser2048 = audioCtx.createAnalyser();
var analyser1024 = audioCtx.createAnalyser();

analyser2048.fftSize = 2048;
analyser1024.fftSize = 1024;

var frequencies = new Uint8Array(analyser2048.frequencyBinCount);
var waveform = new Uint8Array(analyser1024.fftSize);
var xy = new Uint8Array((frequencies.length + waveform.length) * 2);

var noop = function() {}

var clusterOpts = {
  clusters: 12,
  dataFactor: 4,
  async: false,
  comparator: function(f1, w1, _, _, f2, w2, _, _) {
    return (f1-f2)*(f1-f2) + (w1-w2)*(w1-w2)
  }
}

var fcvs = document.createElement('canvas')
var wcvs = document.createElement('canvas')
var ccvs = document.createElement('canvas')

fcvs.width = wcvs.width = ccvs.width = 1024

var fctx = fcvs.getContext('2d')
var wctx = wcvs.getContext('2d')
var cctx = ccvs.getContext('2d')

//fctx.globalAlpha = wctx.globalAlpha = cctx.globalAlpha = 0.1;

document.body.appendChild(fcvs)
document.body.appendChild(wcvs)
document.body.appendChild(ccvs)

navigator.getUserMedia = (navigator.getUserMedia
  || navigator.webkitGetUserMedia
  || navigator.mozGetUserMedia
  || navigator.msGetUserMedia);

navigator.getUserMedia({ audio: true }, function(stream) {
  var source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser2048);
  source.connect(analyser1024);

  ;(function draw() {
    analyse()
    requestAnimationFrame(draw)
  }());
}, console.error.bind(console))

document.addEventListener('keypress', function(e) {
  if (e.which == 32) analyse();
}, false)

function analyse() {
  analyser2048.getByteFrequencyData(frequencies)
  analyser1024.getByteTimeDomainData(waveform)

  //console.log('frequencies', frequencies)
  //console.log('waveform', waveform)

  cctx.clearRect(0, 0, ccvs.width, ccvs.height)
  fctx.clearRect(0, 0, fcvs.width, fcvs.height)
  wctx.clearRect(0, 0, wcvs.width, wcvs.height)

  for (var i = 0; i < frequencies.length; i++) {
    xy[(i * 4) + 0] = frequencies[i];
    xy[(i * 4) + 1] = waveform[i];
  }

  var clusterer = new Clusterer(xy, clusterOpts)
  clusterer.solve(noop, noop)
  var means = clusterer.means;

  for (var i = 0; i < means.length; i+=4) {
    var cluster = clusterer.clusters[i/4];
    var clusterLength = cluster.length();
    if (clusterLength >= 1024/2 || clusterLength === 0) continue;
    var scaledWave = ((means[i+1] / 256) - 0.5) * ccvs.height
    var clusterSizeScaled = (clusterLength / 1024) * ccvs.height

    var max = Number.MIN_VALUE
    var min = Number.MAX_VALUE

    for (var j = 0; j < cluster.length(); j++) {
      max = Math.max(max, clusterer.pixels[cluster.get(j)])
      min = Math.min(min, clusterer.pixels[cluster.get(j)])
    }

    cctx.fillRect(
      (min / 256) * ccvs.width,   // frequency
      ccvs.height/2 - scaledWave/2 - (clusterSizeScaled / 2), // waveform
      ((max-min) / 256) * ccvs.width,
      (clusterLength / 1024) * ccvs.height
    )
  }

  var barWidth = Math.max(fcvs.width / frequencies.length, 1)
  for (var i = 0; i < frequencies.length; i++) {
    fctx.fillRect(i*barWidth, fcvs.height, barWidth, -(frequencies[i] / 256 * fcvs.height))
  }

  var pointDist = Math.max(wcvs.width / waveform.length, 1)
  for (var i = 0; i < waveform.length; i++) {
    var scaled = ((waveform[i] / 256) - 0.5) * wcvs.height
    wctx.fillRect(i*pointDist, wcvs.height/2 - scaled/2, pointDist, scaled)
  }
}
