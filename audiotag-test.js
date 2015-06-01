var files = [
    'audio/02-milkyway-explore.mp3'
  , 'audio/15-milkyway-battle.mp3'
  , 'audio/09-colonial-explore.mp3'
  , 'audio/22-colonial-battle.mp3'
]

files = files.map(function(f, idx) {
  return new Promise(function(resolve, reject) {
    var a = document.createElement('audio');
    document.body.appendChild(a);

    var b = document.createElement('button');
    b.classList.add('fader');
    b.setAttribute('data-fadernum', idx + '');
    b.textContent = 'GO ' + (idx + 1);
    document.body.appendChild(b);

    [
    'abort', 'canplay', 'canplaythrough', 'mozcanplaythrough', 'durationchange', 'emptied',
    'encrypted', 'ended', 'error', 'interruptbegin', 'interruptend',
    'load', 'loaded',
    'loadeddata', 'loadedmetadata', 'loadstart', 'mozaudioavailable',
    'onencrypted', 'pause', 'play', 'playing', 'progress', 'ratechange',
    'seeked', 'seeking', 'stalled', 'suspend', /*'timeupdate',*/ 'volumechange',
    'waiting'
    ].forEach(function(name) {
      a.addEventListener(name, console.log.bind(console, name), false);
    });

    a.addEventListener('canplaythrough', function(e) {
      resolve(a);
    }, false);
    a.addEventListener('error', function(e) {
      reject(e);
    }, false);

    // without this canplaythrough will never fire on a clean cache
    a.preload = 'auto';
    a.loop = true;
    a.src = f;
  });
})

Promise.all(files).then(function(audios) {
  bodyDebug.apply(null, audios);

  // prevent cacophony
  audios.forEach(function(a) {
    a.volume = 0;
  })

  var btnStart = document.querySelector('#start');
  btnStart.removeAttribute('disabled');
  btnStart.addEventListener('click', function() {
    if (btnStart.dataset.state === 'playing') {
      audios.forEach(function(a) {
        a.pause();
      })
      btnStart.dataset.state = 'stopped';
      btnStart.textContent = 'PLAY';
      return
    }

    if (btnStart.dataset.state === 'stopped') {
      audios.forEach(function(a) {
        a.play();
      })
      btnStart.dataset.state = 'playing';
      btnStart.textContent = 'PAUSE';
    }

  }, false);

  document.addEventListener('click', function(e) {
    if (!matches(e.target, '.fader')) return;
    var faderNum = parseInt(e.target.dataset.fadernum, 10);

    var xfade = parseFloat(document.querySelector('[name="crossfade"]').value, 10);

    audios.forEach(function(a, i) {
      if (xfade > 0) {
        if (i === faderNum) fade(a, 1, xfade);
        else fade(a, 0, xfade);
      } else {
        a.volume = 0;
        if (i === faderNum) a.volume = 1;
      }
    })

    function fade(audio, target, inc) {
      var vol = audio.volume;
      if (vol < target) audio.volume += Math.min(inc, 1 - vol);
      else if (vol > target) audio.volume -= Math.min(inc, vol);

      if (audio.volume === target) return;
      setTimeout(fade.bind(null, audio, target, inc), 0);
    }

  }, false)

}, bodyDebug)


function bodyDebug() {
  [].slice.call(arguments).forEach(function(arg) {
    var p = document.createElement('p');
    p.textContent = arg;
    document.body.appendChild(p);
  })
}

function matches(el, sel) {
  return (el.matches
  || el.webkitMatchesSelector
  || el.mozMatchesSelector
  || el.oMatchesSelector
  || el.msMatchesSelector).call(el, sel);
}
