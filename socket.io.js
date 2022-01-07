const mongoose = require('mongoose');
const Question = require('./models/question.model');
const Codebook = require('./models/codebook.model');
const Codeword = require('./models/codeword.model');
const Response = require('./models/response.model');
const Folder = require('./models/folder.model');
const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
} = require('./socketUser');
const client = require('./config/redis.config');
const { cacheTimeFullProject } = require('./constant');


const findStructure = async (user) => {
    let Tree;
    console.log("room fetch:0", user.room);
    await new Promise((resolve, reject) => {
        Question.findById(user.room).
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
            }]).
            exec((err, res) => {
                if (err) {
                    reject(err);
                }
                else {
                    if (res) {
                        const tree = [...res.rootCodebook, ...res.root,]
                        resolve(tree);
                    }
                }
            })
    }).then(tree => {
        Tree = tree;
    }).catch(err => console.log(err))
    return Tree;
}

module.exports = (io) => {
    //socket code
    io.on('connection', socket => {

        console.log("user connected");
        //user connect
        socket.on('joinRoom', async ({ username, room, projectId, questionCodebookId }) => {
            const user = await userJoin(socket.id, username, room, projectId, questionCodebookId);
            console.log("joined user: ", { user });
            socket.join(user.room);
            // simple emit a message(emit to single user who is connecting)
            // socket.emit('message', 'Welcome to Survey Buddy');  

            //new user is connected (emit to all users except to connected user)
            socket.broadcast
                .to(user.room)
                .emit('message', `New ${username} is connected`);

            // Send users and room info (all user)
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        })


        //user disconnected
        socket.on('disconnect', async () => {
            const user = await userLeave(socket.id);
            if (user) {
                //(all user) but here loginUser did exit
                io.to(user.room).emit('message', `${user.username} has disconnected`);

                console.log("user has logged out")

                // Send users and room info (all user) but here loginUser did exit
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getRoomUsers(user.room)
                });
            }
        })
        socket.on('_disconnect', async () => {
            const user = await userLeave(socket.id);
            if (user) {
                //(all user) but here loginUser did exit
                io.to(user.room).emit('message', `${user.username} has disconnected`);

                console.log("user has logged out")

                // Send users and room info (all user) but here loginUser did exit
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getRoomUsers(user.room)
                });
            }
        })
        // Listen for operation
        //for multiple selected responses  operation = { codewordId, responses:[arrayOfResNum]}
        socket.on('multiple-response-operation', async operation => {
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //triger operation to connect all users to this room
            io.to(user.room).emit('multiple-operation', operation);
            //here also make change to db
            let count = 0;
            let len = 0;
            new Promise(resolve => {
                operation.responses.map(ele => {
                    len++;
                    Response.findOne({ resNum: ele, questionId: user.room })
                        .exec((err, response) => {
                            if (err) {
                                socket.emit('message', `Someting went wrong during assigned keyword to Response ${ele}`);
                            } else {
                                if (response.codewords.length === 0) count++;

                                Response.findByIdAndUpdate(response._id, { $addToSet: { codewords: operation.codewordId } }, (err, res) => {
                                    if (err) { console.log(err); }
                                });
                            }
                            if (len === operation.responses.length) {
                                resolve();
                            }
                        })
                })
            }).then(() => {

                Question.findByIdAndUpdate(user.room, { $inc: { resOfCoded: count } }, { new: true })
                    .exec((err, question) => {
                        if (err) { console.log(err); }
                        else {
                            //triger Response of Question coded to connect all users to this room
                            io.to(user.room).emit('question-response-coded', { resOfCoded: question.resOfCoded });
                        }
                    });
                Codeword.findByIdAndUpdate(operation.codewordId, { $addToSet: { resToAssigned: operation.responses } }, { new: true })
                    .exec((err, result) => {
                        if (err) { console.log(err); }
                        else {
                            //triger Response of Question coded to connect all users to this room
                            io.to(user.room)
                                .emit('codeword-assigned-to-response',
                                    { codewordId: result._id, resToAssigned: result.resToAssigned.length });
                        }
                    })
            })
        });

        //for multiple selected responses  operation = { codewordId, responses:[arrayOfResNum]}
        socket.on('multiple-response-removal-operation', async operation => {
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //triger operation to connect all users to this room
            io.to(user.room).emit('multiple-removal-operation', operation);
            //here also make change to db
            let count = 0;
            let len = 0;
            new Promise(resolve => {
                operation.responses.map(ele => {
                    len++;
                    // console.log(ele);
                    Response.findOne({ resNum: ele, questionId: user.room })
                        .exec((err, response) => {
                            if (err) {
                                socket.emit('message', `Someting went wrong during assigned keyword to Response ${ele}`);
                            } else {
                                if (response.codewords.find(ele => ele == operation.codewordId) !== undefined && response.codewords.length === 1) {
                                    count++;
                                }
                                Response.findByIdAndUpdate(response._id, { $pull: { codewords: operation.codewordId } }, (err, res) => {
                                    if (err) { console.log(err); }
                                });
                            }
                            if (len === operation.responses.length) {
                                resolve();
                            }
                        })
                    Codeword.findByIdAndUpdate(operation.codewordId, { $pull: { resToAssigned: ele } }, (err, res) => {
                        if (err) console.log(err);
                    })
                }).then(() => {

                    Question.findByIdAndUpdate(user.room, { $inc: { resOfCoded: -count } }, { new: true })
                        .exec((err, question) => {
                            if (err) { console.log(err); }
                            else {
                                //triger Response of Question coded to connect all users to this room
                                io.to(user.room).emit('question-response-coded', { resOfCoded: question.resOfCoded });
                            }
                        });
                    Codeword.findById(operation.codewordId)
                        .exec((err, result) => {
                            if (err) { console.log(err); }
                            else {
                                //triger Response of Question coded to connect all users to this room
                                io.to(user.room)
                                    .emit('codeword-assigned-to-response',
                                        { codewordId: result._id, resToAssigned: result.resToAssigned.length });
                            }
                        })
                })
            });
        });

        //for single selected response operation = { resNum, codewordIds:[arrayOfcodewordId]}
        socket.on('single-response-operation', async operation => {
            console.log({resNum:[operation.resNum],codewordIds:[operation.codewordIds]})
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //triger operation to connect all users to this room
            io.to(user.room).emit('single-operation', operation);
            //here also make change to db
            let idArray = [];
            new Promise(resolve => {
                Response.findOne({ resNum: operation.resNum, questionId: user.room }).exec((err, response) => {
                    if (err) { console.log(err); }
                    else {
                        idArray = response.codewords;
                        Response.findByIdAndUpdate(response._id, { $set: { codewords: operation.codewordIds  } }, (err, res) => {
                            if (err) { console.log(err); }
                            else {
                                // console.log("response:", res);
                                resolve();
                            }
                        });
                    }
                })


            }).then(async () => {

                if (idArray.length === 0) {
                    Question.findByIdAndUpdate(user.room, { $inc: { resOfCoded: 1 } }, { new: true })
                        .exec((err, question) => {
                            if (err) { console.log(err); }
                            else {
                                //triger Response of Question coded to connect all users to this room
                                io.to(user.room).emit('question-response-coded', { resOfCoded: question.resOfCoded });
                            }
                        });
                }
                //add new codeword
                const assigned = await operation.codewordIds.filter(id => {
                    if (idArray.find(ele => ele === id) === undefined) {
                        return true;
                    } else {
                        return false;
                    }
                })
                // console.log({assined,idArray,operation:operation.codewordIds});
                assigned.map(assignedId => {
                    Codeword.findByIdAndUpdate(assignedId, { $addToSet: { resToAssigned: operation.resNum } }, { new: true })
                        .exec((err, result) => {
                            if (err) { console.log(err); }
                            else {
                                //triger Response of Question coded to connect all users to this room
                                io.to(user.room)
                                    .emit('codeword-assigned-to-response',
                                        { codewordId: result._id, resToAssigned: result.resToAssigned.length });
                            }
                        })
                });
                //remove old codeword
                const deassigned = await idArray.filter(id => {
                    if (operation.codewordIds.find(ele => ele === id) === undefined) {
                        return true;
                    }
                    else {
                        return false;
                    }
                });
                // console.log({deassined,idArray,operation:operation.codewordIds});
                deassigned.map(deassignedId => {
                    Codeword.findByIdAndUpdate(deassignedId, { $pull: { resToAssigned: operation.resNum } }, { new: true })
                        .exec((err, result) => {
                            if (err) { console.log(err); }
                            else {
                                //triger Response of Question coded to connect all users to this room
                                io.to(user.room)
                                    .emit('codeword-assigned-to-response',
                                        { codewordId: result._id, resToAssigned: result.resToAssigned.length });
                            }
                        })
                });

            })
        });

        //Listen for Add new (codeword=>{projectCodebookId, codeword})
        socket.on('addCodeword', async newCodeword => {
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            console.log({ user });
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //here also make change to db
            const { projectCodebookId, codeword, categoryId } = newCodeword;
            const newcodeword = new Codeword({
                _id: new mongoose.Types.ObjectId(),
                tag: codeword
            }).save(async (err, result) => {
                if (!err) {
                    Codebook.findByIdAndUpdate(user.questionCodebookId, { $addToSet: { codewords: result._id }}, {new:true}, (err, res) => {
                        if (err) { console.log(err); }
                        else console.log("Codebook.findByIdAndUpdate(user.questionCodebookId-->",{res})
                    });
                    Codebook.findByIdAndUpdate(projectCodebookId, { $addToSet: { codewords: result._id } }, (err, res) => {
                        if (err) { console.log(err); }
                    });
                    if (categoryId === undefined) {
                        Question.findByIdAndUpdate(user.room, { $addToSet: { rootCodebook: result._id } }, (err, res) => {
                            if (err) { console.log(err); }
                        });
                    } else {
                        Folder.findByIdAndUpdate(categoryId, { $addToSet: { codewords: result._id } }, (err, res) => {
                            if (err) { console.log(err) }
                        });
                    }
                    //triger add new codeword to connect all users to this room
                    const leftMenuCodes=newCodeword.leftMenuCodes
                    io.to(user.room).emit('add-new-codeword-to-list', { codewordId: result._id, codeword: newCodeword.codeword, codekey: newCodeword.codekey ,leftMenuCodes:leftMenuCodes});
                    const Tree = await findStructure(user)
                    console.log({ Tree });
                    io.to(user.room).emit('root', Tree);

                } else {
                    console.log(err);
                    socket.emit('message', 'Someting went wrong during add new codeword');
                }
            });
        });

        //Listen for delete (codeword=>{codewordId})
        socket.on('deleteCodeword', async (deleteCodeword) => {
            const user = await getCurrentUser(socket.id);
            let responses;
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //here also make change to db
            const codewordId = deleteCodeword.codewordId;


            console.log("delete codeword socket triggered")
            console.log({codewordId})

            Codeword.findById(codewordId, (err, codeword) => {
                if (err) console.log(err);
                else {
                    let count = 0;
                    let qCount = 0;
                    responses = codeword.resToAssigned;
                    if(responses.length===0){
                        Codeword.findByIdAndRemove(codewordId, (err, res) => {
                            if (err) { console.log(err); }
                            else {
                                //triger delete codeword to connect all users to this room
                                io.to(user.room).emit('delete-codeword-to-list', { codewordId, responses });
                                Question.findByIdAndUpdate(user.room, { $inc: { resOfCoded: -qCount } }, { new: true })
                                    .exec(async (err, question) => {
                                        if (err) { console.log(err); }
                                        else {
                                            console.log("else in delete socket",{question})
                                            //triger Response of Question coded to connect all users to this room
                                            io.to(user.room).emit('question-response-coded', { resOfCoded: question.resOfCoded });

                                            const Tree = await findStructure(user)
                                            console.log({ Tree });
                                            io.to(user.room).emit('root', Tree);
                                        }
                                    });
                            }
                        });
                    }else {
                        new Promise(resolve => {
                            codeword.resToAssigned.map(resId => {
                                console.log("resNum:", resId);
                                Response.updateOne({ resNum: resId, questionId: user.room }, { $pull: { codewords: codewordId } }, (err, res) => {
                                    if (err) console.log(err);
                                    else {
                                        console.log("undijn",res);
                                        if (res.codewords!==undefined && res.codewords.length === 1) {
                                            qCount++;
                                        }
                                    }
                                    count++;
                                    if (count === codeword.resToAssigned.length) {
                                        resolve();
                                    }
                                })
                            })
                        }).then(() => {
                            Codeword.findByIdAndRemove(codewordId, (err, res) => {
                                if (err) { console.log(err); }
                                else {
                                    //triger delete codeword to connect all users to this room
                                    io.to(user.room).emit('delete-codeword-to-list', { codewordId, responses });
                                    Question.findByIdAndUpdate(user.room, { $inc: { resOfCoded: -qCount } }, { new: true })
                                        .exec(async (err, question) => {
                                            if (err) { console.log(err); }
                                            else {
                                                console.log("else in delete socket",{question})
                                                //triger Response of Question coded to connect all users to this room
                                                io.to(user.room).emit('question-response-coded', { resOfCoded: question.resOfCoded });
    
                                                const Tree = await findStructure(user)
                                                console.log({ Tree });
                                                io.to(user.room).emit('root', Tree);
                                            }
                                        });
                                }
                            });
    
                        }).catch(err => {
                            console.log({ err });
                            socket.emit('message', 'Someting went wrong during delete codeword');
                        })
                    }
                    

                }
            })

        });

        //Listen for edit (codeword=>{codeword, codewordId})
        socket.on('editCodeword', async (editCodeword) => {
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //here also make change to db
            const { codeword, codewordId ,oldName} = editCodeword;
            Codeword.findByIdAndUpdate(codewordId, { $set: { tag: codeword } }, (err, res) => {
                if (err) { console.log(err); }
            });
            //triger edit codeword to connect all users to this room
            const Tree = await findStructure(user)
            console.log({ Tree });
            io.to(user.room).emit('root', Tree);
            io.to(user.room).emit('edit-codeword-to-list', editCodeword);
        });

        //Listen for toggle (codeword=>{codewordId})
        socket.on('toggleCodeword', async (toggleCodeword) => {
            const user = await getCurrentUser(socket.id);
            //update status of cache update
            client.setex(`${user.projectId}=>status`, cacheTimeFullProject, 'true');
            //here also make change to db
            const codewordId = toggleCodeword.codewordId;
            Codeword.findByIdAndUpdate(codewordId, { $set: { active: !toggleCodeword.status } }, { new: true }, async (err, res) => {
                if (err) { console.log(err); }
                else {
                    //triger edit codeword to connect all users to this room
                    const Tree = await findStructure(user)
                    console.log({ Tree });
                    io.to(user.room).emit('root', Tree);

                    const response = res.resToAssigned;
                    const codewordName=res.tag
                    const keywords=toggleCodeword.keywords
                    const leftMenuCodes=toggleCodeword.leftMenuCodes
                    const status = toggleCodeword.status==true ? false : true
                    io.to(user.room).emit('toggle-codeword-to-list', { codewordId, response ,active: status ,codewordName:codewordName ,keywords:keywords,leftMenuCodes:leftMenuCodes});
                }
            });
        });

        //Listen for codeword add to category (assinedCodeword=>{codewordId, categoryId, categoryName})
        socket.on('assingedCodeword', async (assingedCodeword) => {
            const user = await getCurrentUser(socket.id);
            const codewordId = assingedCodeword.codewordId;
            const categoryId = assingedCodeword.categoryId;
            const categoryName = assingedCodeword.categoryName;
            console.log("assingedCodeword is triggered-->",{assingedCodeword})
            Question.findByIdAndUpdate(user.room, { $pull: { rootCodebook: codewordId }},{new:true}, (err, res) => {
                if (err) { console.log(err) }
                else {
                    console.log("res-->",{res})
                    if(categoryId!==undefined){
                        console.log({categoryId})
                        Folder.findByIdAndUpdate(categoryId, { $addToSet: { codewords: codewordId } },async(err, res) => {
                            if (err) { console.log(err) }
                            else {
                                const Tree = await findStructure(user)
                                console.log({res})
                                console.log({ Tree });
                                io.to(user.room).emit('root', Tree);
                            }
                        });
                    }else{
                        const newCategory = new Folder({
                            _id: new mongoose.Types.ObjectId(),
                            name: categoryName
                        }).save(async (err, category) => {
                            if (err) { console.log(err) }
                            else {
                                Question.findByIdAndUpdate(user.room, { $push: { root: category._id } }, async(err, res) => {
                                    if (err) { console.log(err) }
                                    else {
                                        const Tree = await findStructure(user)
                                        console.log({ Tree });
                                        io.to(user.room).emit('root', Tree);
                                    }
                                });
                                Folder.findByIdAndUpdate(category._id, { $addToSet: { codewords: codewordId } }, async(err, res) => {
                                    if (err) { console.log(err) }
                                    else {
                                        const Tree = await findStructure(user)
                                        console.log({res})
                                        console.log({ Tree });
                                        io.to(user.room).emit('root', Tree);
                                    }
                                });
                            }
                        });
                    }
                    
                }
            })
        });

        //Listen for codeword move  category1 to category2 (assinedCodeword=>{codewordId, categoryId1, categoryId2, categoryName})
        socket.on('moveCodeword', async (moveCodeword) => {
            const user = await getCurrentUser(socket.id);
            // const { codewordId, categoryId1, categoryId2 } = moveCodeword;
            const codewordId = moveCodeword.codewordId;
            const categoryId1 = moveCodeword.categoryId1;
            const categoryId2 = moveCodeword.categoryId2;
            const categoryName = moveCodeword.categoryName;

            console.log({moveCodeword})

            Folder.findByIdAndUpdate(categoryId1, { $pull: { codewords: codewordId } }, (err, res) => {
                if (err) { console.log(err) }
                else {
                    if(categoryId2!==undefined){
                        Folder.findByIdAndUpdate(categoryId2, 
                            { $addToSet: { codewords: codewordId } }, async(err, res) => {
                            if (err) { console.log(err) }
                            else {
                                const Tree = await findStructure(user)
                                console.log({ Tree });
                                io.to(user.room).emit('root', Tree);
                            }
                        });
                    }
                    else{
                        const newCategory = new Folder({
                            _id: new mongoose.Types.ObjectId(),
                            name: categoryName
                        }).save(async (err, category) => {
                            if (err) { console.log(err) }
                            else {

                                Question.findByIdAndUpdate(user.room, { $push: { root: category._id } }, async(err, res) => {
                                    if (err) { console.log(err) }
                                    else {
                                        const Tree = await findStructure(user)
                                        console.log({ Tree });
                                        io.to(user.room).emit('root', Tree);
                                    }
                                });

                                Folder.findByIdAndUpdate(category._id, 
                                    { $addToSet: { codewords: codewordId } }, async(err, res) => {
                                    if (err) { console.log(err) }
                                    else {
                                        const Tree = await findStructure(user)
                                        console.log({ Tree });
                                        io.to(user.room).emit('root', Tree);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        })

        //listen for create category 
        socket.on('createCategory', async (newCategory) => {
            const user = await getCurrentUser(socket.id);
            const { category } = newCategory;
            const newCat = new Folder({
                _id: new mongoose.Types.ObjectId(),
                name: category
            }).save(async (err, res) => {
                if (err) { console.log(err) }
                else {
                    Question.findByIdAndUpdate(user.room, { $push: { root: res._id } }, async(err, res) => {
                        if (err) { console.log(err) }
                        else {
                            const Tree = await findStructure(user)
                            console.log({ Tree });
                            io.to(user.room).emit('root', Tree);
                        }
                    });
                }
            })
        });

    })
}
