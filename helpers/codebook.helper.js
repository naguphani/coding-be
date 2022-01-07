const Project = require('../models/project.model');
const Question = require('../models/question.model');
const Response = require('../models/response.model');
const Codeword = require('../models/codeword.model');

module.exports = {
    getCodebookFromQuestionId: async (questionId) => {
        const data = await Question.findById(questionId).
        populate([ {
            path: 'codebook',
            model: 'Codebook',
            populate: {
                path: 'codewords',
                model: 'Codeword',
                options: { sort: { 'tag': 'asc' } },
            }
        }]).then(data=>data)
        .catch(err=>err)

        var questionCodebookId ;
        var codewords ;
        if(data.codebook){
            questionCodebookId = data.codebook._id;
            codewords = data.codebook.codewords;
        }
        // console.log("data.codebook-->",data.codebook);
        
        // console.log({codewords})

        return codewords;

    }
}