const STATUS_CODE = require('../statusCode');
const logger = require('../logger'); ('../statusCode')
const Project = require('../models/project.model');
const Question = require('../models/question.model');
const Response = require('../models/response.model');
const Codeword = require('../models/codeword.model');
const { cacheTimeFullProject, cacheTimeForFilter } = require('../constant');
const client = require('../config/redis.config');
const {distance} = require('fastest-levenshtein')


function ASC(a, b) {
    if (a.desc < b.desc) {
        return -1;
    } else {
        return 1;
    }
}

function DESC(a, b) {
    if (a.desc > b.desc) {
        return -1;
    } else {
        return 1;
    }
}

function getIndicesOf(searchStr, str) {
    var startIndex = 0, index, indices = [];

    str = str.toLowerCase();
    searchStr = searchStr.toLowerCase();

    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        const fIndex = index;
        const lIndex = index + searchStr.length - 1;
        indices.push({ fIndex: fIndex, lIndex: lIndex, pattern: searchStr });
        startIndex = index + searchStr.length;
    }
    return indices;
}

const fiterByLengthAscOrder = async (result) => {
    return await result.sort((a, b) => parseFloat(a.length) - parseFloat(b.length));
}

const fiterByLengthDescOrder = async (result) => {
    return await result.sort((a, b) => parseFloat(b.length) - parseFloat(a.length));
}

const fiterByResponseAscOrder = async (result) => {
    return await result.sort(ASC);
}

const fiterByResponseDescOrder = async (result) => {
    return await result.sort(DESC);
}

const fiterByResponsePatternMatch = async (pattern, result) => {
    return await result.filter(({ resNum, desc, length, codewords, indices }) => {
        pattern = pattern.toLowerCase();
        if (desc.toLowerCase().indexOf(pattern) != -1) {
            return true;
        } else return false;
    }).map(({ resNum, desc, length, codewords, indices }) => {
        if (indices !== undefined) {
            indices = [...indices, ...getIndicesOf(pattern, desc)];
        } else {
            indices = [...getIndicesOf(pattern, desc)];
        }
        return { resNum, desc, length, codewords, indices };
    });
}

const fiterByResponsePatternExactMatch = async (pattern, result) => {
    return await result.filter(({ resNum, desc, length, codewords }) => {
        var regExp = new RegExp("^" + pattern + "$", 'i');
        if (desc.search(regExp) != -1) {
            return true;
        } else return false;
    }).map(({ resNum, desc, length, codewords }) => {
        return { resNum, desc, length, codewords };
    })
}

const fiterByResponseOnCodewordMatch = async (codeword, result) => {
    let temp1=[]
    var regExp = new RegExp("^" + codeword + "$", 'i');
    const filterFunction=({ resNum, desc, length, codewords }) => {
        if (codewords.length > 0) {
            codewords.map(it => {
                console.log(it.tag);
                if (it.tag.search(regExp) != -1) {
                    temp1.push({ resNum, desc, length, codewords })
                }//match return true
            })
        }
        return false;
    }
    await result.map(filterFunction)
    return temp1.map(({ resNum, desc, length, codewords }) => {
        return { resNum, desc, length, codewords };
    })
}

const filterByResponseOnCodewordGroupMatch = async (codewords, result) => {
    let temp1=[]
    var regExps = codewords.map(codeword => new RegExp("^" + codeword + "$", 'i'));

    const filterFunction=({ resNum, desc, length, codewords }) => {
        if (codewords.length > 0) {
            codewords.map(it => {
                console.log(it.tag);
                regExps.forEach(regExp => {
                    if (it.tag.search(regExp) != -1) {
                        temp1.push({ resNum, desc, length, codewords })
                    }//match return true
                })
                
            })
        }
        return false;
    }
    await result.map(filterFunction)
    return temp1.map(({ resNum, desc, length, codewords }) => {
        return { resNum, desc, length, codewords };
    })
}

const fiterByResponseOnCodewordDisMatch = async (codeword, result) => {
    return await result.filter(({ resNum, desc, length, codewords }) => {
        var regExp = new RegExp("^" + codeword + "$", 'i');
        if (codewords.length > 0) {
            codewords.map(it => {
                if (it.tag.search(regExp) != -1) return false; //match return false
            })
            return true; //given codeword not exists in all codewords return true
        }
        else{
            return false; // return false codewodrs empty
        }
    }).map(({ resNum, desc, length, codewords }) => {
        return { resNum, desc, length, codewords };
    })
}

const fiterByResponseWhichHaveNotAnyCodeword = async (result) => {
    return await result.filter(({ resNum, desc, length, codewords }) => {
        if (codewords.length === 0) {
            return true
        }
        else{
            return false;
        }
    }).map(({ resNum, desc, length, codewords }) => {
        return { resNum, desc, length, codewords };
    })
}

const filterByFilterColumnResponsePatternMatch = async (pattern, filter, result, data) => {
    const response = await fetchQuestionsResponse(JSON.parse(data), [{"questionId":filter}]);
    filterResult = response.map(({ resNum, desc, length, codewords }) => ({ resNum, desc}));

    resNumResult = await filterResult.filter(({ resNum, desc }) => {
        pattern = pattern.toLowerCase();
        if (desc.toLowerCase().indexOf(pattern) != -1) {
            return true;
        } else return false;
    }).map(({ resNum, desc}) => {
        return {resNum};
    });

    resNumResult = resNumResult.map(data => data.resNum);

    return await result.filter(({ resNum, desc, length, codewords, indices }) => {
        if (resNumResult.includes(resNum)) {
            return true;
        } else return false;
    }).map(({ resNum, desc, length, codewords, indices }) => {
        return { resNum, desc, length, codewords, indices };
    });
}

const filterByLevenshteinDistancePatternMatch = async (pattern, distance, result) => {
    pattern = pattern.toLowerCase();
    return await result.filter(({ resNum, desc, length, codewords, indices }) => {
        if (distance(desc, pattern)<=distance) {
            return true;
        } else return false;
    }).map(({ resNum, desc, length, codewords, indices }) => {
        if (indices !== undefined) {
            indices = [...indices, ...getIndicesOf(pattern, desc)];
        } else {
            indices = [...getIndicesOf(pattern, desc)];
        }
        return { resNum, desc, length, codewords, indices };
    });
}

const applyFilter = async (result, operators, data) => {
    for (let i = 0; i < operators.length; i++) {
        switch (operators[i].operator) {
            case 1:  //sort By Response Base On Length Asc Order
                result = await fiterByLengthAscOrder(result);
                break;
            case 2:  //sort By Response Base On Length Asc Order
                result = await fiterByLengthDescOrder(result);
                break;
            case 3: //sort By Response Base On Alphabet Asc Order
                result = await fiterByResponseAscOrder(result);
                break;
            case 4: //sort By Response Base On Alphabet Desc Order
                result = await fiterByResponseDescOrder(result);
                break;
            case 5:  //sort By Response Base On Pattern Including 
                result = await fiterByResponsePatternMatch(operators[i].pattern, result);
                break;
            case 6:  //sort By Response Base On ExactPattern Match
                result = await fiterByResponsePatternExactMatch(operators[i].pattern, result);
                break;
            case 7:  //sort By Response Base On Codeword Match
                result = await fiterByResponseOnCodewordMatch(operators[i].codeword, result);
                break;
            case 8:  //sort By Response Base On Codeword Match
                result = await fiterByResponseOnCodewordDisMatch(operators[i].codeword, result);
                break;
            case 9: // sort By Response Which Have Not Any Codeword
                result = await fiterByResponseWhichHaveNotAnyCodeword(result);
                break;
            case 10:
                result = await filterByResponseOnCodewordGroupMatch(operators[i].codewordGroup,result);
                break;
            case 11:
                result = await filterByFilterColumnResponsePatternMatch(operators[i].pattern, operators[i].filter, result, data);
            case 12:
                result = await filterByLevenshteinDistancePatternMatch(operators[i].pattern, operators[i].distance, result)
            default: //sort By Response Base On Length Asc Order
                result = await fiterByLengthAscOrder(result);

        }
    }
    // console.log({result});
    return result;
}


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

const fetchQuestionsResponse = async (data, questions) => {
    const result = await data.listOfQuestion
        .filter(ele => {
            for (let i = 0; i < questions.length; i++) {
                if (questions[i].questionId == ele._id) return true;
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
}

module.exports = {

    getResponse: (req, res) => {
        const projectId = req.body.projectId;
        const questions = req.body.questions;
        client.get(`${projectId}`, async (err, data) => {
            if (err) {
                res.status(STATUS_CODE.ServerError).send({ err });
            } else {
                if (data) {
                    client.get(`${projectId}=>status`, async (err, status) => {
                        if (err) { res.status(STATUS_CODE.ServerError).send({ err }); }
                        else {
                            if (status === 'false') {
                                logger.info("fetch data from cache");
                                const response = await fetchQuestionsResponse(JSON.parse(data), questions);
                                res.status(STATUS_CODE.Ok).send(
                                    response.map(({ resNum, desc, length, codewords,questionId }) => {
                                        return { resNum, desc, length, codewords,questionId };
                                    })
                                );
                            } else {
                                //data fetch from database and update cache
                                logger.info("load data from database and update cache");
                                //update status of cache update
                                client.setex(`${projectId}=>status`, cacheTimeFullProject, 'false');
                                const data = await fetchProjectDataFromDatabase(projectId);
                                client.setex(`${projectId}`, cacheTimeFullProject, JSON.stringify(data));
                                const response = await fetchQuestionsResponse(data, questions);
                                res.status(STATUS_CODE.Ok).send(
                                    response.map(({ resNum, desc, length, codewords,questionId }) => {
                                        return { resNum, desc, length, codewords,questionId };
                                    })
                                );
                            }
                        }
                    })
                } else {
                    //data fetch from database and update cache
                    logger.info("first time load data from database");
                    //update status of cache update
                    client.setex(`${projectId}=>status`, cacheTimeFullProject, 'false');
                    const data = await fetchProjectDataFromDatabase(projectId);
                    client.setex(`${projectId}`, cacheTimeFullProject, JSON.stringify(data));
                    const response = await fetchQuestionsResponse(data, questions);
                    // console.log({response});
                    res.status(STATUS_CODE.Ok).send(
                        response.map(({ resNum, desc, length, codewords,questionId }) => {
                            return { resNum, desc, length, codewords,questionId };
                        })
                    );
                }
            }
        });
    },

    operatorResponse: (req, res) => {
        const { projectId, questions, operators } = req.body;

        client.get(`${projectId}`, async (err, data) => {
            if (err) {
                res.status(STATUS_CODE.ServerError).send({ err });
            } else {
                if (data) {
                    client.get(`${projectId}=>status`, async (err, status) => {
                        if (err) { res.status(STATUS_CODE.ServerError).send({ err }); }
                        else {
                            if (status === 'false') {
                                logger.info("fetch data from cache");
                                const response = await fetchQuestionsResponse(JSON.parse(data), questions);
                                result = response.map(({ resNum, desc, length, codewords,questionId }) => ({ resNum, desc, length, codewords,questionId }));
                                const totalRes = result.length;
                                const filter = applyFilter(result, operators, data);
                                filter.then((filtered) => {
                                    res.status(STATUS_CODE.Ok).send({
                                        result: filtered,
                                        operatorRes: filtered.length,
                                        totalRes
                                    });
                                })
                            } else {
                                //data fetch from database and update cache
                                logger.info("load data from database and update cache for filter");
                                //update status of cache update
                                client.setex(`${projectId}=>status`, cacheTimeFullProject, 'false');
                                const data = await fetchProjectDataFromDatabase(projectId);
                                client.setex(`${projectId}`, cacheTimeFullProject, JSON.stringify(data));
                                const response = await fetchQuestionsResponse(data, questions);
                                result = response.map(({ resNum, desc, length, codewords,questionId }) => ({ resNum, desc, length, codewords,questionId }));
                                const totalRes = result.length;
                                const filter = applyFilter(result, operators, data);
                                filter.then((filtered) => {
                                    res.status(STATUS_CODE.Ok).send({
                                        result: filtered,
                                        operatorRes: filtered.length,
                                        totalRes
                                    });
                                })
                            }
                        }
                    });


                } else {
                    //data fetch from database and update cache
                    logger.info("first time load data from database for filter");
                    //update status of cache update
                    client.setex(`${projectId}=>status`, cacheTimeFullProject, 'false');
                    const data = await fetchProjectDataFromDatabase(projectId);
                    client.setex(`${projectId}`, cacheTimeFullProject, JSON.stringify(data));
                    const response = await fetchQuestionsResponse(data, questions);
                    result = response.map(({ resNum, desc, length, codewords,questionId }) => ({ resNum, desc, length, codewords,questionId }));
                    const totalRes = result.length;
                    const filter = applyFilter(result, operators, data);
                    filter.then((filtered) => {
                        console.log("hihisf",req.body);
                        client.setex(`${JSON.stringify(req.body)}`, cacheTimeForFilter, JSON.stringify(filtered));
                        res.status(STATUS_CODE.Ok).send({
                            result: filtered,
                            operatorRes: filtered.length,
                            totalRes
                        });
                    }).catch(err=>console.log(err))
                }
            }
        });
    }
}