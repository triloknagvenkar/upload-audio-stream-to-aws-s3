# Follow the steps to configure audio stream to AWS S3

# Step1
- Clone the repository and navigate to the cloned repo directory.

# Step2
- Open [Source HTML](index-structured.html) file in any of your favourite editor.
- Go to the bottom of the HTML code and replace the config values mentioned below with newely generated values from your AWS account.
  ```
    var wRegion = "us-east-1"; # Region where the Pool id is present.
    var poolid = "us-east-1:XXXXXXXXX"; # Pool id
    var s3bucketName = "BUCKET_NAME"; # Your S3 Bucket name where you want the audio files to be uploaded.
  ```
  
# Step3
- Once the values are replaced, you can open [Source HTML](index-structured.html) in any web browser.
- It will prompt asking for the permission to access the microphone.
- Click Allow.

# Step4
- Done, Now you can see the Record button as enabled.
- Now you can enjoy streaming the live audio and upload it to S3.
