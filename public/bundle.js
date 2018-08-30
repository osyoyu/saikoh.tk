(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
    audioContext.resume();  // Chrome Autoplay Policy
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

    let ws = new ReconnectingWebSocket('wss://' + window.location.host + '/api/websocket');
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

},{"reconnecting-websocket":2}],2:[function(require,module,exports){
"use strict";
var isWebSocket = function (constructor) {
    return constructor && constructor.CLOSING === 2;
};
var isGlobalWebSocket = function () {
    return typeof WebSocket !== 'undefined' && isWebSocket(WebSocket);
};
var getDefaultOptions = function () { return ({
    constructor: isGlobalWebSocket() ? WebSocket : null,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1500,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4000,
    maxRetries: Infinity,
    debug: false,
}); };
var bypassProperty = function (src, dst, name) {
    Object.defineProperty(dst, name, {
        get: function () { return src[name]; },
        set: function (value) { src[name] = value; },
        enumerable: true,
        configurable: true,
    });
};
var initReconnectionDelay = function (config) {
    return (config.minReconnectionDelay + Math.random() * config.minReconnectionDelay);
};
var updateReconnectionDelay = function (config, previousDelay) {
    var newDelay = previousDelay * config.reconnectionDelayGrowFactor;
    return (newDelay > config.maxReconnectionDelay)
        ? config.maxReconnectionDelay
        : newDelay;
};
var LEVEL_0_EVENTS = ['onopen', 'onclose', 'onmessage', 'onerror'];
var reassignEventListeners = function (ws, oldWs, listeners) {
    Object.keys(listeners).forEach(function (type) {
        listeners[type].forEach(function (_a) {
            var listener = _a[0], options = _a[1];
            ws.addEventListener(type, listener, options);
        });
    });
    if (oldWs) {
        LEVEL_0_EVENTS.forEach(function (name) { ws[name] = oldWs[name]; });
    }
};
var ReconnectingWebsocket = function (url, protocols, options) {
    var _this = this;
    if (options === void 0) { options = {}; }
    var ws;
    var connectingTimeout;
    var reconnectDelay = 0;
    var retriesCount = 0;
    var shouldRetry = true;
    var listeners = {};
    // require new to construct
    if (!(this instanceof ReconnectingWebsocket)) {
        throw new TypeError("Failed to construct 'ReconnectingWebSocket': Please use the 'new' operator");
    }
    // Set config. Not using `Object.assign` because of IE11
    var config = getDefaultOptions();
    Object.keys(config)
        .filter(function (key) { return options.hasOwnProperty(key); })
        .forEach(function (key) { return config[key] = options[key]; });
    if (!isWebSocket(config.constructor)) {
        throw new TypeError('Invalid WebSocket constructor. Set `options.constructor`');
    }
    var log = config.debug ? function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i - 0] = arguments[_i];
        }
        return console.log.apply(console, ['RWS:'].concat(params));
    } : function () { };
    /**
     * Not using dispatchEvent, otherwise we must use a DOM Event object
     * Deferred because we want to handle the close event before this
     */
    var emitError = function (code, msg) { return setTimeout(function () {
        var err = new Error(msg);
        err.code = code;
        if (Array.isArray(listeners.error)) {
            listeners.error.forEach(function (_a) {
                var fn = _a[0];
                return fn(err);
            });
        }
        if (ws.onerror) {
            ws.onerror(err);
        }
    }, 0); };
    var connect = function () {
        log('connect');
        var oldWs = ws;
        ws = new config.constructor(url, protocols);
        connectingTimeout = setTimeout(function () {
            log('timeout');
            ws.close();
            emitError('ETIMEDOUT', 'Connection timeout');
        }, config.connectionTimeout);
        log('bypass properties');
        for (var key in ws) {
            // @todo move to constant
            if (['addEventListener', 'removeEventListener', 'close', 'send'].indexOf(key) < 0) {
                bypassProperty(ws, _this, key);
            }
        }
        ws.addEventListener('open', function () {
            clearTimeout(connectingTimeout);
            log('open');
            reconnectDelay = initReconnectionDelay(config);
            log('reconnectDelay:', reconnectDelay);
            retriesCount = 0;
        });
        ws.addEventListener('close', function () {
            log('close');
            retriesCount++;
            log('retries count:', retriesCount);
            if (retriesCount > config.maxRetries) {
                emitError('EHOSTDOWN', 'Too many failed connection attempts');
                return;
            }
            if (!reconnectDelay) {
                reconnectDelay = initReconnectionDelay(config);
            }
            else {
                reconnectDelay = updateReconnectionDelay(config, reconnectDelay);
            }
            log('reconnectDelay:', reconnectDelay);
            if (shouldRetry) {
                setTimeout(connect, reconnectDelay);
            }
        });
        reassignEventListeners(ws, oldWs, listeners);
    };
    log('init');
    connect();
    this.close = function (code, reason, keepClosed) {
        if (code === void 0) { code = 1000; }
        if (reason === void 0) { reason = ''; }
        if (keepClosed === void 0) { keepClosed = false; }
        shouldRetry = !keepClosed;
        ws.close(code, reason);
    };
    this.send = function (data) {
        ws.send(data);
    };
    this.addEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            if (!listeners[type].some(function (_a) {
                var l = _a[0];
                return l === listener;
            })) {
                listeners[type].push([listener, options]);
            }
        }
        else {
            listeners[type] = [[listener, options]];
        }
        ws.addEventListener(type, listener, options);
    };
    this.removeEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            listeners[type] = listeners[type].filter(function (_a) {
                var l = _a[0];
                return l !== listener;
            });
        }
        ws.removeEventListener(type, listener, options);
    };
};
module.exports = ReconnectingWebsocket;

},{}]},{},[1]);
