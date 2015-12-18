// server.js
// modules =================================================
var express        = require('express');
var app            = express();
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var multer         = require('multer');
var ffmpeg         = require("fluent-ffmpeg");
var mongo 		   = require('mongodb');
var mongoose 	   = require('mongoose');
var fs 			   = require('fs');


//Set up and start our Node.js server
// set our port
var port = process.env.PORT || 3000; 

// set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/public')); 
//app.use('/Video Uploads',express.static(__dirname + '/Video Uploads')); 

// routes ==================================================
require('./app/routes')(app); // configure our routes

// start app ===============================================
// startup our app at http://localhost:3000
app.listen(port);               

// shoutout to the user                     
console.log('Magic happens on port ' + port);

//Let's connect to MongoDB now
mongoose.connect('mongodb://localhost/flowbase', function(err) {
    if(err) {
        console.log('Connection error for MongoDB', err);
    } else {
        console.log('Connection successful to MongoDB');
    }
});

//Create schemas
//Create a projects schema to keep track of projects
var ProjectsSchema = new mongoose.Schema({
  "name": {"type":"String","unique":true},
  "date_played":{"type":"Date"},
  "local_team":"String",
  "opposition_team":"String",
  "season":"String",
  "competition":"String",
  "local_team_score":"Number",
  "opposition_team_score":"Number",
  "collection_name":"String",
  "video":"String",
  "date_created": { "type": "Date", "default": Date.now }
});

//Creates a collections schema to keep track of collections of events
var CollectionsSchema = new mongoose.Schema({
	"name":{"type":"String","unique":true},
	"date_created": {"type":"Date","default":Date.now}
});

//Creates a collections schema to keep track of collections of events
var ProjectCollectionsSchema = new mongoose.Schema({
	"name":{"type":"String","unique":true},
	"date_created": {"type":"Date","default":Date.now}
});

//Create an events definition schema which will be used to create events definition collection for the current project
var EventsSchema = new mongoose.Schema({
	"collection_name":"String",
	"event_name":"String",
	"lead_time":"Number",
	"lag_time":"Number"
});

//Create a schema for videos uploaded in (by default in /public/Video Uploads/)
var VideosUploadedSchema = new mongoose.Schema({
	"video_name":"String",
	"file_location":"String",
	"format":"String",
	"file_size":"Number"	//In megabytes
});

//Create schema for videos converted in /public/Videos Converted
var VideosConvertedSchema = new mongoose.Schema({
	"video_name":"String",
	"path": "String",
	"format":"String",
	"width":"Number",
	"height":"Number",
	"frame_rate":"Number",
	"aspect_ratio":"String",
	"codec":"String"
});

var TagsSchema = new mongoose.Schema({
	"tag_name":{"type":"String", "unique":true},
	"event_name":"String",
	"collection_name":"String",
	"project_name":"String",
	"video_name":"String",
	"video_path":"String",
	"start_time":"Number",
	"end_time":"Number",
	"date_created": {"type":"Date","default":Date.now}
});


//Create collections using schemas that we just defined
var ProjectsCollection = mongoose.model('projects', ProjectsSchema);
var CollectionsCollection = mongoose.model('collections',CollectionsSchema);
var ProjectCollectionsCollection = mongoose.model('project_collections', ProjectCollectionsSchema);
var EventsCollection = mongoose.model('events',EventsSchema);
var VideosUploadedCollection = mongoose.model('videos_uploaded', VideosUploadedSchema);
var VideosConvertedCollection = mongoose.model('videos',VideosConvertedSchema);
var TagsCollection = mongoose.model('tags',TagsSchema);

// middleware ==============================================
//Database middleware

//Projects Manager Middleware
//CRUD for projects
//READ: Get projects from projects table in database
app.use('/getprojects',function (req,res) {
	ProjectsCollection.find(function (err, projects) {
  		if (err) res.send("Error fetching projects from database.");
  		else { 
  			res.send(projects);
  		}
	});

});

app.use('/getcurrentproject',bodyParser.json(), function (req,res) {
	ProjectsCollection.find({"name":req.body.project_name}, function (err,project) {
		if (err) res.send([{"name":"Error fetching project. Error message: "+err}])
		else res.send(project);
	});
})

//CREATE: Add a new project

app.use('/copycollectiontoproject', bodyParser.json(), function (req,res) {
	console.log("Copying collection");
	//Let's create a collection with the same name inside project collection table, with date appended
	var projectCollectionName = req.body.collection_name + Date.now();
	console.log('new pc name', projectCollectionName);
	var newProjectCollection = new ProjectCollectionsCollection ({"name": projectCollectionName});
	newProjectCollection.save();

	//Now create new events in the events collection that will be linked to this new project collection
	//First find all events
	var eventsToCopy;
	EventsCollection.find({"collection_name":req.body.collection_name}, function (err,events) {
		eventsToCopy = events;
		console.log('eventsToCopy',eventsToCopy);
		//Now copy each event and change the collection name to the new projectCollectionName
		var newEvent;
		var copiedEvents = [];
		var idx = 0;
		for (idx = 0; idx<eventsToCopy.length; idx++) {
			console.log("currentEvent", eventsToCopy[idx]);

			//Create new event
			newEvent = {"collection_name":projectCollectionName,
				"event_name":eventsToCopy[idx].event_name,
				"lead_time":eventsToCopy[idx].lead_time,
				"lag_time":eventsToCopy[idx].lag_time
			};
			//Add the event to array
			copiedEvents.push(newEvent);
		}

		//Insert this array of documents (events) into EventsCollection
		EventsCollection.create(copiedEvents, function (err,successfullyCopied) {
			console.log("Events to copy", eventsToCopy.length, "Successfully copied", successfullyCopied);
			res.send({"project_collection":projectCollectionName});
		});
	});
});

app.use ('/addproject', bodyParser.json(), function (req,res) {
	var projectName = req.body.projectName;
 	var newProject = new ProjectsCollection({
 		"name": req.body.projectName,
 		"date_played": req.body.datePlayed,
 		"local_team":req.body.localTeam,
 		"opposition_team":req.body.oppositionTeam,
 		"season":req.body.season,
 		"competition":req.body.competition,
 		"local_team_score":req.body.localTeamScore,
 		"opposition_team_score":req.body.oppositionTeamScore,
 		"collection_name": req.body.collection,
 		"video":req.body.video});

	newProject.save(function(err){
	    if(err) res.send({"success":false,"error":err});
	    else {
	    	res.send({"success":true});
	    }
	});
});

//UPDATE: Update project
app.use('/updateproject', bodyParser.json(), function (req,res) {
	ProjectsCollection.update({ "name": req.body.project_name},
	 { "date_played": req.body.date_played,
	  "local_team":req.body.local_team,
	  "opposition_team":req.body.opposition_team,
	  "season":req.body.season,
	  "competition":req.body.competition,
	  "local_team_score":req.body.local_team_score,
	  "opposition_team_score":req.body.opposition_team_score,
	  "video":req.body.video
	},
	   function (err, numberAffected, raw_response) {
		  if (err) res.send({"success":false, "error":err});
		  else {		  	
		  	res.send({"success":true})
		  }
	});
})

//DELETE: Delete a project
app.use('/deleteproject', bodyParser.json(), function (req,res) {
	var projectName = req.body.projectName;
	var projectCollection;

	//Get the name of the collection linked to the project, delete the collection and its events, project tags and finally the project.
	ProjectsCollection.find({'name':projectName}, function (err, projectObject) {
		console.log("Found project", projectObject,"err",err);
		if (err) res.send({"success":false,"error":err});
		else {
			projectCollection = projectObject[0].collection_name;
			console.log("project collection", projectCollection);
			//Delete the collection
			ProjectCollectionsCollection.remove({'name':projectCollection}, function (err) {
				console.log("Collection removed!");
				if (err) res.send({"success":false, "error":err});
				else {
					//Delete the events in the collection
					EventsCollection.remove({'collection_name':projectCollection}, function (err) {
						console.log("Events removed");
						if (err) res.send({"success":false, "error":err});
						else {
							//Delete tags
							TagsCollection.remove({"project_name":projectName}, function (err) {
								if (err) res.send({"success":false,"error":err});
								//Now finally delete the project
								console.log("Deleting project");
								ProjectsCollection.remove({'name': projectName}, function (err) {
									if (err) res.send({"success":false, "error":err});
									else res.send({"success":true});
								});
							});
						}
					});
				}
			});
		}
	});
});

//Collections Manager Middleware
//CR(U)D for collections: No update required as this will be done through events CRUD
//CREATE: Add a new collection
app.use('/addcollection', bodyParser.json(), function (req,res) {
	var newCollection = new CollectionsCollection ({"name":req.body.collectionName});
	newCollection.save(function (err) {
		if (err) res.send({"success":false,"error":err});
		else res.send({"success": true});
	});
});


//READ: Get exisiting collections
app.use('/getcollections',function (req,res) {
	CollectionsCollection.find(function (err, collections) {
		if (err) res.send([{"name":"Error fetching collections. Error message: "+err}])
		else res.send(collections);
	});
});


//DELETE: Remove an existing collection
app.use('/deletecollection',bodyParser.json(),function (req,res) {
	//First delte the collection from the Collections collection
	CollectionsCollection.remove({'name':req.body.collectionName},function (err) {
		if (err) res.send({"success":false,"error":err});
		else {
			//Now delete the events linked to this collection
			EventsCollection.remove({'collection_name':req.body.collectionName}, function (err) {
				if (err) res.send({"success":false, "error":err});
				else res.send({"success":true});
			});			
		}
	});

})

//Events Manager Middleware
//CRUD for events
//Get events for a collection

//CREATE: Add event to collection
app.use('/addevent', bodyParser.json(), function (req,res) {
	var newEvent = new EventsCollection({"collection_name":req.body.collection_name,"event_name":req.body.event_name,"lead_time":req.body.lead_time,"lag_time":req.body.lag_time});
	newEvent.save(function (err) {
		if (err) res.send({"success":false,"error":err});
		else {
				EventsCollection.find(function(err,events) {
					res.send({"success":true,"number_of_events":events.length,"events":events});
				});				
			}
	});
});

//READ: Get all events for the selected collection
app.use('/getevents',bodyParser.json(), function (req,res) {
	console.log("getting events for",req.body.collectionName);
	var collectionName = req.body.collectionName;
	EventsCollection.find({"collection_name":collectionName}, function (err,events) {
		if (err) res.send([{"name":"Error fetching events for this collection. Error message: "+err}])
		else res.send(events);
	});
});

//UPDATE: Update an event in the collection
app.use('/updateevent',bodyParser.json(), function (req,res) {
	EventsCollection.update({ "collection_name": req.body.collection_selected, "event_name":req.body.event_selected },
	 { "event_name": req.body.event_name, "lag_time":req.body.lag_time, "lead_time":req.body.lead_time}, function (err, numberAffected, raw_response) {
		  if (err) res.send({"success":false, "error":err});
		  else {		  	
		  	res.send({"success":true})
		  }
	});
});

//DELETE: Delete an event in the collection
app.use('/deleteevent',bodyParser.json(),function (req,res) {
	EventsCollection.remove({'collection_name':req.body.collectionName, "event_name":req.body.eventName},function (err) {
		if (err) res.send({"success":false,"error":err});
		else res.send({"success":true});
	});
})

//Video Manager middleware

//Create global variable for file name of video
var newFileName;

//Parse the file name before uploading file
app.use('/fileName', bodyParser.json(),function (request,response,next) {
	newFileName = request.body.file_name;
	response.send("Done parsing file name.");
});

app.use('/upload',multer({ dest: './public/Video Uploads/',

rename: function (fieldname,filename,request) {
    return newFileName;
 },

onFileUploadStart: function (file) {
  console.log(file.originalname + ' is starting ...');
},

onFileUploadComplete: function (file,request,response) {
  console.log(file.originalname + ' uploaded to  ' + file.path);
  fileName = file.originalname;
  uploadPath = file.path;
  response.send([fileName,uploadPath]);
}
}));

//Function gets the metadata (using ffprobe) of a video file passed to it, and then returns the metadata object
app.use('/getVideoMetaData',bodyParser.json(), function (request,response,next) {
	var fileName = request.body.fileName;
	var filePath = request.body.filePath;
	ffmpeg.ffprobe(filePath, function(err, metadata) {
		response.send(metadata);	
	}); 	
});

//Function to check if a folder exists, otherwise create it
function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = 0777;
    }
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}

//Converts video using ffmpeg
app.use('/convert',bodyParser.json(), function (request,response,next) {
	var fileName = request.body.fileName;
	var filePath = request.body.filePath;
	var newVideoName = fileName.split('.')[0]+Date.now()+'.mp4'; //MR is for Maxflow Ready
	var savePath = 'public/Videos Converted/'+newVideoName;
	ensureExists('public/Videos Converted/', 0744, function(err) {
	    if (err) console.log("Count not create folder ",err); // handle folder creation error
	    else {
			console.log("Folder successfully created or already exists - no error");// we're all good
			var format = 'mp4';
			var convertedVideo = ffmpeg(filePath)
		    .fps(request.body.framerate)
		    .size(request.body.resolution)
		    .autopad()
		    .format(format)
		    .on('end', function() { response.send({"success":true, "video_name":newVideoName, "saved_path":savePath});})
		    .on('error',function(error) {response.send({"success":false, "error":error.message});})	
		    .on('progress', function(progress) { console.log('Processing: ' + progress.percent + '% done');})
		    .save(savePath);
		}
	});

});




//CRUD for Video Manager - Middleware

//CREATE: Adds video that has been converted to the videos collection in flowbase MongoDB
app.use('/addconvertedvideo', bodyParser.json(), function (request, response,next) {
	var videoName = request.body.video_name;
	var videoPath = request.body.saved_path;
	ffmpeg.ffprobe(videoPath, function(err, metadata) {
		//Now add to VideosConvertedCollection, -1 means undefined or unknown in the database
		var width = metadata.streams[0].width;
		var height = metadata.streams[0].height;
		var aspect = metadata.streams[0].display_aspect_ratio;
		var fr = metadata.streams[0].r_frame_rate.split('/');
		var frame_rate = Math.round(fr[0]/fr[1]);
		var codec = metadata.streams[0].codec_name;
		if (metadata.streams[0].width == undefined) width = -1;
		if (metadata.streams[0].height== undefined) height= -1; 
		if (aspect == "0:1" || aspect == undefined) currentAspect = -1;
		if (fr[0] == "0" || fr == undefined)  frame_rate = -1;
		
		//Create document for collection
		var newConvertedVideo = new VideosConvertedCollection({
			"video_name":videoName,
			"path":videoPath,
			"format":'mp4',
			"width":width,
			"height":height,
			"frame_rate": frame_rate,
			"aspect_ratio": aspect,
			"codec":codec
		});

		//Save the document to the database
		newConvertedVideo.save(function (err) {
			if (err) response.send({"success":false,"error":err})
			else response.send({"success":true});
		});
	}); 
});

//READ: Returns JSON object of all videos in the VideosConvertedCollection collection in MongoDB flowbase
app.use('/getconvertedvideos', function (request,response) {
	VideosConvertedCollection.find(function (err, videos) {
  		if (err) response.send("Error fetching videos from database.");
  		else { 
  			response.send(videos);
  		}
	});
});

//UPDATE: Not required right now. 
//Add an update function to the video manager which will allow the user to change vide name, and also convert video to different resolutions etc.

//DELETE: Remove video from collection and delete the corresponding video file as well.
app.use('/deletevideo', bodyParser.json(), function (request, response) {
	//Delete the actual video file
	fs.unlink(request.body.path, function (err) {
  		if (err) console.log(err);
  		else { 
  			//Now delete the database reference to the video file
  			VideosConvertedCollection.remove({"path":request.body.path} ,function (err) {
  				if (err) response.send({"success":false,"error":err});
  				else response.send({"success":true});
  			});
  		}
  	});
});

//POST response when /getvideopath is sent from front end with name of video, video path is fetched from the converted videos table
app.use('/getvideopath', bodyParser.json(),function (request,response) {
	console.log("Express is getting video path for "+request.body.video_name);
	VideosConvertedCollection.find({"video_name":request.body.video_name},function (err,video_data) {
		console.log("Fetched path..."+video_data[0].path);
		if (err) response.send("Error fetching video path from database.");
		else response.send({"success":true, "path":video_data[0].path});
	});
})

//CRUD for Tags collection

//Add tag
app.use('/addtag',bodyParser.json(), function (request,response) {
		//Create document for collection
	var newTag = new TagsCollection({
		"tag_name":request.body.tag_name,
		"event_name":request.body.event_name,
		"collection_name":request.body.collection_name,
		"project_name":request.body.project_name,
		"video_name":request.body.video_name,
		"video_path":request.body.video_path,
		"start_time":request.body.start_time,
		"end_time":request.body.end_time,
	});

	//Save the document to the database
	newTag.save(function (err) {
		if (err) response.send({"success":false,"error":err})
		else response.send({"success":true});
	});
})

//Get all tags for a project and return the object
app.use('/getprojecttags',bodyParser.json(), function (request, response) {
	TagsCollection.find({"project_name":request.body.project_name}, function (err,tags) {
		console.log("Express has fetched tag object..."+tags);
		if (err) response.send({"success":false, "error":"Error fetching tags for this project: "+err});
		else response.send({"success":true, "tagsObject":tags});
	});
});

//Delete tag
app.use('/deletetag',bodyParser.json(), function (request, response) {
	TagsCollection.remove({"tag_name":request.body.tag_name}, function(err) {
		if (err) response.send({"success":false, "error":"Error deleting tag."+err});
		else response.send({"success":true});
	});
});

// Expose app so that server.js can be required by other modules        
exports = module.exports = app;     