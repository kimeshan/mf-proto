//Dependencies and servcies for video upload, conversion, and deletion.
(function () {
	var app = angular.module('FileUploadModule',['DataSharingService']);
	app.directive('fileModel', ['$parse', function ($parse) {
	    return {
	        restrict: 'A',
	        link: function(scope, element, attrs) {
	            var model = $parse(attrs.fileModel);
	            var modelSetter = model.assign;
	            
	            element.bind('change', function(){
	                scope.$apply(function(){
	                    modelSetter(scope, element[0].files[0]);
	                });
	            });
	        }
	    };
	}]);

	app.controller('VideoCtrl', ['$http','$scope','DataService', function($http,$scope,DataService){ 		
		var videoScope = this;
		videoScope.videoCollection = [];
		videoScope.fileName = "MySportsMatch"
		videoScope.VideoFile = null;
		videoScope.fileInfo = {};
		videoScope.showVideoPlayer = false;
		videoScope.completed = false;
		videoScope.uploadedFullFileName = "Uploading video...";
		videoScope.uploadedFullFilePath = "";
		videoScope.videoDeletedError = false;
		videoScope.videoDeletedResult = false;

		//Watch when the user selects an item from the drop down menu of videos
		$scope.$watch(function () { return videoScope.videoSelected; }, function(newVal, oldVal) {
    		if (newVal!==oldVal) { 
    			videoScope.getSelectedVideoPath(); //And call the method on the newScope.
    		}
    	});

		//Watch when the user selects a file, and then trigger function to set file information
    	$scope.$watch(function () {return videoScope.VideoFile;}, function (newVal, oldVal) {
    		//Check if the selected file is really a video
    		if (oldVal!==newVal) { 
	    		if (newVal.type.split('/')[0] == 'video') videoScope.validVideo = true;
	    		else videoScope.validVideo = false;
	    		videoScope.uploadStatus = "";
	    	}
    	});

    	//If 'setVideos' is broadcasted, then get the new video collection
    	$scope.$on('setVideos', function (event, data) {
  			videoScope.getVideos();
		});

		//If 'newVideoAdded' then call getVideos and pass 'true' so that the new video will be selected by default in the drop down
		$scope.$on('newVideoAdded', function (event,data) {
			videoScope.getVideos(true);
		});

		this.removeVideo = function () {
			videoScope.videoDeletedVideoNameSave = videoScope.videoSelected;
			$http.post('/deletevideo',{"path": videoScope.selectedVideoFullPath}).success(function (response) {
					videoScope.videoDeletedResult = response.success;
					if (videoScope.videoDeletedResult) DataService.setConvertedVideos();
					else videoScope.videoDeletedError = response.error.errmsg;
				});
		};

		//This method sends a http post request with a FormData object containing the chosen file, Multer handles the file upload on the backend
	    this.uploadFile = function(){
	    	sendFileName();
	        var fd = new FormData();
	        var file = videoScope.VideoFile;
	        videoScope.originalFileInfo= file;
	        fd.append('file', file);   
	        videoScope.uploadStatus= 'Uploading video, please wait...';	        
	        $http.post("/upload", fd, {
	            transformRequest: angular.identity,
	            headers: {'Content-Type': undefined}
	        })
	        .success(function(data){
	        	videoScope.uploadStatus = data[0]+" was uploaded to "+data[1];
	        	//videoScope.fullFilePath = data[1].split('\\').slice(1).join('\\');
	        	videoScope.uploadedFullFileName = data[1].split('\\').pop();
	        	videoScope.uploadedFullFilePath = data[1];
	        	//The video has been uploaded, let's calculate the recommended settings to convert the video
	        	//Do the conversion too
	        	videoScope.getVideoMetaData(videoScope.uploadedFullFileName,videoScope.uploadedFullFilePath);
	        })
	        .error(function(){
	        	videoScope.uploadStatus = "Error uploading file, try again."
	        });
    	};

      	function sendFileName() {
    		$http.post('/fileName', {file_name:videoScope.fileName}).success(function(data) {
    			console.log(data);
    		});
    	};

    	this.getVideos = function (newVideoAdded) {
    		videoScope.videoCollection = DataService.getConvertedVideos();
    		if (newVideoAdded) videoScope.videoSelected = videoScope.videoAddedName;
    		else if (videoScope.videoCollection.length>0) videoScope.videoSelected = videoScope.videoCollection[0].video_name;
    	};

    	this.getSelectedVideoPath = function () {
    		for (var video=0;video<videoScope.videoCollection.length;video++) {
    			if (videoScope.videoCollection[video].video_name == videoScope.videoSelected) {
    				videoScope.selectedVideoFullPath = videoScope.videoCollection[video].path;
    				videoScope.selectedVideoPath = videoScope.videoCollection[video].path.split('/').slice(1).join('/');
    			}
    		}
    	};

    	//Initial video meta data variables as generic statuses, note
		this.currentResolution = this.currentAspect = this.currentFR = this.currentFormat = this.currentCodec = "Fetching data...";
		this.recResolution = this.recAspect = this.recFR = this.recFormat = this.recCodec = "Calculating..."

    	this.getVideoMetaData = function (uploadedFileName, uploadedFilePath) {
    		videoScope.uploadStatus = "Calculating best encoding and compression settings...";
			fileData = {fileName:uploadedFileName, filePath:uploadedFilePath};
			$http.post('/getVideoMetaData', fileData).success(function (metadata) {				
				//Extract video meta data from the response, and use this to set variables which will be passed when calling startConversion()	
				//Resolution
				var width = metadata.streams[0].width;
				var height = metadata.streams[0].height;
				if (width== undefined||height==undefined) videoScope.currentResolution = "unknown";
				else videoScope.currentResolution = metadata.streams[0].width+'x'+metadata.streams[0].height;
				//Aspect Ratio
				var aspect = metadata.streams[0].display_aspect_ratio;
				if (aspect == "0:1" || aspect == undefined) videoScope.currentAspect = "unknown";
				else videoScope.currentAspect = aspect;
				//Frame Rate
				var fr = metadata.streams[0].r_frame_rate.split('/');
				if (fr[0] == "0" || fr == undefined) videoScope.currentFR = 'unknown';
				else videoScope.currentFR = Math.round(fr[0]/fr[1]);
				//Format (.mp4 etc.)
				videoScope.currentFormat = fileData.filePath.split('/').pop().split('.').pop();
				//Codec
				if (metadata.streams[0].codec_name == undefined) videoScope.currentCodec = "unknown";
				videoScope.currentCodec = metadata.streams[0].codec_name;

				//Now Calculate Recommended Settings
				//Resolution: If width is less than 640 or unknown, leave resolution the same. Otherwise convert to 640x? (compute height based on default aspect)
				if (videoScope.currentResolution!='unknown' && width<640) { 
					videoScope.recResolution = videoScope.currentResolution; //convert the file using 100% resolution (aspect stays as default)
					videoScope.recResParameter = '100%'; //this variable should be passed to ffmpeg
				}
				else if (videoScope.currentResolution == 'unknown') {
					videoScope.recResolution = "Keep Original";
					videoScope.recResParameter = "640x?"
				}
				//Width is bigger than 640
				else {
					if (videoScope.currentAspect = '16:9') videoScope.recResolution = '640x480';
					else if (videoScope.currentAspect = '4:3') videoScope.recResolution = '640x360';
					else videoScope.recResolution = videoScope.recResolution = '640x480';
					videoScope.recResParameter = '640x?'; //this variable should be passed to ffmpeg
				}
				//Aspect Ratio
				if (videoScope.currentAspect!='unknown') videoScope.recAspect = videoScope.currentAspect;
				else videoScope.recAspect = "Keep Original";
				//Frame Rate
				if (videoScope.currentFR!='unknown' && videoScope.currentFR <=30) videoScope.recFR = videoScope.currentFR;
				else if (videoScope.currentFR >35) videoScope.recFR = Math.round(videoScope.currentFR/2);
				else videoScope.recFR = '30';
				//Format
				videoScope.recFormat = 'mp4';
				//Codec
				videoScope.recCodec = 'h264';
				videoScope.uploadStatus = "Best encoding and compression settings calculated!";

				//Now start the conversion
				videoScope.startConversion();
			});
		};

		//Method to add successfully converted and saved video to database
		this.addConvertedVideo = function (videoData) {
			$http.post('/addconvertedvideo', videoData).success(function (response) {
				if (response.success) { 
					videoScope.uploadStatus = videoData.video_name+" successfully added to Video Manager."
					videoScope.videoAddedName = videoData.video_name;
					DataService.setConvertedVideos(true);
				}
				else videoScope.uploadStatus = "Error adding video to Video Manager: "+response.error;
			});
		};


		//Function that triggers the video conversion using recommended settings calculated by getVideoMetaData()

		this.startConversion = function () {
			videoScope.uploadStatus = "Converting video. Please wait...";			
			conversionData = {
				fileName:videoScope.uploadedFullFileName,
				filePath:videoScope.uploadedFullFilePath,
				resolution: videoScope.recResParameter,
				framerate:videoScope.recFR
			};
			$http.post('/convert', conversionData).success(function (response) {	
			//Successful response: {"success":true, "video_name":newVideoName, "saved_path":savePath})	
				if (response.success) { 
					videoScope.uploadStatus = "Success! Converted video saved to: "+response.saved_path;
					//Add the converted video to database
					videoScope.addConvertedVideo(response);
				}
				else videoScope.uploadStatus = "Conversion failed! "+response.error;
				
			})
			.error(function (data) {
				videoScope.uploadStatus = data;
			});
		};

		this.boxClosed = function () {
			videoScope.uploadStatus = "";
			videoScope.fileName = "MySportsMatch";
			videoScope.videoDeletedVideoNameSave = "";
			videoScope.videoDeletedError = false;
			videoScope.videoDeletedResult = false;
		}

	}]);

})();