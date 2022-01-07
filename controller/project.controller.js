const User = require('../models/user.model');
const Project = require('../models/project.model');
const Question = require('../models/question.model');
const Response = require('../models/response.model');
const Codebook = require('../models/codebook.model');
const Folder = require('../models/folder.model');
const STATUS_CODE = require('../statusCode')
const logger = require('../logger')
const RESPONSE_MESSAGE = require('../responseMessage')
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const constants = require('../constant')
var XLSX = require('xlsx')
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_ACCESS_SECRET
});

const projectHelper = require('../helpers/project.helper')
const responseHelper = require('../helpers/response.helper');
const projectDownload = require('../helpers/project.download');


const createCodebook = async () => {
    const newCodebook = new Codebook({
        _id: new mongoose.Types.ObjectId()
    });
    const codebook = await newCodebook.save()
        .then(codebook => codebook)
        .catch(err => {
            console.log("Error during create codebook");
            console.trace(err);
        });
    return codebook._id;
}


const createQuestion = async (desc, codebookId, qType) => {
    const newQuestion = new Question({
        _id: new mongoose.Types.ObjectId(),
        desc: desc,
        codebook: codebookId,
        qType: qType
    });
    const question = await newQuestion.save()
        .then(question => question)
        .catch(err => {
            console.log("Error during create question");
            console.trace(err);
        });
    return question._id;
}

const fetchSomeResponse = async (data, questionNumber, questionId) => {
    let responseList = []
    let count = 0;
    return new Promise((resolve) => {
        data.forEach((cr) => {
            row = cr.split('!,!');
            count++;
            updatedQuestionNumber = questionNumber;
            if (row[updatedQuestionNumber] === undefined || row[updatedQuestionNumber] == '' || row[updatedQuestionNumber] == '\r\n') {
                console.log('Response Undefine - Check fetchSomeResponse in project.controller.js');
            } else {
                const response = {
                    _id: new mongoose.Types.ObjectId(),
                    resNum: count,
                    desc: row[updatedQuestionNumber],
                    length: String(row[updatedQuestionNumber]).length,
                    questionId: questionId
                }
                responseList.push(response);
            }
            if (count === data.length) {
                resolve();
            }
        });
    }).then(() => responseList).catch(err => console.log(err));
}


const saveResponse = async (data, columns, filterColumns, project) => {
    let promiseColumns = new Promise(resolve => {
        let countQ = 0;
        if (columns.length===0) {
            resolve("Project is created successfully");
        } else{
            columns.map(async ele => {
                const codebookId = await createCodebook();
                const questionId = await createQuestion(ele.question, codebookId, constants.qType_Question);
                Project.findByIdAndUpdate(project._id, { $push: { listOfQuestion: questionId , groupOfQuestion: ele.group } }, { upsert: true, new: true })
                    .exec((err, info) => {
                        if (err) console.log("Error during push question in project question list: ", err);
                    })
                const responseArray = await fetchSomeResponse(data, ele.column, questionId);
                Response.insertMany(responseArray)
                    .then(async (doc) => {
                        const responseIds = await doc.map(ele => ele._id);
                        Question.findByIdAndUpdate(questionId, { $push: { listOfResponses: { $each: responseIds } } })
                            .exec((err, result) => {
                                if (err) console.log(err);
                                countQ++;
                                if (countQ === columns.length) {
                                    resolve("Project is created successfully");
                                }
                            })
                    })
                    .catch((err) => console.log(err));
            });
        }
    }).then((res) => res);

    let promiseFilterColumns = new Promise(resolve => {
        let countF = 0;
        if (filterColumns.length===0) {
            resolve("Project is created successfully");
        } else{
            filterColumns.map(async ele => {

                const questionId = await createQuestion(ele.question, null, constants.qType_Filter);
                Project.findByIdAndUpdate(project._id, { $push: { listOfQuestion: questionId , groupOfQuestion: -1} }, { upsert: true, new: true })
                    .exec((err, info) => {
                        if (err) console.log("Error during push question in project question list: ", err);
                    })
                const responseArray = await fetchSomeResponse(data, ele.column, questionId);
                Response.insertMany(responseArray)
                    .then(async (doc) => {
                        const responseIds = await doc.map(ele => ele._id);
                        Question.findByIdAndUpdate(questionId, { $push: { listOfResponses: { $each: responseIds } } })
                            .exec((err, result) => {
                                if (err) console.log(err);
                                countF++;
                                if (countF === filterColumns.length) {
                                    resolve("Project is created successfully");
                                }
                            })
                    })
                    .catch((err) => console.log(err));
            });
        }
    }).then((res) => res);

    return Promise.all([promiseColumns,promiseFilterColumns])
    .then(res => res)
    .catch(err => console.log(err))
}

const processExcel = async (data) => {
    var workbook = XLSX.read(data, {
      type: 'buffer'
    });
    var firstSheet = workbook.SheetNames[0];
    var data = await to_json(workbook);
    return data
  };

  const to_json = async (workbook) => {
    var result = [];
    workbook.SheetNames.forEach(function(sheetName) {
      var roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1
      });
      if (roa.length) result.push(roa);
    });
    return result[0].map(x => x.join("!,!"));
  };

  function getBufferFromS3(params, callback){
    const buffers = [];
    const stream = s3.getObject(params).createReadStream();
    stream.on('data', data => buffers.push(data));
    stream.on('end', () => callback(null, Buffer.concat(buffers)));
    stream.on('error', error => callback(error));
  }

  // promisify read stream from s3
  function getBufferFromS3Promise(params) {
    return new Promise((resolve, reject) => {
      getBufferFromS3(params, (error, s3buffer) => {
        if (error) return console.log(error);
        return resolve(s3buffer);
      });
    });
  };

  // create workbook from buffer


module.exports = {
    createProject: async (req, res) => {
        const { name, desc, key, columns,filterColumns, industry, type, tags } = req.body;
        const codebookId = await createCodebook();

        const projectExists = await Project.findOne({name:name});
        if(projectExists){
            res.status(STATUS_CODE.BadRequest).send({ message:"Duplicate project name cannot be used." })
            throw new Error("Duplicate project name cannot be used.");
        }else {

        const newProject = new Project({
            _id: new mongoose.Types.ObjectId(),
            name: name,
            desc: desc,
            docKey: key,
            industry: industry,
            type: type,
            codebook: codebookId,
            CreatedBy: req.user._id,
            assignedTo: tags
        });
        const project = await newProject.save()
            .then(project => project)
            .catch(err => {
                console.log("Error during create project");
                console.trace(err);
            });
        //assigned projects to user
        tags.map(userId => {
            User.findByIdAndUpdate(userId, { $push: { projects: project._id } }, { upsert: true }, (err, res1) => {
                if (err) console.log(err);
            })
        });
        //there add project._id to user project list then send back response
        await User.findByIdAndUpdate(req.user._id, { $push: { projects: project._id } }, { upsert: true, new: true })
            .then(async () => {
                //here fetch data from document file (question, [respones]) and store to database
                const formate = key.split('.');
                if (formate[formate.length - 1] === 'csv') {
                    const params = {
                        Bucket: process.env.AWS_DOCUMENT_BUCKET,
                        Key: key
                    }
                    s3.getObject(params, async (err, result) => {
                        if (err) {
                            res.status(STATUS_CODE.ServerError).send({ err });
                        } else {
                            const data = result.Body.toString("utf8").split('\r\n');
                            await saveResponse(data.splice(1), columns, filterColumns,project._doc).then((results) => {
                                console.log(results);
                                res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.projectCreated, projectId: project._id });
                            }).catch((err) => console.log(err));


                        }//eles body finish
                    })
                } else if (formate[formate.length - 1] === 'xlsx') {
                    const params = {
                        Bucket: process.env.AWS_DOCUMENT_BUCKET,
                        Key: key
                    }
                    const buffer = await getBufferFromS3Promise(params);
                    const workbook = await XLSX.read(buffer);

                    const data = await to_json(workbook);
                    
                    await saveResponse(data.splice(1), columns, filterColumns, project._doc).then((results) => {
                        console.log(results);
                        res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.projectCreated, projectId: project._id });
                    }).catch((err) => console.log(err));
                }   else {
                    res.status(STATUS_CODE.Ok).send({ message: 'only .csv file logic implement' });
                }
            })
            .catch(err => res.status(STATUS_CODE.ServerError).send(err));
    }},

    projectDetails: (req, res) => {
        const id = req.body.id;
        Project.findById(id).
            populate({path:'listOfQuestion', model:'Question', select:'desc qType'}).
            exec((err, project) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send({ err: err });
                } else {
                    res.status(STATUS_CODE.Ok).send({ project: project });
                }
            })
    },

    downloadProjectQuestion: async (req,res) => {
        try{
            const {projectId,questionIds} = req.query;
            const out = await projectDownload.saveFormResponsesToExcel(projectId,questionIds);

            await res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            await res.setHeader(
                "Content-Disposition",
                "attachment; filename=" + "responses.xlsx"
            );
                
            await out.workbook.xlsx.write(res).
                                then(()=>{
                                    res.status(200).send().end();
                                }).
                                catch(err => {
                                    console.log(err)
                                    res.status(500).send(err)
                                })
        } catch(err){
            console.trace(err);
        }
        // res.send({message:"Request Done"});
    },

    leftMenu: (req, res) => {
        const questionId = req.body.questionId;
        console.log("leftMenu Call: ", questionId);
        Question.findById(questionId).
            populate([{
                path: 'root',
                model: 'Folder',
                populate: {
                    path: 'codewords',
                    model: 'Codeword',
                    options: { sort: { 'tag': 'asc' } },
                }
            }, {
                path: 'rootCodebook',
                model: 'Codeword',
                options: { sort: { 'tag': 'asc' } },
            }, {
                path: 'codebook',
                model: 'Codebook',
                populate: {
                    path: 'codewords',
                    model: 'Codeword',
                    options: { sort: { 'tag': 'asc' } },
                }
            }]).
            exec((err, data) => {
                if (err) {
                    console.log(err);
                    res.status(STATUS_CODE.ServerError).send({ err: err });
                }
                else {
                    // console.log(data);
                    var questionCodebookId ;
                    var codewords ;
                    var tree ;
                    if(data.codebook){
                        questionCodebookId = data.codebook._id;
                        codewords = data.codebook.codewords;
                        tree = [...data.rootCodebook, ...data.root,]
                    }
                    // console.log("data.codebook-->",data.codebook);
                    
                    // console.log({codewords})

                    res.status(STATUS_CODE.Ok).send({ tree, questionCodebookId, codewords });

                }
            })

    }
}
