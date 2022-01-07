const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../auth_config/auth');
const {uploadFile, deleteFile, getFile} = require('../controller/documentFile.controller'); 
const {createProject, projectDetails, leftMenu, downloadProjectQuestion} = require('../controller/project.controller');
const {getResponse, operatorResponse} = require('../controller/response.controller');
const {userSearch, projectList} = require('../controller/dashBoard.controller');

//upload project document file
router.get('/downloadResponses', downloadProjectQuestion );

//upload project document file
router.post('/uploadFile', authenticateUser, uploadFile );

//get project document file
router.post('/getFile', authenticateUser, getFile );

//delete dumy project document file
router.post('/deleteFile', authenticateUser, deleteFile );

//create new project 
router.post('/createProject', authenticateUser, async (req,res) => { 
    createProject(req,res).then((res) => console.log("Project Creation Successful"))
    .catch(err=>console.trace(err))
});

//get details of project
router.post('/projectDetails', authenticateUser, projectDetails);

// search user by name email phone (make sure account is verified)
router.post('/userSearch', userSearch);

// getResponse in pagination
router.post('/response', getResponse);

// operator Response in pagination
router.post('/operator', operatorResponse);

//get codebook of question
router.post('/leftMenu', leftMenu);

//get user all projects list
router.get('/projectList', authenticateUser, projectList);
//add projectList

module.exports = router;
