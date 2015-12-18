// public/js/controllers/MainCtrl.js
//Instantiate angular module with dependencies including DataSharingService and Videogular dependencies
var app= angular.module('MainCtrl', ['DataSharingService',
            "ngSanitize",
            "com.2fdevs.videogular",
            "com.2fdevs.videogular.plugins.controls",
            "com.2fdevs.videogular.plugins.overlayplay",
            "com.2fdevs.videogular.plugins.poster"
    ]);

(function() {	
	var tabScope;
	//This controller will contain objects that can be accessed across all tabs as it is one level up from the indivudal tab controllers such as ProjectCtrl etc.
    app.controller('TabCtrl' ,['$http','$scope','$controller','DataService', function($http,$scope,$controller, DataService) {

	    this.currentTab = 1;
        this.hideCaptureMode = false;
	    tabScope = this;
        DataService.setTabScope(tabScope);

        //Variables for collection and events modals
        this.collectionSubmittedResult = false;
        this.collectionSubmittedError = false;
        this.collectionDeletedResult = false;
        this.collectionDeletedError = false;
        this.eventDeletedResult = this.eventDeletedError = false;
        this.statusEventAdded = false;
        this.errorEventAdded = false;
        this.eventUpdatedError = false;
        this.eventUpdatedResult = false;   
        this.collectionNameSaved = "";
        this.lagTime = this.leadTime = 10;

        tabScope.projectObject = null;
        tabScope.eventsObject = null;

        //Keep track of the current project selected
        $scope.$on('projectObjectSet', function (event, data) {
            tabScope.projectObject = DataService.getProjectObject();
        });

        //Event CRUD methods that will be used by pretty much all tabs and the controllers of those tabs

        //Method to get all events for an event templatte/collection and then return it
        this.getEvents = function (template,lastFunction,eventNameUpdated,callback) {
            console.log('template',template);
            $http.post('/getevents',{"collectionName":template}).success(function (events) {
                tabScope.eventsObject = events;
                console.log(events);
                if (callback) callback(events,lastFunction,eventNameUpdated);
            });
        };
      
        //Method to add an event to the current selected collection
        this.addEvent = function () {
            var collection;
            if (tabScope.currentTab == 1) collection = tabScope.projectObject.collection_name;
            else if (tabScope.currentTab == 2) collection = tabScope.collectionSelected;
            tabScope.statusEventAdded = false;
            tabScope.errorEventAdded = false;
            //Collect the event data input by the user into one object
            var eventData = {"collection_name":collection,
                            "event_name":tabScope.eventName,
                            "lag_time":tabScope.lagTime,
                            "lead_time":tabScope.leadTime
                        };
            tabScope.savedEventName = tabScope.eventName;
            //Valid the event name, check if duplicate
            var validationResult = tabScope.validateEvent(tabScope.savedEventName);
            if (validationResult[0]==0) {
                tabScope.errorEventAdded = validationResult[1];
                return;
            }   
            //Add event to database
            $http.post('/addevent',eventData).success(function (response) {     
                tabScope.statusEventAdded = response.success;
                if (tabScope.statusEventAdded) {
                    tabScope.getEvents(collection,'add');
                    tabScope.numberOfEvents = response.number_of_events;
                    tabScope.events = response.events;   
                    tabScope.eventName = "";                 
                }
                else {
                    tabScope.errorEventAdded = response.error.errmsg;
                }
            });
        };

        //Methods used to update event

        //This method uses the current event name (from the table) and finds the index of the event inside the eventsObject array
        //It then gets the existing event information (lag_time and lead_time) which will be used to populate the Edit event modal fields.
        this.getCurrentEventData = function (event_name) {
            tabScope.currentEventName = event_name;
            for (var i=0;i<tabScope.eventsObject.length;i++) {
                if (tabScope.eventsObject[i].event_name==tabScope.currentEventName)
                {               
                    tabScope.currentLagTime = tabScope.eventsObject[i].lag_time;
                    tabScope.currentLeadTime = tabScope.eventsObject[i].lead_time;
                    break;
                }
            }
        };

        this.setEventNameSelectedForUpdate = function(event_name) {

            tabScope.eventToUpdate = event_name;
            tabScope.getCurrentEventData(tabScope.eventToUpdate);
        }

        this.updateEvent = function () {
            var collection;
            if (tabScope.currentTab == 1) collection = tabScope.projectObject.collection_name;
            else if (tabScope.currentTab == 2) collection = tabScope.collectionSelected;
            //Variables that control ng-show of "error" and "success" alerts
            tabScope.eventUpdatedResult = false;
            tabScope.eventUpdatedError = false;      
            tabScope.updatedSavedEventName = tabScope.eventToUpdate;
            console.log("name stored:",tabScope.eventToUpdate);
            //Validate the event name
            //Only validate if name has been changed
            if (tabScope.updatedSavedEventName!==tabScope.currentEventName) {
                var validationResult = tabScope.validateEvent(tabScope.currentEventName);
                if (validationResult[0]==0) {
                    tabScope.eventUpdatedError = validationResult[1];
                    return;
                }
            }       

            var newEventData = {"collection_selected":collection,
                "event_name":tabScope.currentEventName,
                "lag_time":tabScope.currentLagTime,
                "lead_time":tabScope.currentLeadTime,
                "event_selected": tabScope.updatedSavedEventName
            };
            $http.post('/updateevent', newEventData).success(function (response) {
                if (response.success) { 
                    tabScope.eventUpdatedResult = true;
                    tabScope.getEvents(collection,"update",newEventData.event_name);

                }
                else tabScope.eventUpdatedError = success.error.errmsg;
            });
        };


        //Method to ensure that a duplicate event name is not added or updated
        this.validateEvent = function (name) {
            console.log("validating..",name);
            for (var event=0; event < tabScope.eventsObject.length;event++) {
                if (tabScope.eventsObject[event].event_name == name) return [0,"An event with that name already exists in this collection. Please use a different name"];
            }
            return [1];
        };

        //Delete event
        this.deleteEventNow = function (event_name) {
            var collection;
            if (tabScope.currentTab == 1) collection = tabScope.projectObject.collection_name;
            else if (tabScope.currentTab == 2) collection = tabScope.collectionSelected;
            $http.post('/deleteevent', {"collectionName":collection,"eventName":event_name}).success(function (response) {
                if (response.success) tabScope.getEvents(collection,'delete',null);
                else tabScope.eventDeletedError = response.error.errmsg;
            });
        }
            

        //Collection CRUD methods

        //Read collections
        this.getCollections = function (lastFunction) {
            $http.get('/getcollections').success(function (collections) {
                tabScope.collectionList = collections;
                //ALso share the collectionList with DataSharing service
                if (lastFunction=='add') tabScope.collectionSelected = tabScope.collectionNameSaved
                else if (collections.length>0) tabScope.collectionSelected = collections[0].name;
            });
        };

        //Add collection
        this.addCollection = function () {
            tabScope.collectionSubmittedError = false;
            tabScope.collectionSubmittedResult = false;
            var collectionData = {"collectionName":tabScope.collectionName};
            $http.post('/addcollection', collectionData).success(function (response) {
                tabScope.collectionSubmittedResult = response.success;
                tabScope.collectionNameSaved = tabScope.collectionName;
                //Call get collections again to update list of collections to include new collection added.
                if (tabScope.collectionSubmittedResult) {
                    tabScope.getCollections('add');  
                    tabScope.collectionName = "";            
                }
                else {
                    if (response.error.code==11000) tabScope.collectionSubmittedError = "A collection already exists with this name! Try a different name."
                    else tabScope.collectionSubmittedError = response.error.errmsg;
                }
            });
        };

        //Delete collection
        this.deleteCollection = function () {
            tabScope.collectionDeletedError = false;
            tabScope.collectionDeletedCollectionNameSave = tabScope.collectionSelected;
            $http.post('/deletecollection', {"collectionName":tabScope.collectionSelected}).success(function (response) {
                tabScope.collectionDeletedResult = response.success;
                if (response.success) tabScope.getCollections('delete');
                else tabScope.collectionDeletedError = response.error.errmsg;
            });
        };

        //Box closed, reset all variables controlling the error and success messages
        this.boxClosed = function () {
            //We can reset our variables now
            this.collectionSubmittedResult = false;
            this.collectionSubmittedError = false;
            tabScope.collectionDeletedResult = false;
            tabScope.collectionDeletedError = false;
            tabScope.eventDeletedError = tabScope.eventDeletedResult = false;
            tabScope.eventUpdatedResult = false;
            tabScope.eventUpdatedError = false;
            tabScope.collectionSubmittedError = tabScope.collectionSubmittedResult = false;
            tabScope.statusEventAdded = tabScope.errorEventAdded = false;
        };



	    //Watches when the current tab changes
	    $scope.$watch(function () { return tabScope.currentTab; }, function(newVal, oldVal) {
    		//On project manager tab load
    		if (newVal==1) {
    			DataService.setCollections();
    			DataService.setConvertedVideos();    			
    		}

            //On collection manager tab load
            else if (newVal==2) {
                DataService.setCollections();
                //Also set the eventsObject
                tabScope.getEvents(tabScope.collectionSelected);
            }

    		//On video manager tab load
    		else if (newVal==3) {
    			DataService.setConvertedVideos();
    		}

            //On capture mode tab load, we can now get the project information and set it
            else if (newVal == 4) {
                DataService.setProjectObject();
            }
    	});

        $scope.$watch(function() { return DataService.hideCaptureModeNoProject; }, function (newVal,oldVal) {
            console.log("hide capture bool watch", newVal, oldVal);
            tabScope.hideCaptureMode = newVal;
        });

	}]);
})();
