'use strict';

var app = angular.module('app', [
    'ngRoute',
    'firebase'
  ]);

app.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainCtrl'
    })
    .when('/:id', {
      templateUrl: 'views/room.html',
      controller: 'AppCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });
});

app.constant('FIREBASE_URL', 'https://cats.firebaseio.com/');
app.constant('IMGUR_API_KEY', 'Client-ID a022759b7efead8');

app.controller('MainCtrl', ['$scope', '$location', function ($scope, $location) {
  $scope.joinRoom = function (room) {
    $location.url(room);
  };
}]);

app.controller('AppCtrl', ['$scope', '$timeout', 'helperService', 'Firebase', '$routeParams', '$q', '$location', function ($scope, $timeout, helperService, Firebase, $routeParams, $q, $location) {

  //Compatibility
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

  if (!$('html').hasClass('getusermedia')) {
    $('.controls').html('<center>Sorry. Your browser doesn\'t support WebRTC - getUserMedia<br />No snaps for you :(<br /></center>');
  }

  var re = /^[a-zA-z0-9]{1,24}$/;
  var roomName = $routeParams.id;
  if (!re.test(roomName)) {
    $location.url('/');
  } else {
    var localMediaStream;
    var userMediaQ = $q.defer();
    var fireQ = $q.defer();
    var all = $q.all([fireQ.promise, userMediaQ.promise]);
    var snd = new Audio('assets/drop.wav');

    $scope.audioFlag = false;
    $scope.pageLoading = true;
    $scope.camera = helperService;
    $scope.sources = [];
    $scope.constraints = {};
    $scope.gifs = Firebase.getFirebaseObj(roomName);
    $scope.counter = 0;

    // main visibility API function 
    // check if current tab is active or not
    $scope.vis = (function () {
      var stateKey, eventKey, keys = {
        hidden: 'visibilitychange',
        webkitHidden: 'webkitvisibilitychange',
        mozHidden: 'mozvisibilitychange',
        msHidden: 'msvisibilitychange'
      };
      for (stateKey in keys) {
        if (stateKey in document) {
          eventKey = keys[stateKey];
          break;
        }
      }
      return function (c) {
        if (c) {
          document.addEventListener(eventKey, c);
        }
        return !document[stateKey];
      };
    }());


    $scope.changeFavicon = function (src) {
      var link = document.createElement('link');
      var oldLink = document.getElementById('dynamic-favicon');
      link.id = 'dynamic-favicon';
      link.rel = 'shortcut icon';
      link.href = src;
      if (oldLink) {
        document.getElementsByTagName('head')[0].removeChild(oldLink);
      }
      document.getElementsByTagName('head')[0].appendChild(link);
    };

    $scope.vis(function () {
      if ($scope.vis()) {
        // before the tab gains focus again
        $timeout(function () {
          $scope.counter = 0;
          $scope.changeFavicon('http://snapgif.com/favicon.ico');
        }, 300);
      }
    });

    $scope.gifs.$on('loaded', function () {
      if ($scope.gifs.$getIndex().length === 0) {
        $scope.gifs.$add({
          url: 'https://imgur.com/h8bGicy.gif',
          comment: 'Welcome to /' + roomName + '.',
          date: new Date()
        });
      }
      console.log('firebase loaded');
      fireQ.resolve();
    });

    if ($scope.gifs.$getIndex().length > 0) {
      console.log('firebase loaded from cache');
      fireQ.resolve();
    }

    $scope.$watch('gifs.$getIndex().length', function (newValue, oldValue) {
      function changeFavicon() {
        // check if current tab is active or not
        if (!$scope.vis() && !$scope.pageLoading) {
          $scope.counter += 1;
          if ($scope.counter >= 4) {
            $scope.counter = 4;
          }
          var link = '/assets/favicon-' + $scope.counter + '.ico';
          $scope.changeFavicon('http://snapgif.com' + link);
        }
      }
      if (newValue !== oldValue) {
        if ($scope.gifs.$getIndex().length >= 30) {
          if (!$scope.audioFlag) {
            changeFavicon();
            $scope.audioFlag = true;
            snd.play();
            snd.currentTime = 0;
          } else {
            $scope.audioFlag = false;
          }
        } else {
          changeFavicon();
          snd.play();
          snd.currentTime = 0;
        }
      }
    });

    if (navigator.webkitGetUserMedia) {
      MediaStreamTrack.getSources(gotSources);
    } else {
      //This browser does not support MediaStreamTrack.
      console.log('stream assumed');
      $scope.sources.push({name : 'Camera Front', id : 1});
      userMediaQ.resolve();
    }

    all.then(function (data) {
      $scope.pageLoading = false;
    }, function () {
      console.log('ERROR');
      $timeout(function () {
        $('.loading').removeClass('glyphicon-hdd');
        $('.loading').addClass('glyphicon-warning-sign');
        $('h3').html('Something went wrong :(<br />Please refresh your browser.');
      });
    });
  }

  function gotSources(sourceInfos) {
    var sourceInfo;
    var text;
    var i;

    $scope.sources = [];
    $scope.videoSources = 0;
    for (i = 0; i !== sourceInfos.length; ++i) {
      sourceInfo = sourceInfos[i];
      if (sourceInfo.kind === 'video') {
        $scope.videoSources += 1;
        text = sourceInfo.label || 'camera ' + ($scope.videoSources);
        $scope.sources.push({name : text, id : sourceInfo.id});
      }
    }
    if ($scope.sources) {
      console.log('stream loaded');
      userMediaQ.resolve($scope.sources);
    } else {
      userMediaQ.reject();
    }
  }

  $scope.getUserMedia = function () {
    $scope.mediaON = true;
    if (navigator.webkitGetUserMedia) {
      $scope.constraints = {};
      $scope.constraints.video = {
        optional: [{
          sourceId: $scope.videoSource.id
        }]
      };
    } else {
      //This browser does not support MediaStreamTrack.
      $scope.constraints = {};
      $scope.constraints = {
        video: true
      };
    }
    navigator.getUserMedia($scope.constraints, successCallback, errorCallback);
  };

  function successCallback(stream) {
    if (video.mozSrcObject !== undefined) {
      video.mozSrcObject = stream;
    } else {
      video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
    }
    video.autoplay = true;
    localMediaStream = stream;

  }

  function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
  }

  $scope.keypress = function (e) {
    if (e.keyCode !== 13) {
      return;
    }
    $scope.recordGIF();
  };

  $scope.stopMedia = function () {
    $scope.mediaON = false;
    if (localMediaStream) {
      localMediaStream.stop();
    }
    $scope.videoSource = '';
  };

  $scope.recordGIF = function () {
    if (localMediaStream) {
      $scope.text = $scope.comment;
      $scope.comment = '';
      $scope.camera.recordingOn();
      var keys = $scope.gifs.$getIndex();

      helperService.createGIF().then(function (binaryGif) {
        $scope.camera.recordingOff();
        $scope.stopMedia();
        $scope.audioSiwtch = true;

        helperService.addGIF(encode64(binaryGif)).then(function (result) {
          var id = result.data.id;
          var imgsrc = 'https://imgur.com/' + id + '.gif';

          $scope.gifs.$add({
            url: imgsrc,
            comment: $scope.text,
            date: new Date(),
            deleteHash : result.data.deletehash
          });


          $timeout(function () {
            if (keys.length >= 30) {
              helperService.deleteGIF($scope.gifs[keys[0]].deleteHash);
              $scope.gifs.$remove(keys[0]);
            }
          }, 2000);
        }, function (reason) {
          console.log(reason);
        });
      }, function (reason) {
        console.log(reason);
      });
    } else {
      alert('Camera stream not detected. \nPlease refresh your browser and allow use of your camera.');
    }
  };
}]);

app.factory('Firebase', ['$firebase', 'FIREBASE_URL', function ($firebase, FIREBASE_URL) {
  var ref;

  var getFirebaseObj = function (ref) {
    ref = new Firebase(FIREBASE_URL + ref);
    return $firebase(ref);
  };

  return {
    getFirebaseObj : getFirebaseObj
  };
}]);


app.factory('helperService', [ 'IMGUR_API_KEY', '$q', '$timeout', '$http',  function (IMGUR_API_KEY, $q, $timeout, $http) {
  var recording = false;

  var isRecording = function () {
    return recording;
  };

  var recordingOn = function () {
    recording = true;
  };

  var recordingOff = function () {
    recording = false;
  };

  var deleteGIF = function (hash) {
    if (hash) {
      $http({
        url : 'https://api.imgur.com/3/image/' + hash,
        method : 'DELETE',
        headers:  {
          Authorization: IMGUR_API_KEY
        }
      })
        .success(function () {console.log(hash + ' DELETED'); })
        .error(function (reason) { console.log(reason); });
    }
  };

  var addGIF = function (data) {
    var deferredAdd = $q.defer();
    $http({
      url : 'https://api.imgur.com/3/upload',
      method : 'POST',
      data : data,
      headers:  {
        Authorization: IMGUR_API_KEY
      }
    }).success(deferredAdd.resolve)
      .error(function (reason) {
        if (reason.status === 429) {
          alert('Sorry - you exceeded your upload limit. Please note a single IP address is able to upload 50 images an hour and 200 images a day.');
        } else if (reason.status === 0) {
          alert('Internet connection disconnected. \nPlease check your internet connection and refresh the page.');
        }
        deferredAdd.reject(reason);
      });
    return deferredAdd.promise;
  };

  var createGIF = function () {
    var deferredCreate = $q.defer();
    var pieClasses = ['ten', 'ten', 'twentyfive', 'twentyfive', 'fifty', 'fifty', 'seventyfive', 'seventyfive', 'onehundred', 'onehundred'];
    var context = document.getElementById('canvas').getContext('2d');
    var encoder;
    var i;
    var timer = 0;
    for (i = 0; i < pieClasses; i++) {
      $('pie').removeClass(pieClasses[i]);
    }

    var gif = new GIF({
      workers: 2,
      quality: 10,
      width: 135,
      height: 100,
      workerScript: 'scripts/gif.worker.js'
    });

    function draw() {
      context.drawImage(video, 0, 0, 135, 100);
      gif.addFrame(context, {copy: true, delay: 125});
    }

    for (i = 0; i < 10; i++) {
      (function (i, timer) {
        $timeout(function () {
          $('pie').addClass(pieClasses[i]);
          draw();
        }, timer);
      })(i, timer);
      timer = timer + 250;
    }

    $timeout(function () {
      var binaryGif;
      var data;
      draw();
      gif.on('finished', function (blob, data) {
        deferredCreate.resolve(buildDataURL(data));
      });

      gif.render();
    }, 2500);
    return deferredCreate.promise;
  };

  return {
    isRecording : isRecording,
    recordingOn : recordingOn,
    recordingOff : recordingOff,
    deleteGIF : deleteGIF,
    addGIF : addGIF,
    createGIF : createGIF
  };
}]);

app.directive('footer', [function () {
  return {
    restrict: 'E',
    replace:  true,
    template: "<div class='footer'><github></github><div class='pull-right'><a href='http://www.html5rocks.com/en/'><img src='assets/html5.png' height='21px'/></a>&nbsp;&nbsp;<a href='https://angularjs.org/'><img src='assets/angular.png' height='21px'/></a>&nbsp;&nbsp;<a href='https://www.firebase.com/'><img src='assets/firebase.jpeg' height='21px'/></a><br /><font size='1px'><a class='pull-right' href='terms.html'>terms of use</a></font></div></div>"
  };
}]);

app.directive('github', [function () {
  return {
    restrict: 'E',
    replace: true,
    template: "<a href='https://github.com/andrewdamelio/snapgif'><svg class='github' version='1.1' id='Layer_2' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='15.835px' height='20.164px' viewBox='242.137 3.418 15.835 18.164' enable-background='new 242.137 3.418 15.835 18.164' xml:space='preserve'><path fill='#333' stroke='#333' stroke-width='1' stroke-miterlimit='10' d='M256.255,3.943c0,0-0.904-0.292-2.967,1.107c-0.864-0.239-1.787-0.359-2.704-0.363c-0.919,0.004-1.843,0.124-2.705,0.363c-2.063-1.398-2.97-1.107-2.97-1.107c-0.587,1.486-0.217,2.585-0.106,2.858c-0.691,0.755-1.112,1.719-1.112,2.898c0,4.14,2.522,5.066,4.92,5.339c-0.309,0.271-0.587,0.747-0.686,1.445c-0.616,0.276-2.18,0.752-3.144-0.897c0,0-0.57-1.038-1.655-1.114c0,0-1.055-0.013-0.074,0.657c0,0,0.708,0.332,1.199,1.58c0,0,0.634,2.101,3.638,1.448c0.006,0.901,0.016,1.581,0.016,1.838c0,0.281,0-0.266-0.021,0.541c0.193,0.675,1.512,0.531,2.698,0.531c1.187,0,2.291,0.167,2.65-0.551c0.14-0.686,0.029-0.238,0.029-0.521c0-0.355,0.011-1.52,0.011-2.964c0-1.008-0.345-1.667-0.733-2c2.406-0.268,4.933-1.181,4.933-5.331c0-1.179-0.419-2.143-1.109-2.898C256.476,6.528,256.847,5.429,256.255,3.943z'></path></svg></a"
  };
}]);
