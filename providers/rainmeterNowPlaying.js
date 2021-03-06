const { ipcMain } = require("electron");
const WebSocket = require("ws");
const url = "ws://127.0.0.1:8974";
var ws, reconnect, volumePercent, seekPosition, _isStarted;

function isStarted() {
  return _isStarted;
}

function _setIsStarted(value) {
  _isStarted = value;
}

function start() {
  ws = new WebSocket(url, {
    perMessageDeflate: false
  });

  ws.on("open", function open() {
    _setIsStarted(true);
  });

  ws.on("message", function incoming(data) {
    var versionNumber = data.toLowerCase().split(":");
    if (versionNumber[0].includes("version")) {
      //Check that version number is the same major version
    }
    try {
      doAction(data);
    } catch (e) {
      ws.send("Error:" + e);
      throw e;
    }
  });

  ws.on("error", function error(_) {
    console.log("Failed to connect rainmeter WS");
  });

  ws.on("close", () => {
    reconnect = setTimeout(() => {
      if (isStarted()) {
        start();
      }
    }, 5000);
  });
}

function stop() {
  _setIsStarted(false);
  ws.terminate();
}

function setActivity(data) {
  if (isStarted()) {
    volumePercent = data.player.volumePercent;
    seekPosition = data.player.seekbarCurrentPosition;

    ws.send("COVER:" + data.track.cover);
    ws.send("TITLE:" + data.track.title);
    ws.send("ARTIST:" + data.track.author);
    //ws.send("ALBUM:" + 'Album');
    ws.send("STATE:" + data.player.isPaused ? 2 : 1);
    ws.send("DURATION:" + data.track.durationHuman);
    ws.send("POSITION:" + data.player.seekbarCurrentPositionHuman);
    ws.send("VOLUME:" + volumePercent);
  }
}

function doAction(data) {
  var dataSplit = data.split(" ");
  var action = dataSplit.shift();
  var actionParams = dataSplit;

  if (actionParams.length && action == "SetPosition") {
    var seekValuePercent = parseFloat(actionParams[1].split(":")[0]);
    if (seekValuePercent != 0) {
      action = "SetPositionSeekbar";
      actionParams[0] = actionParams[0].split(":")[0] / 100000;
    }
  }

  switch (action) {
    case "previous":
      ipcMain.emit("media-previous-track", true);
      break;

    case "PlayPause":
      ipcMain.emit("media-play-pause", true);
      break;

    case "next":
      ipcMain.emit("media-next-track", true);
      break;

    case "togglethumbsup":
      ipcMain.emit("media-up-vote", true);
      break;

    case "togglethumbsdown":
      ipcMain.emit("media-down-vote", true);
      break;

    case "SetVolume":
      if (actionParams[0] >= volumePercent) {
        ipcMain.emit("media-volume-up", true);
      } else {
        ipcMain.emit("media-volume-down", true);
      }

      break;

    case "SetPosition":
      var currentPosition = actionParams[0].split(":")[0];
      if (currentPosition >= seekPosition) {
        ipcMain.emit("media-forward-X-seconds", true);
      } else {
        ipcMain.emit("media-rewind-X-seconds", true);
      }
      break;

    case "SetPositionSeekbar":
      ipcMain.emit("media-change-seekbar", actionParams[0]);
      break;
  }
}

module.exports = {
  isStarted: isStarted,
  start: start,
  stop: stop,
  setActivity: setActivity
};
