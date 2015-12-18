//Server to share data between controllers
(function () { 
var app = angular.module('DataSharingService',[]);

app.service('DataService',['$http','$rootScope', function ($http,$rootScope) {
	var serviceScope = this;
	this.fileNameSelected = null;
	this.filePath = null;
	this.collections = [];
	this.videoCollection = [];
	this.projectSelected = null;
	this.projectObject = null;
	this.eventsObject = null;
	this.video_path = null;
	this.projectTags = null;
	this.hideCaptureModeNoProject = true;
	this.tabScope = null;

	this.setTabScope = function (scope) {
		serviceScope.tabScope = scope;
	}

	this.getTabScope = function () {
		return serviceScope.tabScope;
	}

	this.updateProject = function (details, callback) {
		$http.post('/updateproject', details).success( function (response) {
			if (response.success) callback(true,false);
			else return callback(false, response.error);
		});
	};

	this.setHideCaptureMode  = function (bool) {
		serviceScope.hideCaptureModeNoProject = bool;
	}

	//Methods to get and set file name and path from video upload
	this.setFileNameSelected = function (value) {
		serviceScope.fileNameSelected=value;
	};
	this.getFileNameSelected = function () {
		return serviceScope.fileNameSelected;
	};
	
	this.setFilePath = function (value) {
		serviceScope.filePath=value;
	};
	this.getFilePath = function () {
		return serviceScope.filePath;
	};

	//Methods for getting and setting (updating) collections of events and videos
	this.setCollections = function () {
		$http.get('/getcollections').success(function (collections) {
			serviceScope.collections= collections;
			$rootScope.$broadcast('setCollections');
		});
		
	};

	this.setConvertedVideos = function (newVideoAdded) {
		$http.get('/getconvertedvideos').success(function (videoCollection) {
			serviceScope.videoCollection = videoCollection;
			if (newVideoAdded) $rootScope.$broadcast('newVideoAdded');
			else $rootScope.$broadcast("setVideos");
		});			
	};

	this.getConvertedVideos = function () {
		return serviceScope.videoCollection;		
	};

	this.getCollections = function () {
		return serviceScope.collections;		
	};



	//Methods to get current project and set the current project
	this.getProjectSelected = function () {
		return serviceScope.projectSelected;
	};

	this.setProjectSelected = function (project) {
		serviceScope.projectSelected = project;
		$rootScope.$broadcast('projectSelectedSet');
		console.log("Project selected is now: "+serviceScope.projectSelected);
	};

	//Events CRUD methods
	this.setEventsObject = function (collection_name) {
		console.log('received collection name!', collection_name);
		serviceScope.tabScope.getEvents(collection_name,null,null, function (events) {
			serviceScope.eventsObject = events;
			$rootScope.$broadcast('eventsObjectSet');
		});
	};

	this.getEventsObject = function () {
		return serviceScope.eventsObject;
	}


	this.setVideoPath = function (video_name) {
		console.log("Date sharing service is getting video path for "+video_name);
		$http.post('/getvideopath', {"video_name":video_name}).success(function (video) {
			console.log("Response from server after sending getvideopath request..."+video);
			console.log(video);
			serviceScope.video_path = video.path;
			$rootScope.$broadcast('videoPathSet');
		});		
	};

	this.getVideoPath = function () {
		return serviceScope.video_path;
	};


	this.setProjectObject = function () {
		console.log("Setting project object...sending name "+serviceScope.projectSelected);
		$http.post('/getcurrentproject',{"project_name":serviceScope.projectSelected}).success(function (project_object) {
			serviceScope.projectObject = project_object[0];	
			$rootScope.$broadcast('projectObjectSet');
			console.log('before',serviceScope.projectObject);
			//set events object now
			serviceScope.setEventsObject(serviceScope.projectObject.collection_name);
			//get the video path and set it
			console.log(serviceScope.projectObject);
			serviceScope.setVideoPath(serviceScope.projectObject.video);
			//also set the tags object
			serviceScope.setTagsObject();

		});		
	}

	this.getProjectObject = function () {
		return serviceScope.projectObject;
	};

	this.setTagsObject = function () {
		//Create response in backend first!
		$http.post('/getprojecttags', {"project_name":serviceScope.projectSelected}).success(function (getTagsResult) {
			if (getTagsResult.success) { 
				serviceScope.projectTags = getTagsResult.tagsObject;
				$rootScope.$broadcast('tagsObjectSet');
			}
			else console.log(getTagsResult.err);

		});
	};

	this.getTagsObject = function () {
		return serviceScope.projectTags;
	}

}]);

})();