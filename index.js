const express = require('express')

const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors')

dotenv.config();

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: 'ap-south-1',
    signatureVersion: 'v2'
});

const app = express(cors())


app.use(express.static(__dirname + '/public'));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res)=> {
    res.render('index', {
        apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET
    })
})

app.post('/api/upload', (req, res) => {
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    const s3Params = {
        Bucket: 'image-test-bucket1',
        Key: fileName,
        ContentType: fileType,
        ACL: 'public-read',
    };
    s3.getSignedUrl('putObject', s3Params, (err, url) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: err });
        } else {
            res.json({ url: url });
        }
    });
});



app.listen(5500, ()=>{
    console.debug("listening at port", 5500)
})