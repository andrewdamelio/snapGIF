'use strict';

var app = angular.module('app', [
    'ngCookies',
    'ngResource',
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

app.constant('FIREBASE_URL', 'YOUR_FIREBASE_URL');
app.constant('IMGUR_API_KEY', 'Client-ID YOUR API KEY');

app.controller('MainCtrl',['$scope', '$location', function($scope, $location) {
    $scope.joinRoom = function(room) {
      $location.url(room);
    };
  }]);

app.controller('AppCtrl', ['$scope', '$timeout', 'helperService', '$firebase', 'FIREBASE_URL', '$routeParams', '$q', '$location',
                 function ($scope, $timeout, helperService, $firebase, FIREBASE_URL, $routeParams, $q, $location) {

    //Compatibility
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    var re = /^[a-zA-z0-9]{1,24}$/;
    
    if (!re.test($routeParams.id)) {
      $location.url('/');
    }
    else {

      var ref = new Firebase(FIREBASE_URL+$routeParams.id);
      var localMediaStream;
      
      var userMediaQ = $q.defer();
      var fireQ = $q.defer();

      var all = $q.all([fireQ.promise, userMediaQ.promise]);

      $scope.pageLoading = true;

      $scope.camera = helperService;
      $scope.sources = [];
      $scope.constraints = {};
      $scope.gifs = $firebase(ref);
      
      $scope.gifs.$on('loaded', function() {
          if ($scope.gifs.$getIndex().length === 0) {
            $scope.gifs.$add({
                url: 'https://imgur.com/h8bGicy.gif',
                comment: 'Welcome to ' +$routeParams.id + ', I exist.',
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

      if (navigator.webkitGetUserMedia) {
        MediaStreamTrack.getSources(gotSources);
      }
      else {
        console.log('stream assumed');
        $scope.sources.push({name : 'Camera Front', id:1});
        userMediaQ.resolve();
        //This browser does not support MediaStreamTrack.
      }

      all.then(function(data) {
          $scope.pageLoading = false;
        }, function() {
          console.log('ERROR');
          $timeout(function() {
            $('.loading').removeClass('glyphicon-hdd');
            $('.loading').addClass('glyphicon-warning-sign');
            $('h3').html('Something went wrong :(<br />Please refresh your browser.');
          });

        });
    }

    function gotSources(sourceInfos) {
          $scope.sources = [];
          $scope.videoSources=0;
          for (var i = 0; i !== sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'video') {
              $scope.videoSources+=1;
              var text = sourceInfo.label || 'camera ' + ( $scope.videoSources);
              $scope.sources.push({name : text, id:sourceInfo.id});
            }
          }
          if ($scope.sources) {
            console.log('stream loaded');
            userMediaQ.resolve($scope.sources);
          }
          else {
            userMediaQ.reject();
          }

        }

    $scope.getUserMedia = function () {
          $scope.mediaON = true;

          if ( navigator.webkitGetUserMedia) {
            $scope.constraints = {};
            $scope.constraints.video = {
              optional: [{
                  sourceId: $scope.videoSource.id
                }]
              };
          }
          else {
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
          }
          else {
            video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
          }
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
          $scope.videoSource='';
        };

    $scope.recordGIF = function () {
          $scope.camera.recordingOn();
          $scope.text = $scope.comment;
          $scope.comment = '';

          var context1 = document.getElementById('canvas1').getContext('2d');
          var context2 = document.getElementById('canvas2').getContext('2d');
          var context3 = document.getElementById('canvas3').getContext('2d');
          var context4 = document.getElementById('canvas4').getContext('2d');
          var context5 = document.getElementById('canvas5').getContext('2d');

          var pieClasses = ['ten', 'twentyfive', 'fifty', 'seventyfive', 'onehumdred'];

          for (var i=0; i<pieClasses; i++) {
            $('pie').removeClass(pieClasses[i]);
          }
          
          var encoder = new GIFEncoder();

          encoder.setRepeat(0);
          encoder.setDelay(250);
          encoder.start();

          if ($scope.camera.isRecording()) {
            $('pie').addClass('ten');
            $timeout(function () {
              $('pie').addClass('twentyfive');
              var frame1 = video;
              context1.drawImage(frame1, 0, 0, 135, 100);
              encoder.addFrame(context1);
            }, 500);
            $timeout(function () {
              $('pie').addClass('fifty');
              var frame2 = video;
              context2.drawImage(frame2, 0, 0, 135, 100);
              encoder.addFrame(context2);
            }, 1000);
            $timeout(function () {
              $('pie').addClass('seventyfive');
              var frame3 = video;
              context3.drawImage(frame3, 0, 0, 135, 100);
              encoder.addFrame(context3);
            }, 1500);
            $timeout(function () {
              $('pie').addClass('onehundred');
              var frame4 = video;
              context4.drawImage(frame4, 0, 0, 135, 100);
              encoder.addFrame(context4);
            }, 2000);
            $timeout(function () {
              $scope.camera.recordingOff();
              var frame5 = video;
              context5.drawImage(frame5, 0, 0, 135, 100);
              encoder.addFrame(context5);
              encoder.finish();

              var binaryGif = encoder.stream().getData();
              var data = 'data:image/gif;base64,' + encode64(binaryGif);
              var keys = $scope.gifs.$getIndex();


              
              helperService.addGIF(keys, encode64(binaryGif)).then(function (result) {
                  var id = result.data.id;
                  var imgsrc = 'https://imgur.com/' + id + '.gif';
                      
                  if (keys.length > 30) {
                    helperService.deleteGIF($scope.gifs[keys[0]].deleteHash);
                    $scope.gifs.$remove(keys[0]);
                  }

                  $scope.gifs.$add({
                    url: imgsrc,
                    comment: $scope.text,
                    date: new Date(),
                    deleteHash : result.data.deletehash
                  });
                }, function (reason) {
                  console.log(reason);
                });
            }, 2500);
          }
        };
  }]);

app.factory('helperService', [ 'IMGUR_API_KEY', '$q',  function (IMGUR_API_KEY, $q) {
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


    var deleteGIF = function(hash) {
      if (hash) {
        $.ajax({
          url: 'https://api.imgur.com/3/image/'+hash,
          type: 'DELETE',
          success: function (result) {},
          error: function (err) {
            console.log(err);
          },
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', IMGUR_API_KEY);
          }
        });
      }
    };

    var addGIF = function(keys, data) {
      var deferredAdd = $q.defer();
      $.ajax({
        url: 'https://api.imgur.com/3/upload',
        type: 'POST',
        datatype: 'base64',
        data: data,
        success: function (result) {
          deferredAdd.resolve(result);
        },
        error: function (err) {
          console.log(err);
        },
        beforeSend: function (xhr) {
          xhr.setRequestHeader('Authorization', IMGUR_API_KEY);
        }
      });
      return deferredAdd.promise;
    };

    return {
        isRecording: isRecording,
        recordingOn: recordingOn,
        recordingOff: recordingOff,
        deleteGIF: deleteGIF,
        addGIF: addGIF

      };
  }]);

app.directive('footer', [function () {
  return {
    restrict: 'E',
    replace:  true,
    template: "<div class='footer'><github></github><div class='pull-right'><a href='http://www.html5rocks.com/en/'><img src='assets/html5.png' height='21px'/></a>&nbsp;&nbsp;<a href='https://angularjs.org/'><img src='assets/angular.png' height='21px'/></a>&nbsp;&nbsp;<a href='https://www.firebase.com/'><img src='assets/firebase.jpeg' height='21px'/></a></div></div>"
  };
}]);
        
app.directive('github', [function () {
  return {
    restrict: 'E',
    replace: true,
    template: "<a href='https://github.com/andrewdamelio/snapgif'><svg class='github' version='1.1' id='Layer_2' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='15.835px' height='20.164px' viewBox='242.137 3.418 15.835 18.164' enable-background='new 242.137 3.418 15.835 18.164' xml:space='preserve'>                <path fill='#333' stroke='#333' stroke-width='1' stroke-miterlimit='10' d='M256.255,3.943c0,0-0.904-0.292-2.967,1.107c-0.864-0.239-1.787-0.359-2.704-0.363c-0.919,0.004-1.843,0.124-2.705,0.363c-2.063-1.398-2.97-1.107-2.97-1.107c-0.587,1.486-0.217,2.585-0.106,2.858c-0.691,0.755-1.112,1.719-1.112,2.898c0,4.14,2.522,5.066,4.92,5.339c-0.309,0.271-0.587,0.747-0.686,1.445c-0.616,0.276-2.18,0.752-3.144-0.897c0,0-0.57-1.038-1.655-1.114c0,0-1.055-0.013-0.074,0.657c0,0,0.708,0.332,1.199,1.58c0,0,0.634,2.101,3.638,1.448c0.006,0.901,0.016,1.581,0.016,1.838c0,0.281,0-0.266-0.021,0.541c0.193,0.675,1.512,0.531,2.698,0.531c1.187,0,2.291,0.167,2.65-0.551c0.14-0.686,0.029-0.238,0.029-0.521c0-0.355,0.011-1.52,0.011-2.964c0-1.008-0.345-1.667-0.733-2c2.406-0.268,4.933-1.181,4.933-5.331c0-1.179-0.419-2.143-1.109-2.898C256.476,6.528,256.847,5.429,256.255,3.943z'></path></svg></a"
  };
}]);