(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ReconnectingWebSocket = require('reconnecting-websocket');

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

// an ad-hoc function to show/hide the trailing '.' of 'ITF.'
function updateWebSocketStatusIndicator(status) {
  var $itf = document.querySelector('tr.counter[data-counter-slug="imagine-the-future"] .counter-name');

  if ($itf) {
    if (status) {
      $itf.innerText = 'IMAGINE THE FUTURE.';
    } else {
      $itf.innerText = 'IMAGINE THE FUTURE';
    }
  }
}

var Counter = function () {
  function Counter(slug, node) {
    _classCallCheck(this, Counter);

    this.slug = slug;
    this.$node = node;
  }

  _createClass(Counter, [{
    key: 'onClick',
    value: function onClick() {
      command.incr(this.slug);
    }
  }, {
    key: 'update',
    value: function update(value) {
      this.$node.querySelector('.count').innerText = value;
    }
  }]);

  return Counter;
}();

var Command = function () {
  function Command() {
    var _this = this;

    _classCallCheck(this, Command);

    this.ws = new ReconnectingWebSocket('ws://' + window.location.host + '/api/websocket');
    this.ws.addEventListener('open', function () {
      updateWebSocketStatusIndicator(true);
    });
    this.ws.addEventListener('close', function () {
      updateWebSocketStatusIndicator(false);
    });
    this.ws.onmessage = function (e) {
      var signal = JSON.parse(e.data);
      _this.onSignal(signal);
    };
  }

  _createClass(Command, [{
    key: 'incr',
    value: function incr(slug) {
      this.ws.send(JSON.stringify({
        type: 'incr',
        data: {
          slug: slug
        }
      }));
    }
  }, {
    key: 'onSignal',
    value: function onSignal(signal) {
      switch (signal.type) {
        case 'update':
          var counter = counters[signal.data.slug];
          if (counter) {
            counter.update(signal.data.value);
          }
      }
    }
  }]);

  return Command;
}();

// globals


var counters = {};
var command = new Command();

window.addEventListener('DOMContentLoaded', function () {
  var $counters = document.querySelectorAll(".counter");

  var _loop = function _loop(i) {
    var $counter = $counters[i];
    var slug = $counter.dataset.counterSlug;

    var counter = new Counter(slug, $counter);
    counters[slug] = counter;

    $counter.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      counter.onClick();
    });
  };

  for (var i = 0; i < $counters.length; i++) {
    _loop(i);
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
