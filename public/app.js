var buttonAction = function () {
  var key = this.parentNode.parentNode.id;
  var request = new XMLHttpRequest();
  request.open('GET', '/click/' + key, true);
  request.responseType = 'json';
  request.send();
  playSound(audioBuffers[key]);
};

var playSound = function (buffer) {
  var source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

var updateValues = function (values) {
  console.log(values);
  values.forEach(function (value) {
    document.getElementById(value.name).getElementsByClassName('count')[0].innerHTML = value.count;
  });
  return;
};

var ws = new ReconnectingWebSocket('ws://' + window.location.host + '/ws/values');
ws.onmessage = function (message) {
  var values = JSON.parse(message.data);
  updateValues(values);
};

var audioContext;
var audioBufferLoader;
var audioBuffers = {};

window.onload = function () {
  var table = document.getElementById('buttons');
  var request = new XMLHttpRequest();
  request.open('GET', '/values', true);
  request.responseType = 'json';
  request.onload = function() {
    var audioFiles = [];

    request.response.forEach(function(element) {
      audioFiles.push('/' + element.name + '.mp3');

      var row = document.createElement('tr');
      row.id = element.name;

      var td1 = document.createElement('td');
      var img = document.createElement('img');
      img.setAttribute('src', '/' + element.name + '.png');
      img.className = 'incr_button';
      img.addEventListener('click', buttonAction, true);
      td1.appendChild(img);

      var td2 = document.createElement('td');
      td2.innerHTML = '<span class="count">' + element.count + '</span> ' + element.label;

      row.appendChild(td1);
      row.appendChild(td2);
      table.appendChild(row);
    });

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    audioBufferLoader = new BufferLoader(audioContext, audioFiles, function (bufferList) {
      for (var i = 0, ii = audioFiles.length; i < ii; i++) {
        // audioFiles と bufferList の順番が対応してる保証はなさそうなのでバグりそう
        audioBuffers[audioFiles[i].replace(/(\/|\.mp3)/g, '')] = bufferList[i];
      }
    });
    audioBufferLoader.load();
  };

  request.send();
};
