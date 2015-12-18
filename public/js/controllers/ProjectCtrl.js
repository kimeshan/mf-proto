var app = angular.module('MainCtrl');

app.controller('ProjectCtrl',['$http','$scope','DataService', function ($http, $scope, DataService) {
	//Define scope
	var projectScope = this;
	this.projectSubmittedResult = false;
	this.projectSubmittedError = false;	
	this.projectDeletedResult = false;
	this.projectDeletedError = false;
	this.projectEventDeletedError = false;
	projectScope.projectUpdatedResult = false;
	projectScope.projectUpdatedError = false;
	this.projectObject = null;
	this.projectEventsObject = null;
	projectScope.videoCollection = [];
	projectScope.collectionList = [];

	this.newEventName;
	this.newEventLagTime = 10;
	this.newEventLeadTime = 10;
	this.newEventAddedResult = false;
	this.newEventAddedError  =false;




	//'Set' event emitted so new video list data has been set by DataSharing service
	$scope.$on('setVideos', function (event, data) {
  		projectScope.getVideos();
	});

	$scope.$on('setCollections', function (event, data) {
  		projectScope.getCollections();
	});

	$scope.$on('projectSelectedSet', function (event, data) {
		DataService.setProjectObject();
	});

	$scope.$on('projectObjectSet', function (event, data) {
		projectScope.projectObject = DataService.getProjectObject();
		//Initialize the edit project form fields
		projectScope.editedProjectName = projectScope.projectObject["name"];
		projectScope.editedDatePlayed = projectScope.projectObject.date_played;
		projectScope.editedLocalTeam = projectScope.projectObject.local_team;
		projectScope.editedOppositionTeam = projectScope.projectObject.opposition_team;
		projectScope.editedSeason = projectScope.projectObject.season;
		projectScope.editedCompetition = projectScope.projectObject.competition;
		projectScope.editedLocalTeamScore = projectScope.projectObject.local_team_score;
		projectScope.editedOppositionTeamScore = projectScope.projectObject.opposition_team_score;
	});

	$scope.$on('eventsObjectSet', function (event, data) {
		projectScope.projectEventsObject = DataService.getEventsObject();
	});

	//When the project selected changes, updated the Data Service
	$scope.$watch(function () { return projectScope.projectSelected;}, function (newVal, oldVal) {
		DataService.setProjectSelected(projectScope.projectSelected);		
		console.log("Project selected change",oldVal,newVal);
	});


	//Get project list
	this.getProjects = function (projectAdded) {
		$http.get('/getprojects').success(function (data) {
			projectScope.projectList = data;
			//Is there a project? Then allow the user to access capture mode!
			if (data.length>0) DataService.setHideCaptureMode(false); 
			else DataService.setHideCaptureMode(true);

			//Set the default project in the drop down to the newly added project (if a project was added) or select the first project in the object return from database
			if (projectAdded) projectScope.projectSelected = projectAdded;
			else if (data.length>0) projectScope.projectSelected = data[0].name;
		});
	};
	this.getProjects();

	//Method to get collections list using DataService
	this.getCollections = function () {
		projectScope.collectionList = DataService.getCollections();
		if (projectScope.collectionList.length>0) projectScope.selectedCollection= projectScope.collectionList[0].name;
	};		

	this.getVideos = function () {
		projectScope.videoCollection = DataService.getConvertedVideos();
		if (projectScope.videoCollection.length>0) projectScope.videoSelected = projectScope.videoCollection[0].video_name;
	}	

	this.addProject = function () {
		projectScope.projectSubmittedResult = projectScope.projectSubmittedError = false;
		//Copy the collection selected with all it's events
		console.log('Posting request...');
		//Before, we request the server to do anything, let's validate the project name

		for (var i=0;i<projectScope.projectList.length;i++) {
			if (projectScope.projectList[i].name == projectScope.projectName) {
				projectScope.projectSubmittedResult = false;
				projectScope.projectSubmittedError = "A project already exists with this name! Try a different name.";
				return 0;
			}
		}

		//First copy the collection
		$http.post('/copycollectiontoproject', {"collection_name":projectScope.selectedCollection}).success(function (response) {
			console.log("Done copying project collection", response);
			var projectData = {"projectName":projectScope.projectName,								
					"datePlayed": projectScope.datePlayed,
					"localTeam":projectScope.localTeam,								
					"oppositionTeam":projectScope.oppositionTeam,
					"season":projectScope.season,
					"competition":projectScope.competition,
					"localTeamScore":projectScope.localTeamScore,
					"oppositionTeamScore":projectScope.oppositionTeamScore,
					"collection":response.project_collection,
					"video":projectScope.videoSelected
				};		

			console.log
			$http.post('/addproject', projectData).success(function (response) {
				projectScope.projectSubmittedResult = response.success;
				//Let's update our project list!
				if (projectScope.projectSubmittedResult) projectScope.getProjects(projectData.projectName);
				else {
					if (response.error.code=11000) projectScope.projectSubmittedError = "A project already exists with this name! Try a different name."
					else projectScope.projectSubmittedError = response.error.errmsg;
				} 
			});

		});

		console.log('done adding project');
	};

	this.updateProject = function () {
		var newProjectDetails = {
		 "project_name":projectScope.editedProjectName,
		 "date_played": projectScope.editedDatePlayed,
		 "local_team":projectScope.editedLocalTeam,
		 "opposition_team":projectScope.editedOppositionTeam,
		 "season":projectScope.editedSeason,
		 "competition":projectScope.editedCompetition,
		 "local_team_score":projectScope.editedLocalTeamScore,
		 "opposition_team_score":projectScope.editedOppositionTeamScore,
		 "video":projectScope.videoSelected			
		};
		console.log("Sending new details...", newProjectDetails);
		var projectUpdatedReturnedResult = DataService.updateProject(newProjectDetails, function (result, error) {
			console.log(result,error);
			projectScope.projectUpdatedResult =  result;
			projectScope.projectUpdatedError = error;
			console.log("Updated project!");
		});
		
	};

	this.deleteProject = function () {
		projectScope.projectDeletedProjectNameSave = projectScope.projectSelected;
		$http.post('/deleteproject', {"projectName":projectScope.projectSelected}).success(function (response) {
			projectScope.projectDeletedResult = response.success;
			if (projectScope.projectDeletedResult) projectScope.getProjects();
			else { projectScope.projectDeletedError = response.error.errmsg;
				console.log(response);
			}
		});
	};

	//Delete event from project collection
	this.deleteEventNow = function (event_name) {
		var projectObject = DataService.getProjectObject();
		console.log('collection name',projectObject.collection_name);
		$http.post('/deleteevent', {"collectionName":projectObject.collection_name,"eventName":event_name}).success(function (response) {
			if (response.success) DataService.setEventsObject(projectObject.collection_name);
			else projectScope.projectEventDeletedError = response.error.errmsg;
		});
	}




	this.boxClosed = function() {
		projectScope.projectDeletedResult = false;
		projectScope.projectDeletedError = false;
		projectScope.projectSubmittedError = false;
		projectScope.projectSubmittedResult = false;
		projectScope.projectUpdatedResult = false;
		projectScope.projectUpdatedError = false;
		projectScope.projectEventDeletedError = false;
	}

}]);