const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const path = require('path');

AWS.config.update({ region: 'ap-south-1' });

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const app = express();
const PORT = 4000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/student', upload.single('profile_pic'), async (req, res) => {
    const { name, student_id, department } = req.body;
    const file = req.file;

    if (!file) return res.status(400).send('Profile picture is required.');

    const s3Params = {
        Bucket: 'student-prof-bucket',
        Key: `students/${student_id}.jpg`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        await s3.upload(s3Params).promise();
        const imageUrl = `https://${s3Params.Bucket}.s3.amazonaws.com/${s3Params.Key}`;

        const dbParams = {
            TableName: 'student-records',
            Item: {
                username : student_id,
                name,
                department,
                imageUrl
            }
        };

        await dynamoDB.put(dbParams).promise();

        res.render('success', { student: dbParams.Item });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing request.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
