(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var v3 = require('pocket-physics/v3');
var accelerate = require('pocket-physics/accelerate3d');
var inertia = require('pocket-physics/inertia3d');
var constrain = require('pocket-physics/distanceconstraint3d');
var drag = require('pocket-physics/drag3d');

var CONSTRAINT_ITERATIONS = 3;
var DRAG = 0.7//0.99;
var HUE_GRADATIONS = 30;
var TIMESTEP = 100;
var DENSITY = 50;

document.body.style
  = document.documentElement.style
  = 'width: 100%; height: 100%; padding: 0; margin: 0;';

var cvs = document.createElement('canvas');
var ctx = cvs.getContext('2d');
document.body.appendChild(cvs);

window.addEventListener('resize', sizeup, false);
sizeup();

function sizeup() {
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
}

var points = [];
var constraints = [];

var boxWidth = Math.floor(Math.max(cvs.width, cvs.height) / DENSITY);
var maxZVelocity = 100;

var hues = huemaster(HUE_GRADATIONS, '80%', '67%', '1');

var pointCountX = DENSITY;
var pointCountY = Math.floor(cvs.height / boxWidth);
var totalPointCount = pointCountX * pointCountY;

for (var i = 0; i < totalPointCount; i++) {

  var ix = i % pointCountX;
  var iy = Math.floor(i / pointCountX);

  var point = {
    id: ix + ',' + iy,
    cpos: { x: ix * boxWidth, y: iy * boxWidth, z: 0 },
    ppos: { x: ix * boxWidth, y: iy * boxWidth, z: 0 },
    acel: { x: 0, y: 0, z: 0 },
    mass: 5.5
  }

  var idx = points.push(point) - 1;

  var up = idx - pointCountX;
  var ur = idx - pointCountX + 1;
  var ul = idx - pointCountX - 1;
  var rt = idx + 1;
  var lt = idx - 1;
  var dn = idx + pointCountX;
  var dr = idx + pointCountX + 1;
  var dl = idx + pointCountX - 1;

  var isRightEdge = idx % pointCountX === pointCountX - 1;
  var isLeftEdge = idx % pointCountX === 0;
  var isFirstRow = idx < pointCountX;
  var isLastRow = idx >= totalPointCount - pointCountX;

  var dist;

  if (!isRightEdge && !isFirstRow) {
    constraints.push( [point, points[ur], v3.distance(point.cpos, points[ur].cpos)] );
  }

  if (!isFirstRow) {
    constraints.push( [point, points[up], v3.distance(point.cpos, points[up].cpos)] );
  }

  if (!isLeftEdge) {
    constraints.push( [point, points[lt], v3.distance(point.cpos, points[lt].cpos)] );
  }

  if (!isLeftEdge && !isFirstRow) {
    constraints.push( [point, points[ul], v3.distance(point.cpos, points[ul].cpos)] );
  }
}

points[0].mass = 0;
points[pointCountX - 1].mass = 0;
points[points.length-1].mass = 0;
points[points.length-pointCountX].mass = 0;

//debugDrawConstraints(ctx, constraints);
drawSquares(ctx, boxWidth, maxZVelocity, points);

window.addEventListener('mousemove', function(e) {
  var ix = Math.floor(e.clientX / boxWidth);
  var iy = Math.floor(e.clientY / boxWidth);
  var i = iy * pointCountX + ix
  var point = points[i];

  if (!point
    || i == 0
    && i == pointCountX - 1
    && i == points.length - 1
    && i == points.length - pointCountX) return;

  point.acel.z += maxZVelocity;
})

window.go = function() {

  (function fakeUser() {

  }());

  (function tick() {

    for (i = 0; i < points.length; i++) {
      if (
        Math.random() > 0.30
        && i !== 0
        && i !== pointCountX - 1
        && i !== points.length - 1
        && i !== points.length - pointCountX
      ) {
        points[i].acel.z += ((maxZVelocity * Math.random()) - (maxZVelocity/2)) * 0.01
      }
    }

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    drawSquares(ctx, boxWidth, maxZVelocity, points);

    var i;
    var cdata;

    for (i = 0; i < points.length; i++) {
      accelerate(points[i], TIMESTEP);
    }

    for (var j = 0; j < CONSTRAINT_ITERATIONS; j++)
    for (i = 0; i < constraints.length; i++) {
      cdata = constraints[i];
      constrain(cdata[0], cdata[1], cdata[2]);
    }

    for (i = 0; i < points.length; i++) {
      drag(points[i], DRAG);
      inertia(points[i], TIMESTEP);
    }

    requestAnimationFrame(tick);
  }())
}

function drawSquares(ctx, width, maxzvel, points) {
  for (var i = 0; i < points.length; i++) {
    var cpos = points[i].cpos;
    var ppos = points[i].ppos;
    var velz = cpos.z - ppos.z;
    var h = (velz / maxzvel) * 360 //Math.PI * 2;
    var cameraZ = 100;

    var distRatio = cpos.z / cameraZ;
    var w = width + (distRatio * width);
    var h = width + (distRatio * width);
    var x = cpos.x - ((distRatio * width) / 2);
    var y = cpos.y - ((distRatio * width) / 2)

    ctx.beginPath();
    //ctx.fillStyle = 'hsl(' + h + ',80%,67%)';
    //ctx.fillStyle = HUSLey(h, 0.8, 0.67)
    //ctx.fillStyle = hslToHexStyle(h - Math.PI, 0.8, 0.67);
    ctx.fillStyle = hues(h);
    //hslHold[0] = h+'';
    //hslHold[1] = '80%';
    //hslHold[2] = '67%';
    //hslHold[3] = '1';
    //HSLtoRGB(hslHold);
    //ctx.fillStyle = '#' + hslHold[0] + hslHold[1] + hslHold[2]
    ctx.fillRect(x, y, w, h);
  }
}

function debugDrawConstraints(ctx, constraints) {
  ctx.lineStyle = '2px black solid';
  for (var i = 0; i < constraints.length; i++) {
    var cdata = constraints[i];
    ctx.moveTo(cdata[0].cpos.x, cdata[0].cpos.y);
    ctx.lineTo(cdata[1].cpos.x, cdata[1].cpos.y);
    ctx.stroke();
  }
}

function debugDrawPoints(ctx, points) {
  for (var i = 0; i < points.length; i++) {
    var cpos = points[i].cpos;
    ctx.beginPath();
    ctx.arc(cpos.x, cpos.y, 5, 0, Math.PI*2, false);
    ctx.fill();
  }
}


function huemaster(gradations, s, l, a) {
  var hexes = []
  var circle = 360

  var inc = (circle / gradations);
  for (var i = 0; i < gradations; i++) {
    var h = (i/gradations) * circle;
    hexes.push( HSLtoRGB(h, s, l, a) );
  }

  return function(h) {
    var i = Math.floor((h / circle) * gradations);
    return hexes[i];
  }
}

// http://www.quasimondo.com/archives/000696.php
// hue: rads (-PI ... PI)
// saturation: (0 ... 1)/sqrt(2) -> 0 ... 100%
// luminance: (0 ... 1)

function hslToHexStyle(hue, saturation, luminance) {
  saturation = saturation / Math.SQRT2;
  var u = Math.cos( hue ) * saturation;
  var v = Math.sin( hue ) * saturation;
  var r =  luminance  + 1.139837398373983740  * v;
  var g = luminance  - 0.3946517043589703515  * u - 0.5805986066674976801 * v;
  var b = luminance + 2.03211091743119266 * u;
  return '#'
    + Math.abs(Math.floor(r*255)).toString(16)
    + Math.abs(Math.floor(g*255)).toString(16)
    + Math.abs(Math.floor(b*255)).toString(16)
}

function HUSLey(h, s, l) {
  s *= (l < .5 ? l : 1 - l) * 255;
  // Compute the base RGB values
  var r = s * Math.cos(h);
  var g = s * Math.cos(h - 2 * Math.PI / 3);
  var b = s * Math.cos(h - 4 * Math.PI / 3);
  // Lightness adjustment
  l = r * .299 + g * .587 + b * .114 - l * 255;
  // Adjust, round & clamp the instensity of each components
  return '#'
    + (r <= l ? 0 : r >= 255 + l ? 255 : Math.round(r - l)).toString(16)
    + (g <= l ? 0 : g >= 255 + l ? 255 : Math.round(g - l)).toString(16)
    + (b <= l ? 0 : b >= 255 + l ? 255 : Math.round(b - l)).toString(16)
};


// https://github.com/kamicane/rgb/blob/76045440a8e9416d828a0c44c6d9009fdb674253/index.js#L57

function HUEtoRGB(p, q, t){
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function HSLtoRGB(h, s, l, a){
  var r, b, g
  if (a == null || a === "") a = 1
  h = parseFloat(h) / 360
  s = parseFloat(s) / 100
  l = parseFloat(l) / 100
  a = parseFloat(a) / 1
  if (h > 1 || h < 0 || s > 1 || s < 0 || l > 1 || l < 0 || a > 1 || a < 0) return null
  if (s === 0){
    r = b = g = l
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s
    var p = 2 * l - q
    r = HUEtoRGB(p, q, h + 1 / 3)
    g = HUEtoRGB(p, q, h)
    b = HUEtoRGB(p, q, h - 1 / 3)
  }
  return '#'
    + Math.floor(r * 255).toString(16)
    + Math.floor(g * 255).toString(16)
    + Math.floor(b * 255).toString(16);
}



function uriToCanvas(uri, opt_cvs, cb) {
  var img = new Image();
  img.onload = function() { imageToCanvas(img, opt_cvs, cb); }
  img.onerror = cb;
  img.src = uri;
}

function imageToCanvas(image, opt_cvs, cb) {
  if (!cb) { cb = opt_cvs; opt_cvs = null; }
  var cvs = opt_cvs || document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = image.width;
  cvs.height = image.height;
  ctx.drawImage(image, 0, 0);
  cb(null, cvs);
}

},{"pocket-physics/accelerate3d":2,"pocket-physics/distanceconstraint3d":3,"pocket-physics/drag3d":4,"pocket-physics/inertia3d":5,"pocket-physics/v3":9}],2:[function(require,module,exports){
var v3 = require('./v3');

module.exports = function(cmp, dt) {
  // apply acceleration to current position, convert dt to seconds
  cmp.cpos.x += cmp.acel.x * dt * dt * 0.001;
  cmp.cpos.y += cmp.acel.y * dt * dt * 0.001;
  cmp.cpos.z += cmp.acel.z * dt * dt * 0.001;

  // reset acceleration
  v3.set(cmp.acel, 0, 0, 0);
}
},{"./v3":9}],3:[function(require,module,exports){
var v3 = require('./v3');
var debug = require('debug')('pocket-physics:distanceconstraint');

module.exports = function solve(p1, p2, goal) {
  var imass1 = 1/(p1.mass || 1);
  var imass2 = 1/(p2.mass || 1);
  var imass = imass1 + imass2

  // Current relative vector
  var delta = v3.sub(v3(), p2.cpos, p1.cpos);
  var deltaMag = v3.magnitude(delta);

  debug('goal', goal)
  debug('delta', delta)

  // Difference between current distance and goal distance
  var diff = (deltaMag - goal) / deltaMag;

  debug('delta mag', deltaMag)
  debug('diff', diff)

  // approximate mass
  v3.scale(delta, delta, diff / imass);

  debug('delta diff/imass', delta)

  var p1correction = v3.scale(v3(), delta, imass1);
  var p2correction = v3.scale(v3(), delta, imass2);

  debug('p1correction', p1correction)
  debug('p2correction', p2correction)

  if (p1.mass) v3.add(p1.cpos, p1.cpos, p1correction);
  if (p2.mass) v3.sub(p2.cpos, p2.cpos, p2correction);
}


},{"./v3":9,"debug":6}],4:[function(require,module,exports){

module.exports = function(p1, drag) {
  var x = (p1.ppos.x - p1.cpos.x) * drag;
  var y = (p1.ppos.y - p1.cpos.y) * drag;
  var z = (p1.ppos.z - p1.cpos.z) * drag;
  p1.ppos.x = p1.cpos.x + x;
  p1.ppos.y = p1.cpos.y + y;
  p1.ppos.z = p1.cpos.z + z;
}
},{}],5:[function(require,module,exports){
var v3 = require('./v3');

module.exports = function(cmp) {
  var x = cmp.cpos.x*2 - cmp.ppos.x
    , y = cmp.cpos.y*2 - cmp.ppos.y
    , z = cmp.cpos.z*2 - cmp.ppos.z;

  v3.set(cmp.ppos, cmp.cpos.x, cmp.cpos.y, cmp.cpos.z);
  v3.set(cmp.cpos, x, y, z);
}
},{"./v3":9}],6:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":7}],7:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":8}],8:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],9:[function(require,module,exports){
function v3(x, y, z) {
  return { x: x || 0, y: y || 0, z: z || 0 }
}

v3.copy = function(out, a) {
  out.x = a.x;
  out.y = a.y;
  out.z = a.z;
  return out;
}

v3.set = function(out, x, y, z) {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

v3.add = function(out, a, b) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

v3.sub = function(out, a, b) {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}

v3.scale = function(out, a, factor) {
  out.x = a.x * factor;
  out.y = a.y * factor;
  out.z = a.z * factor;
  return out;
}

v3.distance = function(v1, v2) {
  var x = v1.x - v2.x;
  var y = v1.y - v2.y;
  var z = v1.z - v2.z;
  return Math.sqrt(x*x + y*y + z*z);
}

v3.distance2 = v3.dot = function(v1, v2) {
  var x = v1.x - v2.x;
  var y = v1.y - v2.y;
  var z = v1.z - v2.z;
  return x*x + y*y + z*z;
}

v3.magnitude = function(v1) {
  var x = v1.x;
  var y = v1.y;
  var z = v1.z;
  return Math.sqrt(x*x + y*y + z*z);
}

v3.normalize = function(out, a) {
  var x = a.x;
  var y = a.y;
  var z = a.z;
  var len = x*x + y*y + z*z;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    out.x = a.x * len;
    out.y = a.y * len;
    out.z = a.z * len;
  }
  return out;
}

module.exports = v3;
},{}]},{},[1]);
