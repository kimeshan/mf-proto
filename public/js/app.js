//Angular app: Functions controlling the front end in index.html
var app = angular.module('Maxflow',['MainCtrl','FileUploadModule','ui.bootstrap']);

(function () {

	//Directive to inject views
	app.directive('videomanagerTab',function () {
		return {
			restrict:'E',
			templateUrl:'../views/videomanager-tab.html'
		};
	});

	app.directive('converterTab',function() {
		return {
			restrict:'E',
			templateUrl:'../views/converter-tab.html'
		};
	});

	app.directive('videoTable',function () {
		return {
			restrict:'E',
			templateUrl:'../views/videoInfoTable.html'
		};
	});

	app.directive('projectmanagerTab',function () {
		return {
			restrict:'E',
			templateUrl:'../views/projectmanager-tab.html'
		};
	});



	app.directive('collectionmanagerTab',function () {
		return {
			restrict:'E',
			templateUrl:'../views/collectionmanager-tab.html'
		};
	});

	app.directive('collectionModals',function () {
		return {
			restrict:'E',
			templateUrl:'../views/collection-modals.html'
		};
	});

	app.directive('projectModals', function () {
		return {
			restrict:'E',
			templateUrl:'../views/project-modals.html'
		};
	});

	app.directive('analyzerTab', function () {
		return {
			retrict:'E',
			templateUrl:'../views/analyzer-tab.html'
		};
	});

})();

