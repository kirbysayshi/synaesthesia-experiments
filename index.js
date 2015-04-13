var v3 = require('pocket-physics/v3');
var accelerate = require('pocket-physics/accelerate3d');
var inertia = require('pocket-physics/inertia3d');
var constrain = require('pocket-physics/distanceconstraint3d');

var TIMESTEP = 1;
var DENSITY = 100;

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
    constraints.push( [point, points[ur], boxWidth] );
  }

  if (!isFirstRow) {
    constraints.push( [point, points[up], boxWidth] );
  }

  if (!isLeftEdge) {
    constraints.push( [point, points[lt], boxWidth] );
  }

  if (!isLeftEdge && !isFirstRow) {
    constraints.push( [point, points[ul], boxWidth] );
  }
}

//debugDrawConstraints(ctx, constraints);
drawSquares(ctx, boxWidth, maxZVelocity, points);

window.go = function tick() {
  requestAnimationFrame(function () {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    drawSquares(ctx, boxWidth, maxZVelocity, points);

    var i;
    var cdata;

    for (i = 0; i < points.length; i++) {
      accelerate(points[i], TIMESTEP);
    }

    for (i = 0; i < constraints.length; i++) {
      cdata = constraints[i];
      constrain(cdata[0], cdata[1], cdata[2]);
    }

    for (i = 0; i < points.length; i++) {
      inertia(points[i], TIMESTEP);
    }

    tick();
  })
}

function drawSquares(ctx, width, maxzvel, points) {
  for (var i = 0; i < points.length; i++) {
    var cpos = points[i].cpos;
    var ppos = points[i].ppos;
    var velz = cpos.z - ppos.z;
    var h = (velz / maxzvel) * 360;

    ctx.beginPath();
    ctx.fillStyle = 'hsl(' + h + ',80%,67%)';
    ctx.fillRect(cpos.x, cpos.y, width, width);
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
