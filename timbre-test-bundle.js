(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ADTA = require('allocated-dynamic-typedarray');

function Clusterer(pixels, opts) {
  opts = opts || {};
  var count = opts.clusters || 4;

  this.dataFactor = opts.dataFactor || 4;
  this.async = opts.async === false ? false : true;
  this.dist = opts.comparator || rgbaDist2;

  this.pixels = pixels;
  this.clusters = [];
  this.means = this.defaultInitialMeans(count);

  // Each value in the cluster will point to the index of a value
  // within the sourceData. A.K.A. each cluster is a list of pointers
  // to the "memory" that is the sourceData.

  var maxClusterSize = this.pixels.length / this.dataFactor;

  for (var i = 0; i < count; i++) {
    this.clusters.push(new ADTA(maxClusterSize));
  }

  // Place each offset of the first component of each pixel
  // into an initial cluster.
  for (var i = 0; i < pixels.length; i+= this.dataFactor) {
    this.clusterForPixel(i).push(i);
  }
}

module.exports = Clusterer;

Clusterer.prototype.clusterForPixel = function(dataIdx) {
  var min = Number.MAX_VALUE;
  var target = -1;
  for (var i = 0; i < this.means.length; i += 4) {
    var dist = this.dist(
      this.means[i+0],
      this.means[i+1],
      this.means[i+2],
      this.means[i+3],

      this.pixels[dataIdx+0],
      this.pixels[dataIdx+1],
      this.pixels[dataIdx+2],
      this.pixels[dataIdx+3]
    )

    if (dist < min) {
      min = dist;
      target = i;
    }
  }

  return this.clusters[target / this.dataFactor];
}

Clusterer.prototype.updateMeans = function() {
  var means = this.means;
  var clusters = this.clusters;
  var sourceData = this.pixels;
  var self = this;

  clusters.forEach(function(cluster, meanIdx) {
    var r = 0, g = 0, b = 0;

    for (var i = 0; i < cluster.length(); i++) {
      var sourceIdx = cluster.get(i);
      r += sourceData[sourceIdx+0];
      g += sourceData[sourceIdx+1];
      b += sourceData[sourceIdx+2];
    }

    // cluster length of 0 means NaN.
    var meanR = Math.floor(r / cluster.length()) || 0;
    var meanG = Math.floor(g / cluster.length()) || 0;
    var meanB = Math.floor(b / cluster.length()) || 0;

    means[meanIdx*self.dataFactor+0] = meanR;
    means[meanIdx*self.dataFactor+1] = meanG;
    means[meanIdx*self.dataFactor+2] = meanB;
  });
}

Clusterer.prototype.updateClusters = function() {
  var clusters = this.clusters;
  var means = this.means;
  var sourceData = this.pixels;

  var movementCount = 0;
  for (var i = 0; i < clusters.length; i++) {
    var cluster = clusters[i];
    for (var j = 0; j < cluster.length(); j++) {
      var didx = cluster.get(j);

      var targetCluster = this.clusterForPixel(didx);

      if (targetCluster !== cluster) {
        targetCluster.push(cluster.get(j));
        cluster.remove(j);
        movementCount += 1;
        // If we removed an element from this cluster, ensure
        // we don't skip the next element.
        j--;
      }
    }
  }

  return movementCount;
}

Clusterer.prototype.solve = function(progress, complete) {
  var means = this.updateMeans.bind(this);
  var clusters = this.updateClusters.bind(this);
  var self = this;
  var count = 0;

  if (this.async) {
    (function next() {
      setTimeout(function() {
        means();
        var moved = clusters();
        count += 1;
        if (moved > 0) {
          progress(self, count);
          next();
        } else {
          complete(self, count);
        }
      }, 0)
    }())
  } else {
    var moved = 1;
    while (moved > 0) {
      means();
      moved = clusters();
      count += 1;
      progress(self, count);
    }
    complete(self, count);
  }
}

Clusterer.prototype.defaultInitialMeans = function(count) {
  var means = [];

  for (var i = 0; i < count; i++) {
    var ratio = i / count;
    var r = ratio * 255;
    var g = ratio * 255;
    var b = ratio * 255;
    var a = 1;
    means.push(r, g, b, a);
  }

  return means;
}

// Given an array of palette pixels, assume the order matches that of
// the clusters, and create a new array of pixel data using the palette
// pixels in the same arrangement as the clusters.
Clusterer.prototype.applyPalette = function(palette, opt_output) {
  var out = opt_output || new Uint8ClampedArray(this.pixels.length);

  for (var i = 0; i < this.clusters.length; i++) {
    var cluster = this.clusters[i];
    var colorIdx = (i % palette.length) * this.dataFactor;
    for (var j = 0; j < cluster.length(); j++) {
      var p = cluster.get(j);
      for (var k = 0; k < this.dataFactor; k++) {
        out[p+k] = palette[colorIdx+k];
      }
    }
  }

  return out;
}

function rgbaDist2(r1, g1, b1, a1, r2, g2, b2, a2) {
  var r = r1 - r2;
  var g = g1 - g2;
  var b = b1 - b2;
  var a = a1 - a2;

  return r*r + g*g + b*b + a*a;
}
},{"allocated-dynamic-typedarray":2}],2:[function(require,module,exports){
function AllocatedArray(maxLength, opt_type) {
  this._length = 0;
  this.data = new (opt_type || Uint32Array)(maxLength);
}

AllocatedArray.prototype.push = function(value) {
  var len = arguments.length;

  if (len === 1) {
    this.data[this._length] = value;
    return this._length += 1;
  }

  for (var i = 0; i < len; i++) {
    this.data[this._length] = arguments[i];
    this._length += 1;
  }

  return this._length;
}

AllocatedArray.prototype.length = function() {
  return this._length;
}

AllocatedArray.prototype.remove = function(index) {
  var value = this.data[index];
  this.data[index] = this.data[this._length-1];
  this._length -= 1;
  return value;
}

AllocatedArray.prototype.get = function(index) {
  return this.data[index];
}

AllocatedArray.prototype.toArray = function(opt_array) {
  var len = this._length;
  var arr = opt_array || new Array(len);

  for (var i = 0; i < len; i++) {
    arr[i] = this.data[i];
  }

  // Truncate length in case passed in array was larger.
  arr.length = len;
  return arr;
}

module.exports = AllocatedArray;
},{}],3:[function(require,module,exports){
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


},{"ncolorpalette-clusterer":1}]},{},[3]);
