# maxflow
Sport match and player video analysis and analytics platform

##Technical Overview
Maxflow is a sports match and player performance video analytics platform. It's a web application built on the MEAN stack. **Node.js** and the **Express** web framework is used on the backend while **AngularJS, HTML 5 and CSS** are used on the front-end. MongoDB will be used as the database. Maxflow can be used offline and online in the browser while a sync process will ensure the online server is updated.

The completed web application will consist of three main components:
 1. **Project, Collections & Events Management (CRUD)**
  - Project Manager: CRUD for projects. Each project is stored in 'projects' table consisting of the following columns:
     - "name": {"type":"String","unique":true}
     - "date_played":{"type":"Date"}
     - "local_team":"String"
     - "opposition_team":"String"
     - "season":"String"
     - "competition":"String"
     - "local_team_score":"Number"
     - "opposition_team_score":"Number"
     - "collection_name": "String"
     - "video": "String"
  - Collections Manager: CRUD for collections of events. Collections are stored in 'collections' table which has just two columns:
     -	"name":{"type":"String","unique":true}
     -	"date_created": {"type":"Date","default":Date.now}
  - Events Management: CRUD for events under a collection. Events are linked to a collection by the "collection_name" column which matches the "name" column in 'collections' table:
     - "collection_name":"String"
     - "event_name":"String"
     - "lead_time":"Number"
     - "lag_time":"Number"
 2. **Video Manager**
  - **Uploader** - Performs video upload (offline and online). Offline uploads will be stored in the Maxflow application folder (which will ultimately be in C:/Program Files when the completed product is distributed). When an internet connection is available uploaded videos will be syncrhonized with a cloud-based server.
  - **Converter** - Converts original uploaded video using fluent-ffmpeg module. The goal here is to compress large video files (such as those from HD camcorders) to obtain a smaller file size while maintaining an acceptable viewing quality for later analysis in the Editor. 
 3. **Video Analysis Mode** - User can tag segments of the video with these events. Events are defined by the user in a Collection visa the Collections & Events Manager (CRUD), for example an event called "Penalty Team Blue" might be created with a lead time of 10sec and lag time of 20 sec. When a time point (say 00:05:02) in the video is tagged with this event, the tag stored will define start time (lead time) as 10 seconds before (00:05:52) and end time (lag time) as 20 seconds after (00:05:22). A 'tags' table in the database will store this information.
  - **Tags** table columns:
     - tag_id
     - project_name (string) - Linked to 'projects' table.
     - collection_name (string) - Linked to 'collections' table.
     - event_name (string) - Linked to 'events' table.
     - start_time (timestamp of starting point in video of the play being tagged)
     - end_time (timestamp of ending point in video of the play being tagged)
     - video_name (name of video as stored in offline folder/cloud server)
     - tag_duration (difference between start_time and end_time)

##Completed Components
- Projects Manager
  - Creating, listing, deletion of projects
  - Form validation for required fields.
  - Seamless modals used, no page loading.
  - Error handling
  - Confirmation prompt before deleting.
- Collections Manager 
  - Creating, listing, deletion and updating of collections (of events).
  - Same features as projects manager ((modals, error handling, delete prompt).
- Events Manager 
  -  Once a collection is selected, the events manager can be used to create, list, delete and update events inside the collection.
  -  Same features as project manager (modals, error handling, delete prompt).
- Video Manager
  - Video upload: file is copied to Maxflow application folder inside "Video Uploads" folder.
  - Video renaming according to user input via form. Validation: Upload button enabled only when a name and valid video file has been selected.
  - Video listing and deletion.
  - In-browser video player displays video for mp4, ogg and webm video files.
  - Video converter: Encoding and Compression, compresses large-sized, HD videos to optimal SD.
    - Extracts resolution, aspect ratio, frame rate, format and codec of original video.
    - Uses extracted information to calculate optimal settings* for encoding to achieve best compression and quality:
       - Original aspect ratio is maintained
       - Optimal format  chosen is mp4 using H.264 codec
       - Optimal resolution for 16:9 aspect ratio videos chosen: 640x480 (SD)
       - Optimal resolution for 4:3 aspect ratio videos chosen: 640x360 (SD)
       - Videos with width lower than 640 pixels maintain original resolution to avoid distortion.
       - Optimal frame rate is 30 fps or less. Videos with higher original frame rates are converted to 30 fps or half of original frame rate. e.g. 70 fps -> 35 fps.
  - **Note**: Optimal settings algorithm developed based on information from [Youtube's advanced encoding settings] (https://support.google.com/youtube/answer/1722171?hl=en) and [Vimeo's compression guidelines](https://vimeo.com/help/compression).

##Components in Development
- Project manager: Update feature to edit project fields.
- Video analysis mode: Allow tagging of time points in the video with the events that were defined by the user.
- Video player/browser: Integrating a feature-rich video player such as Video.js to enable advance video playing and timeline features in the browser.

##Features to be added later
- See roadmap for more detail.
- Progress bar: For video upload.
- Sync process to synchronous videos on the user's machine with online, cloud-based server. This will allow the user to access videos from any location by logging in through the Maxflow web application on a web broswer.

##Requirements

* Node.js v0.12.0: Download [here](https://nodejs.org/download/)
* MongoDB v3.0: Download [here] (https://www.mongodb.org/downloads) and follow [these instructions](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-windows) to install.

##Instructions (Windows)

1. Install the above requirements. Confirm that Node.js was installed correctly by typing the following in Windows Command prompt/Powershell:
  ````
  node --version
  ```` 

  **v0.12.0** should be displayed.
2. Clone this repo using 'git clone https://github.com/imobi/maxflow.git' in your chosen directory. e.g C:/Maxflow.
3. Run MongoDB server, from Command Prompt on Windows, navigate to the directory where you installed MongoDB which contains the mongod.exe file.
  - Now, specify the data directory using the command:
     ````
     .\mongod.exe --dbpath "C:/Maxflow"
     ````
     This should get the MongoDB server up and listening to the default port. Do not close this command prompt window.
4. Open a **second** Powershell/Command Prompt on Windows
  - Set the current directory to the chosen directory in step 2 (i.e. our Git repo). e.g cd "C:/Maxflow"
  - Run the command "node server.js". 
  - "Magic happens at port 3000" should be displayed. Your firewall may pop up with a notification - if so proceed to allow Node.js to use port 3000.
  - "Connection successful to MongoDB" should also be displayed indicated that the Mongo server has been connected to.
5. Open your web browser (preferably Chrome), and go to 'localhost:3000'. This should start the Maxflow web application! That's it.
6. Videos uploaded will automatically upload to: *your-chosen-directory-in-2*/public/Video Uploads
7. Converted videos can be located in *your-chosen-directory-in-2*

