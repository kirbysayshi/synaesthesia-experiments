var Clusterer = require('ncolorpalette-clusterer');

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser2048 = audioCtx.createAnalyser();
var analyser1024 = audioCtx.createAnalyser();
var meyda;
var gauges;

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
var gcvs = document.createElement('canvas')

fcvs.width = wcvs.width = ccvs.width = gcvs.width = 1024
gcvs.height = 1024

var fctx = fcvs.getContext('2d')
var wctx = wcvs.getContext('2d')
var cctx = ccvs.getContext('2d')
var gctx = gcvs.getContext('2d')

//fctx.globalAlpha = wctx.globalAlpha = cctx.globalAlpha = 0.1;

document.body.appendChild(fcvs)
document.body.appendChild(wcvs)
document.body.appendChild(ccvs)
document.body.appendChild(gcvs)

navigator.getUserMedia = (navigator.getUserMedia
  || navigator.webkitGetUserMedia
  || navigator.mozGetUserMedia
  || navigator.msGetUserMedia);

navigator.getUserMedia({ audio: true }, function(stream) {
  var source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser2048);
  source.connect(analyser1024);

  meyda = new Meyda(audioCtx,source,512);
  gauges = meydaGauges(meyda,
    'rms',
    'energy',
    'zcr',
    'spectralCentroid',
    'spectralFlatness',
    'spectralSlope',
    'spectralRolloff',
    'spectralSpread',
    'spectralSkewness',
    'spectralKurtosis',
    //'mfcc',
    //'loudness',
    'perceptualSpread',
    'perceptualSharpness')

  // meyda has a bug where meyda.signal isn't defined until the first
  // audio event is received by the internal script processor node
  setTimeout(function draw() {
    analyse()
    requestAnimationFrame(draw)
  }, 200);
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
  gctx.clearRect(0, 0, gcvs.width, gcvs.height)

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

  gctx.save()
  gctx.translate(gcvs.width/2, gcvs.height/2)
  var arc = Math.PI*2 / gauges.names.length
  var half = gcvs.width/2
  var boxWidth = half * 0.05
  var boxHeight = half * 0.05
  var innerRadius = half * 0.2
  var gaugeLength = half - innerRadius - boxHeight
  for(var i = 0; i < gauges.names.length; i++) {
    gctx.fillRect(-boxWidth / 2, (gauges.values[i]() * -gaugeLength) - innerRadius, boxWidth, boxHeight)
    gctx.rotate(Math.PI/2)
    gctx.fillText(gauges.names[i], innerRadius, 0)
    gctx.rotate(-Math.PI/2)
    gctx.rotate(arc)
  }
  gctx.restore()
}

function meydaGauges(meyda, features) {
  var gauges = {
    names: [],
    values: []
  }
  for (var i = 1; i < arguments.length; i++) {
    gauges.names.push(arguments[i])
    gauges.values.push(meydaGauge(meyda, arguments[i], 1))
  }
  return gauges;
}

function meydaGauge(meyda, name, smoothness) {
  smoothness = smoothness || 1;
  var min = Number.MAX_VALUE;
  var max = Number.MIN_VALUE;
  for(var lasts = new Array(smoothness), i = 0; i < smoothness; i++) lasts[i] = 0;
  return function() {
    var val = meyda.get(name)
    min = Math.min(val || 0, min)
    max = Math.max(val || 0, max)
    var diff = max - min
    lasts.unshift(val)
    lasts.pop()
    var a = avg.apply(null, lasts)
    return (a - min) / (max - min);
  }

  // smooth the jitter
  function avg() {
    var sum = 0;
    for (var i = 0; i < arguments.length; i++) {
      sum += arguments[i]
    }
    return sum / arguments.length
  }
}

