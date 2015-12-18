var app = angular.module('MainCtrl');

//This 

app.controller('AnalyzerCtrl',['$http','$scope','DataService', '$sce', function ($http, $scope, DataService, $sce) {
	//Define scope
	var projectScope = this;
	this.projectSubmittedResult = false;
	this.projectSubmittedError = false;	
	this.projectDeletedResult = false;
	this.projectDeletedError = false;
	projectScope.videoCollection = [];
	projectScope.collectionList = [];
	this.currentProject = "Loading..";
	this.projectObject = "Loading project info...";
	this.eventsObject = null;
	this.videoPath = null;
	this.showEventsButtons = false;
	this.paginatedEvents = [[]];
	this.projectTags = null;
	
	$scope.$on('projectObjectSet', function (event, data) {
		projectScope.projectObject = DataService.getProjectObject();
	});

	$scope.$on('eventsObjectSet', function (event, data) {
		projectScope.eventsObject = DataService.getEventsObject();
		projectScope.showEventsButtons = true;
		//Paginating events - max 5 per button group. Create an array of arrays of events. The inner array should contain 5 per line.
		projectScope.paginatedEvents = [[]];
		var numEvents = projectScope.eventsObject.length;
		var subArrayIndex = 0;
		for (var i=0;i<numEvents;i++) {
			projectScope.paginatedEvents[subArrayIndex].push(projectScope.eventsObject[i]);
			if ((i+1)%5==0 && i>0 && i!==numEvents-1) {
				projectScope.paginatedEvents.push([]);
				subArrayIndex++;
			}
		}
		console.log("Number of events:"+numEvents,"Paginated events 2D array:",projectScope.paginatedEvents);

	});

	$scope.$on('tagsObjectSet', function (event, data) {
		projectScope.projectTags = DataService.getTagsObject();
		//Count the number of tags added for each event
		//Create an array of objects. Each object will contain all the tags for a specific event, so object would look like {"event":event_name, "tags": arrayOfTags}

	});

	//Create addTag() method, this will add row to table "Tag" with columns: Project, Collection, Event, Lead Time, Lag Time, Video name, Video Path, Date created
	projectScope.addTag = function (event_object) {
		//Calc start and end times first
		var start_time = (projectScope.API.currentTime/1000)-event_object.lead_time;
		console.log("start time",start_time);
		if (start_time < 0) start_time = 0;
		var end_time = (projectScope.API.currentTime/1000) + event_object.lag_time;
		if (end_time > projectScope.API.totalTime) end_time = projectScope.API.totalTime;
		var newTag = {
			"tag_name":event_object.event_name+Date.now(),
			"event_name":event_object.event_name,
			"collection_name":event_object.collection_name,
			"project_name": projectScope.projectObject.name,
			"video_name": projectScope.projectObject.video,
			"video_path": projectScope.videoPath,
			"start_time": start_time,
			"end_time": end_time
		};

		$http.post('addtag', newTag).success(function (result) {
			if (result.success) { 
				DataService.setTagsObject();
				console.log("Event added successfully!");
			}
			else console.log(result.error);
		});
	};

	//Delete tag method
	projectScope.deleteTag = function (tag_name) {
		$http.post('deletetag', {"tag_name":tag_name}).success(function (deleteTagResult) {
			if (deleteTagResult.success) {
				DataService.setTagsObject();
				console.log("Tag deleted");
			}
			else console.log(deleteTagResult.err);
		});
	};

	//Initialize the video player and instantiate API object so we can use Videogular API methods
	projectScope.onPlayerReady = function(API) {
                projectScope.API = API;
            };

	$scope.$on('videoPathSet', function (event, data) {
		console.log("Video path set broadcast detected. Getting path...");
		projectScope.videoPath = DataService.getVideoPath().split('/').slice(1).join('/');
		console.log("Video path is:",projectScope.videoPath);

		//Once the video path is set, create the video configuration object that will be used by Videogular

		projectScope.videoConfig = {
			sources: [
				{src: $sce.trustAsResourceUrl(projectScope.videoPath), type: "video/mp4"}
			],
			preload: "none",
            autoHide: false,
            autoHideTime: 3000,
            autoPlay: false,
			theme: { url: "libs/videogular-themes-default/videogular.css"},
			plugins: {
				poster: "img/maxflow.png"
			}
		};

		projectScope.stop = function () {
			projectScope.API.stop();
		};
	});

	this.boxClosed = function() {
		projectScope.projectDeletedResult = false;
		projectScope.projectDeletedError = false;
		projectScope.projectSubmittedError = false;
		projectScope.projectSubmittedResult = false;
	};

}]);
