const ReconnectingWebSocket = require('reconnecting-websocket');

window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);


// an ad-hoc function to show/hide the trailing '.' of 'ITF.'
function updateWebSocketStatusIndicator(status) {
  const $itf = document.querySelector('tr.counter[data-counter-name="imagine-the-future"] .counter-label');

  if ($itf) {
    if (status) {
      $itf.innerText = 'IMAGINE THE FUTURE.';
    }
    else {
      $itf.innerText = 'IMAGINE THE FUTURE';
    }
  }
}

function fetchFile (path) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open('GET', path, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
      resolve(request.response);
    };
    request.onerror = function () {
      reject(err)
    };

    request.send();
  });
}


class Counter {
  constructor(name, node) {
    this.name = name;
    this.$node = node;

    // fetch audio file and decode
    fetchFile(`/audio/${name}.mp3`).then((data) => {
      audioContext.decodeAudioData(data, (buffer) => {
        this.audioBuffer = buffer;
      });
    });
  }

  playSound() {
    const source = audioContext.createBufferSource();
    source.connect(gainNode);
    source.buffer = this.audioBuffer;
    source.start();
  }

  onClick() {
    this.playSound();
    command.incr(this.name);
  }

  update(value) {
    this.$node.querySelector('.count').innerText = value;
  }
}

class Command {
  constructor() {
    this.isWebSocketEstablished = false;

    let ws = new ReconnectingWebSocket('ws://' + window.location.host + '/api/websocket');
    ws.addEventListener('open', () => {
      this.isWebSocketEstablished = true;
      updateWebSocketStatusIndicator(true);
    });
    ws.addEventListener('close', () => {
      this.isWebSocketEstablished = false;
      updateWebSocketStatusIndicator(false);
    });
    ws.onmessage = (e) => {
      const signal = JSON.parse(e.data);
      this.onSignal(signal);
    }

    setInterval(() => { this.heartbeat(); }, 10000);

    this.ws = ws;
  }

  heartbeat() {
    this.ws.send(JSON.stringify({
      type: 'heartbeat'
    }));
  }

  incr(name) {
    if (this.isWebSocketEstablished === true) {
      this.ws.send(JSON.stringify({
        type: 'incr',
        data: {
          name: name
        }
      }));
    }
    else {
      window.location.href = `/${name}/incr`;
    }
  }

  onSignal(signal) {
    switch (signal.type) {
      case 'update':
        const counter = counters[signal.data.name];
        if (counter) {
          counter.update(signal.data.count);
        }
    }
  }
}

// globals
let counters = {};
const command = new Command();

window.addEventListener('DOMContentLoaded', () => {
  const $counters = document.querySelectorAll(".counter");
  for (let i = 0; i < $counters.length; i++) {
    const $counter = $counters[i];
    const name = $counter.dataset.counterName.replace(/-/g, '_');

    const counter = new Counter(name, $counter);
    counters[name] = counter;

    $counter.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      counter.onClick();
    });
    $counter.querySelector('a').addEventListener('touchstart', function (e) {
      e.stopPropagation();
      e.preventDefault();
      counter.onClick();
    });
  }
});
