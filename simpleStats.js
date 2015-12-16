// Original implementation by:
// Muaz Khan     - www.MuazKhan.com
// MIT License   - www.WebRTC-Experiment.com/licence
// Source Code   - https://github.com/muaz-khan/getStats
// an abstraction layer runs top over RTCPeerConnection.getStats API
// http://dev.w3.org/2011/webrtc/editor/webrtc.html#dom-peerconnection-getstats
//
// Essentially 3 steps:
//  - prepare stats as the come from navigator for packageStats
//  - packageStats wraps them in a "simple"
//  - return the "simple" stats (via callback)
//
(function () {
  function simpleStats(callback) {

    var pc = this,
        mediaTrack;

    var stats = {
      timestamp: 0,
      results: [],
      channels: [],
      audio: {},
      video: {}
    };

    if (navigator.mozGetUserMedia) {
      videoTrack = pc.getLocalStreams()[0].getVideoTracks()[0];
      pc.getStats(videoTrack, prepareFirefoxStats, failureCallback);

      audioTrack = pc.getLocalStreams()[0].getAudioTracks()[0];
      pc.getStats(audioTrack, prepareFirefoxStats, failureCallback);
    } else if (navigator.webkitGetUserMedia) {
      pc.getStats(prepareChromeStats);
    } else {
      console.log('Browser does not support WebRTC.');
    }

    function prepareChromeStats(nativeStats) {
      nativeStats.result().forEach(function (RTCStatReport) {
        var result = {};
        RTCStatReport.names().forEach(function (name) {
          result[name] = RTCStatReport.stat(name);
        });
        result.id = RTCStatReport.id;
        result.type = RTCStatReport.type;
        result.timestamp = RTCStatReport.timestamp;

        stats.results.push(result);
      });

      packageStats();
    }

    function prepareFirefoxStats(nativeStats) {
      nativeStats.forEach(function (RTCStatReport) {
        stats.results.push(RTCStatReport);
      });

      packageStats();
    }

    function failureCallback(e) {
      console.error(e);
    }

    /*
     * stats.channels obj will contain information about the channels
     * when both clients use webrtc -> one channel
     * when client does not multiplex -> four channels two for each audio and video
     * stats.audio most interesting (for my purposes) stats for audio
     * stats.video most interesting (for my purposes) stats for video
     */
    function packageStats() {
      var idx,
          res;

      for (idx = 0; idx < stats.results.length; idx++) {
        res = stats.results[idx];

        // seems like inactive timestamps are init with unix epoch
        if (new Date(res.timestamp).getTime() != 0 && stats.timestamp == 0) {
          stats.timestamp = res.timestamp;
        }

        // Channels - Chrome
        if (res.type == 'googCandidatePair' && res.googActiveConnection == 'true') {
          stats.channels.push({
            id: res.googChannelId,
            local: {
              candidateType: res.googLocalCandidateType,
              ipAddress: res.googLocalAddress
            },
            remote: {
              candidateType: res.googRemoteCandidateType,
              ipAddress: res.googRemoteAddress
            },
            transport: res.googTransportType
          });
        }

        // Channels - Firefox
        if (res.type == 'candidatepair' &&
            res.state == 'succeeded'){
          // not really helpful?
        }

        // Audio - Chrome
        if (res.googCodecName == 'opus' && res.bytesSent) {
          stats.audio = merge(stats.audio, {
            inputLevel: res.audioInputLevel,
            packetsLost: res.packetsLost,
            rtt: res.googRtt,
            packetsSent: res.packetsSent,
            bytesSent: res.bytesSent
          });
        }

        // Audio - Firefox
        if (res.mediaType == 'audio' && res.bytesSent) {
          if (res.isRemote) {
            stats.audio = merge(stats.audio, {
              inputLevel: '?',
              rtt: res.mozRtt,
              packetsLost: res.packetsLost
            });
          } else {
            stats.audio = merge(stats.audio, {
              packetsSent: res.packetsSent,
              bytesSent: res.bytesSent
            });
          }
        }

        // Video - Chrome
        if (res.googCodecName == 'VP8' && res.bytesSent) {
          stats.video = merge(stats.video, {
            frameHeightInput: res.googFrameHeightInput,
            frameWidthInput: res.googFrameWidthInput,
            rtt: res.googRtt,
            packetsLost: res.packetsLost,
            packetsSent: res.packetsSent,
            frameRateInput: res.googFrameRateInput,
            frameRateSent: res.googFrameRateSent,
            frameHeightSent: res.googFrameHeightSent,
            frameWidthSent: res.googFrameWidthSent,
            bytesSent: res.bytesSent
          });
        }

        // Video - Firefox
        if (res.mediaType == 'video' && res.bytesSent) {
          if (res.isRemote) {
            stats.video = merge(stats.video, {
              rtt: res.mozRtt,
              packetsLost: res.packetsLost
            });
          } else {
            var localVideo = document.getElementById('localVideo');

            stats.video = merge(stats.video, {
              frameHeightInput: localVideo.videoHeight,
              frameWidthInput: localVideo.videoWidth,
              packetsSent: res.packetsSent,
              frameRateInput: Math.round(res.framerateMean),
              frameRateSent: '?',
              frameHeightSent: '?',
              frameWidthSent: '?',
              bytesSent: res.bytesSent
            });
          }
        }
      }

      // Because Firefox gets stats per mediaTrack we need to 'wait'
      // for both audio and video stats before invoking the callback.
      // There might be a better way to do this though.
      if (stats.audio.bytesSent && stats.video.bytesSent) {
        callback(stats);
      }
    }

    /*
     * Thanks to @Moak
     * http://stackoverflow.com/a/171256/980524
     */
    function merge(obj1, obj2) {
      var obj3 = {};
      for (var prop in obj1) { obj3[prop] = obj1[prop]; }
      for (var prop in obj2) { obj3[prop] = obj2[prop]; }
      return obj3;
    }
  }

  RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  RTCPeerConnection.prototype.getSimpleStats = simpleStats;
})();
