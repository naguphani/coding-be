const client = require('../config/redis.config');
const Project = require('../models/project.model');
const Question = require('../models/question.model');
const Response = require('../models/response.model');
const Codeword = require('../models/codeword.model');

module.exports = {
     fetchQuestionsResponse: async (data, questions) => {
        const result = await data.listOfQuestion
            .filter(ele => {
                for (let i = 0; i < questions.length; i++) {
                    if (questions[i] == ele._id) return true;
                }
                return false;
            }).map(ele => ele.listOfResponses);
        let response = [];
        return new Promise(resolve => {
            for (let i = 0; i < result.length; i++) {
                response = [...response, ...result[i]];    
            }
            resolve(response);
        }).then((response) => response)
        .catch(err=>err)
    }
}