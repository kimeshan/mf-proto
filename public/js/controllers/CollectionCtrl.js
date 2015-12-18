// public/js/controllers/CollectionCtrl.js
var app = angular.module('MainCtrl');

app.controller('CollectionCtrl',['$http','$scope','DataService',function($http,$scope,DataService) {
	var collectionScope = this;

	this.tabScope = DataService.getTabScope();

	//Watch for when the user changes the collection in the drop down menu
	$scope.$watch(function () { return collectionScope.tabScope.collectionSelected; }, function(newVal, oldVal) {
				console.log('Collection drop down changed', newVal, oldVal)
				if (newVal!==undefined) collectionScope.getEventsForCollection(collectionScope.tabScope.collectionSelected); 
	});

	$scope.$on('setCollections', function (event, data) {
  		collectionScope.tabScope.getCollections();
	});

	//This function gets all the events under the selected collection (passed as collectionName)
	//lastFunction passes the name of the function that was just executed so we know which event to set as currently selected in the drop down.
	//If an event has just been added or updated, then select that event. Other select the first element at index zero from all events pulled.

	this.getEventsForCollection = function (collection,lastFunction,eventNameUpdated) {
		collectionScope.tabScope.getEvents(collection,lastFunction,eventNameUpdated, function (events,lastFunction, eventNameUpdated) {
				collectionScope.eventsForCollection = events;
				if (lastFunction == 'add') collectionScope.eventSelected = collectionScope.savedEventName;
				else if (lastFunction == 'update') collectionScope.eventSelected = eventNameUpdated;
				else if (events.length>0) collectionScope.eventSelected = events[0].event_name;
		});
	}

}]);
