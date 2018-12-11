class AudioStream {

    constructor(region, IdentityPoolId, audioStoreWithBucket) {
        this.region = region; //s3 region
        this.IdentityPoolId = IdentityPoolId; //identity pool id 
        this.bucketName = audioStoreWithBucket; //audio file store
        this.s3; //variable defination for s3
        this.dateinfo = new Date();
        this.timestampData = this.dateinfo.getTime(); //timestamp used for file uniqueness
        this.etag = []; // etag is used to save the parts of the single upload file
        this.recordedChunks = []; //empty Array 
        this.booleanStop = false; // this is for final multipart complete
        this.incr = 0; // multipart requires incremetal so that they can merge all parts by ascending order
        this.filename = this.timestampData.toString() + ".webm"; //unique filename 
        this.uploadId = ""; // upload id is required in multipart
        this.recorder; //initializing recorder variable
        
        //To use microphone it shud be {audio: true}
        this.audioConstraints = {
            audio: true
        };
    }

    audioStreamInitialize() {
        /*
            Creates a new credentials object, which will allow us to communicate with the aws services.
        */
        var self = this;
        AWS.config.region = self.region;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: self.IdentityPoolId,
        });

        /*
            Constructs a service object.
        */
        self.s3 = new AWS.S3();

        /*
            Feature detecting is a simple check for the existence of "navigator.mediaDevices.getUserMedia"

            To use the microphone. we need to request permission. 
            The parameter to getUserMedia() is an object specifying the details and requirements for each type of media you want to access.
            To use microphone it shud be {audio: true}

        */
        navigator.mediaDevices.getUserMedia(self.audioConstraints)
            .then(function(stream) {
                /*
                    once we accept the prompt for the audio stream from user's mic we enable the record button.
                */
                $("#record_q1").removeAttr("disabled");
                /*
                    Creates a new MediaRecorder object, given a MediaStream to record.
                */
                self.recorder = new MediaRecorder(stream);

                /*
                    Called to handle the dataavailable event, which is periodically triggered each time timeslice milliseconds of media have been recorded 
                    (or when the entire media has been recorded, if timeslice wasn't specified). 
                    The event, of type BlobEvent, contains the recorded media in its data property. 
                    You can then collect and act upon that recorded media data using this event handler.
                */
                self.recorder.addEventListener('dataavailable', function(e) {
                    var normalArr = [];
                    /*
                        Here we push the stream data to an array for future use.
                    */
                    self.recordedChunks.push(e.data);
                    normalArr.push(e.data);

                    /*
                        here we create a blob from the stream data that we have received.
                    */
                    var blob = new Blob(normalArr, {
                        type: 'audio/webm'
                    });

                    /*
                        if the length of recordedChunks is 1 then it means its the 1st part of our data.
                        So we createMultipartUpload which will return an upload id. 
                        Upload id is used to upload the other parts of the stream

                        else.
                        It Uploads a part in a multipart upload.
                    */
                    if (self.recordedChunks.length == 1) {
                        self.startMultiUpload(blob, self.filename)
                    } else {
                        /*
                            self.incr is basically a part number.
                            Part number of part being uploaded. This is a positive integer between 1 and 10,000.
                        */
                        self.incr = self.incr + 1
                        self.continueMultiUpload(blob, self.incr, self.uploadId, self.filename, self.bucketName);
                    }
                })
            });
    }

    disableAllButton() {
        $("#formdata button[type=button]").attr("disabled", "disabled");
    }

    enableAllButton() {
        $("#formdata button[type=button]").removeAttr("disabled");
    }

    /*
        The MediaRecorder method start(), which is part of the MediaStream Recording API,
        begins recording media into one or more Blob objects. 
        You can record the entire duration of the media into a single Blob (or until you call requestData()),
        or you can specify the number of milliseconds to record at a time. 
        Then, each time that amount of media has been recorded, an event will be delivered to let you act upon the recorded media, 
        while a new Blob is created to record the next slice of the media
    */
    startRecording(id) {
        var self = this;
        self.enableAllButton();
        $("#record_q1").attr("disabled", "disabled");
        /*
            1800000 is the number of milliseconds to record into each Blob. 
            If this parameter isn't included, the entire media duration is recorded into a single Blob unless the requestData() 
            method is called to obtain the Blob and trigger the creation of a new Blob into which the media continues to be recorded.
        */
        /*
        PLEASE NOTE YOU CAN CHANGE THIS PARAM OF 1800000 but the size should be greater then or equal to 5MB. 
        As for multipart upload the minimum breakdown of the file should be 5MB 
        */
        //this.recorder.start(1800000);
        this.recorder.start(900000);

    }

    /*
        When the stop() method is invoked, the UA queues a task that runs the following steps:
        1 - If MediaRecorder.state is "inactive", raise a DOM InvalidState error and terminate these steps. 
        If the MediaRecorder.state is not "inactive", continue on to the next step.
        2 - Set the MediaRecorder.state to "inactive" and stop capturing media.
        3 - Raise a dataavailable event containing the Blob of data that has been gathered.
        4 - Raise a stop event.
    */
    stopRecording(id) {
        var self = this;
        self.recorder.stop();
        /*
            Once the recording is stop we change the flag of self.booleanStop to true.
            which means we have completed the recording and now we can
            Completes a multipart upload by assembling previously uploaded parts.
        */
        self.booleanStop = true;
        //disable self
        self.disableAllButton()
        $("#stop_q1").attr("disabled", "disabled");
        // add loader
        self.setLoader();
    }

    /*
        When a MediaRecorder object’s pause()method is called, the browser queues a task that runs the below steps:
        1 - If MediaRecorder.state is "inactive", raise a DOM InvalidState error and terminate these steps. If not, continue to the next step.
        2 - Set MediaRecorder.state to "paused".
        3 - Stop gathering data into the current Blob, but keep it available so that recording can be resumed later on.
        4 - Raise a pause event.
    */
    pauseRecording(id) {
        var self = this;
        self.recorder.pause();
        $("#pause_q1").addClass("hide");
        $("#resume_q1").removeClass("hide");
    }


    /*
        When the resume() method is invoked, the browser queues a task that runs the following steps:
        1 - If MediaRecorder.state is "inactive", raise a DOM InvalidState error and terminate these steps. If MediaRecorder.state is not "inactive", continue to the next step.
        2 - Set MediaRecorder.state to "recording".
        3 - Continue gathering data into the current Blob.
        4 - Raise a resume event.
    */
    resumeRecording(id) {
        var self = this;
        self.recorder.resume();
        $("#resume_q1").addClass("hide");
        $("#pause_q1").removeClass("hide");
    }

    /*
        Initiates a multipart upload and returns an upload ID.
        Upload id is used to upload the other parts of the stream
    */
    startMultiUpload(blob, filename) {
        var self = this;
        var audioBlob = blob;
        var params = {
            Bucket: self.bucketName,
            Key: filename,
            ContentType: 'audio/webm',
            ACL: 'private',
        };
        self.s3.createMultipartUpload(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
            } else {
                self.uploadId = data.UploadId
                self.incr = 1;
                self.continueMultiUpload(audioBlob, self.incr, self.uploadId, self.filename, self.bucketName);
            }
        });
    }

    /*
        Uploads a part in a multipart upload.
        The following code uploads part of a multipart upload. 
        it specifies a file name for the part data. The Upload ID is same that is returned by the initiate multipart upload. 
    */
    continueMultiUpload(audioBlob, PartNumber, uploadId, key, bucketName) {
        var self = this;
        var params = {
            Body: audioBlob,
            Bucket: bucketName,
            Key: key,
            PartNumber: PartNumber,
            UploadId: uploadId
        };
        console.log(params);
        self.s3.uploadPart(params, function(err, data) {
            if (err) {
                console.log(err, err.stack)
            } // an error occurred
            else {
                /*
                    Once the part of data is uploaded we get an Entity tag for the uploaded object(ETag).
                    which is used later when we complete our multipart upload.
                */
                self.etag.push(data.ETag);
                if (self.booleanStop == true) {
                    self.completeMultiUpload();
                }
            }
        });
    }


    /*
        Completes a multipart upload by assembling previously uploaded parts.
    */
    completeMultiUpload() {
        var self = this;
        var outputTag = [];
        /*
            here we are constructing the Etag data in the required format.
        */
        self.etag.forEach((data, index) => {
            const obj = {
                ETag: data,
                PartNumber: ++index
            };
            outputTag.push(obj);
        });

        var params = {
            Bucket: self.bucketName, // required 
            Key: self.filename, // required 
            UploadId: self.uploadId, // required 
            MultipartUpload: {
                Parts: outputTag
            }
        };

        self.s3.completeMultipartUpload(params, function(err, data) {
            if (err) {
                console.log(err, err.stack)
            } // an error occurred
            else {
                // initialize variable back to normal
                self.etag = [], self.recordedChunks = [];
                self.uploadId = "";
                self.booleanStop = false;
                self.disableAllButton();
                self.removeLoader();
                alert("we have successfully saved the questionaire..");
            }
        });
    }


    /*
        set loader
    */
    setLoader() {
        $("#kc-container").addClass("overlay");
        $(".preloader-wrapper.big.active.loader").removeClass("hide");
    }


    /*
        remove loader
    */
    removeLoader() {
        $("#kc-container").removeClass("overlay");
        $(".preloader-wrapper.big.active.loader").addClass("hide");
    }
}