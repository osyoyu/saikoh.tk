const ReconnectingWebSocket = require('reconnecting-websocket');

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

// an ad-hoc function to show/hide the trailing '.' of 'ITF.'
function updateWebSocketStatusIndicator(status) {
  const $itf = document.querySelector('tr.counter[data-counter-slug="imagine-the-future"] .counter-name');

  if ($itf) {
    if (status) {
      $itf.innerText = 'IMAGINE THE FUTURE.';
    }
    else {
      $itf.innerText = 'IMAGINE THE FUTURE';
    }
  }
}

class Counter {
  constructor(slug, node) {
    this.slug = slug;
    this.$node = node;
  }

  onClick() {
    command.incr(this.slug);
  }

  update(value) {
    this.$node.querySelector('.count').innerText = value;
  }
}

class Command {
  constructor() {
    this.ws = new ReconnectingWebSocket('ws://' + window.location.host + '/api/websocket');
    this.ws.addEventListener('open', () => { updateWebSocketStatusIndicator(true); });
    this.ws.addEventListener('close', () => { updateWebSocketStatusIndicator(false); });
    this.ws.onmessage = (e) => {
      const signal = JSON.parse(e.data);
      this.onSignal(signal);
    }
  }

  incr(slug) {
    this.ws.send(JSON.stringify({
      type: 'incr',
      data: {
        slug: slug
      }
    }));
  }

  onSignal(signal) {
    switch (signal.type) {
      case 'update':
        const counter = counters[signal.data.slug];
        if (counter) {
          counter.update(signal.data.value);
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
    const slug = $counter.dataset.counterSlug;

    const counter = new Counter(slug, $counter);
    counters[slug] = counter;

    $counter.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      counter.onClick();
    });
  }
});
