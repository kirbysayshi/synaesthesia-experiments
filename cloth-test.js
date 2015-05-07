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
