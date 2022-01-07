const User = require('../models/user.model');
const Project = require('../models/project.model');
const STATUS_CODE = require('../statusCode');

module.exports = {
    projectList: (req, res)=>{
        const userId = req.user._id;
        User.findById(userId)
        .populate([{
            path:'projects', 
            model: 'Project',
            populate:[
                {
                    path: 'assignedTo',
                    model:'User',
                    select:'email name'
                },
                {
                    path: 'CreatedBy',
                    model:'User',
                    select:'email name'
                }
            ]
        }]).exec((err,result)=>{
            if(err)  res.status(STATUS_CODE.ServerError).send({ err: err });
            else{
                res.status(STATUS_CODE.Ok).send(result.projects);
            }
        })
    },
    
    userSearch: async (req, res) => {
        let query = req.body.userQuery;
        let limit = req.body.limit;
        if (limit === -1) {
            if (query !== '') {
                await User.find({
                    $and: [{ verified: true },
                    {
                        $or: [
                            { name: { "$regex": query, "$options": 'i' } },
                            { email: { "$regex": query, "$options": 'i' } }
                        ]
                    }]
                },
                    (err, users) => {
                        if (err) {
                            logger.error(err);
                        } else {
                            res.status(STATUS_CODE.Ok).send(users);
                        }
                    }
                );
            } else {
                res.status(STATUS_CODE.Ok).send("");
            }
        } else {
            if (limit === undefined) limit = 10;
            if (query !== '') {
                await User.find({
                    $and: [{ verified: true },
                    {
                        $or: [
                            { name: { "$regex": query, "$options": 'i' } },
                            { email: { "$regex": query, "$options": 'i' } }
                        ]
                    }]
                },
                    { limit: limit },
                    (err, users) => {
                        if (err) {
                            logger.error(err);
                        } else {
                            res.status(STATUS_CODE.Ok).send(users);
                        }
                    }
                );
            } else {
                res.status(STATUS_CODE.Ok).send("");
            }
        }

    }
}