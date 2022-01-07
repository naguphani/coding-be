const client = require('../config/redis.config');
const Project = require('../models/project.model');
const Question = require('../models/question.model');
const Response = require('../models/response.model');
const Codeword = require('../models/codeword.model');

const {promisify} = require("util");
const clientGetPromise = promisify(client.get).bind(client);
const cacheTimeFullProject = '3600'; //1 hour



const fetchProjectDataFromDatabase = async (projectId) => {
    return new Promise(resolve => {
        Project.findById(projectId).
            populate({
                path: 'listOfQuestion', model: Question,
                populate:
                {
                    path: 'listOfResponses',
                    model: Response,
                    options: { sort: { 'resNum': 'asc' } },
                    populate: { path: 'codewords', model: Codeword }
                }
            }).exec(async (err, data) => {
                if (err) {
                    console.log({ err: err });
                } else {
                    console.log("fetchProjectDataFromDatabase", data.listOfQuestion.length);
                    resolve(data);
                }
            })
    });
}

const getDataFromDBAndUpdateStatus = async (projectId) => {
    client.setex(`${projectId}=>status`, cacheTimeFullProject, 'false');
    data = await fetchProjectDataFromDatabase(projectId);
    client.setex(`${projectId}`, cacheTimeFullProject, JSON.stringify(data));
}

module.exports = {
    getProjectData: async(projectId) => {
        let data ;
        let status;
        data = await clientGetPromise(`${projectId}`)
                .then(data=>JSON.parse(data))
                .catch(err=>err);
        if(data==null){
            getDataFromDBAndUpdateStatus(projectId)
        } else{
            status = await clientGetPromise(`${projectId}=>status`)
                .then(status=>status)
                .catch(err=>err);

            if(status === 'true'){
                getDataFromDBAndUpdateStatus(projectId)
            }
        }
        return data;

    },
}
