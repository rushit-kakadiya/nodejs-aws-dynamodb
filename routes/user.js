const router = require('express').Router(),
  AWS = require('aws-sdk'),
  AmazonCognitoIdentity = require('amazon-cognito-identity-js'),
  formidable = require('formidable-serverless'),
  fs = require('fs'),
  { randomUUID } = require('crypto');

// aws access control
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// dynamoDB connection
const dynamoClient = new AWS.DynamoDB.DocumentClient();

// cognito connection
const userPool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: process.env.APP_USER_POOL_ID, // Your user pool id here    
  ClientId: process.env.APP_CLIENT_ID // Your client id here
});

// aws s3 bucket 
const s3 = new AWS.S3();

let userData;

// signup page
router.get('/signup', async (req, res, next) => {
  res.render('signup', { title: 'Signup' });
});

router.post('/signup', async (req, res, next) => {
  const { username, email, password } = req.body;
  let attributeList = [];
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email }));
  userPool.signUp(username, password, attributeList, null, function (err, result) {
    if (err) throw next(err.message);
    return res.redirect(`/`);
  });
});

// // verification page
// router.get('/verification', async (req, res, next) => {
//   res.render('verification', { title: 'Verification' })
// })

// router.post('/verification', async (req, res, next) => {
//   cognitoUser.confirmRegistration(req.body.verificationCode, true, function (err, result) {
//     if (err) {
//       console.log(err);
//       return next(err.message);
//     }
//     return res.redirect(`/`);
//   })
// })

// GET home page.
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Login' });
});

router.post('/', async (req, res, next) => {
  const { username, password } = req.body;
  let authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: username,
    Password: password
  });

  let cognitoUserAuth = new AmazonCognitoIdentity.CognitoUser({
    Username: username,
    Pool: userPool
  });

  cognitoUserAuth.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      userData = { email: result.getIdToken().payload.email, username: result.getAccessToken().payload.username }
      return res.redirect(`/dashboard`);
    },
    onFailure: function (err) {
      return next(err.message);
    },
  });
});

// dashboard
router.get('/dashboard', async (req, res, next) => {
  const characters = await dynamoClient.scan({ TableName: process.env.TABLE_NAME }).promise();
  console.log(characters);
  return res.render('dashboard', { title: 'Dashboard' });
});

router.post('/dashboard', async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      // Account for parsing errors
      if (err) throw next("Fetch value Error, Please try again.");
      if (files.file_name.type !== 'text/csv') throw next("CSV file not found.");

      // read the file
      fs.readFile(files.file_name.path, 'utf-8', async (err, data) => {
        if (err) throw next(err.message);
        let fileName = `${Date.now() + Math.round(54648544 + Math.random() * 1e9)}`;
        const params = {
          Bucket: process.env.BUCKET_NAME,
          Key: 'CSV_Files/' + fileName + '.csv',
          Body: data
        };

        let s3Data = await s3.upload(params).promise();
        if (!s3Data) throw next("File upload in bucket error.");

        await dynamoClient.put({
          TableName: 'fileuploading-table',
          Item: { id: randomUUID(), ...userData, file_url: s3Data.Location }
        }).promise();

        return res.send("File saved successfully.");
      });
    });
  } catch (error) {
    return next(error.message);
  }
});


module.exports = router;