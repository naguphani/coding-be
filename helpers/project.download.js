const mongoose = require('mongoose');
const excel = require('exceljs');
const responseHelper = require("./response.helper");
const projectHelper = require('./project.helper');
const codebookHelper = require('./codebook.helper')

// Create a connection to the MongoDB database

function createWorkbookAndWorksheet(questionIds){
    let workbook = new excel.Workbook(); //creating workbook
    let worksheets = [];

    questionIds.forEach(questionId => worksheets.push(workbook.addWorksheet(questionId)));


    return {
        workbook:workbook,
        worksheets:worksheets
    }
}



async function addColumnsToWorksheet(worksheet, codewords){

    const staticColumns = [
        { header: 'SNo', key: 'resNum', width: 10 },
        { header: 'Response', key: 'response', width: 30 },
    ];


    createColumn = function (codeword) {
        const newColumn = {
                header: codeword.tag,
                key: codeword.tag,
                width: 10
            }
        
        return newColumn;
    }

    const dynamicColumns = codewords.map(createColumn);
    
    // console.log(dynamicColumns)

    const allColumns = staticColumns.concat(dynamicColumns)

    // console.log(allColumns)

    worksheet.columns = allColumns ;

    return worksheet

}


async function addResponsesToWorksheet(worksheet,projectId,questionId,codewords){

    newRows = []

    const data = await projectHelper.getProjectData(projectId)
    const responseList = await responseHelper.fetchQuestionsResponse(data,[questionId]);
          
    var startDynamicRow = {}
    initRow = function (codeword) {
        startDynamicRow= {
            ...startDynamicRow,  
            ...{[codeword]: 0}
        }
    }
    codewords.map(codeword=>codeword.tag).forEach(initRow);

    var dynamicRows ;
    setRow = function (codeword) {
        dynamicRows= {
            ...dynamicRows,  
            ...{[codeword]: 1}
        }
    }

    for await (const response of responseList){
        
        const staticRows = {
            resNum: response.resNum,
            response: response.desc
        }
        
        let responseCodewords = response.codewords.map(codeword=>codeword.tag);

        // console.log(ansList)
        dynamicRows = startDynamicRow;
        responseCodewords.forEach(setRow);

        
        // console.log(dynamicRows)
        
        const allRows = {...staticRows,...dynamicRows}
        
        // console.log(allRows)
        
        newRows.push(allRows)

    }

    // console.log(newRows)

    worksheet.addRows(newRows) ;

}

async function saveWorkbook(workbook){
    return workbook.xlsx.writeFile("C:/Users/shrey/Documents/Startups/SurveyBuddy/Git/sb-backend/responses.xlsx")
}

async function saveFormResponsesToExcel(projectId,questionIds){

    out = createWorkbookAndWorksheet(questionIds) ;
    worksheets = out.worksheets

    for (let i = 0; i < questionIds.length; i++) {
        let worksheet = worksheets[i];
        let questionId = questionIds[i];

        const codewords = await codebookHelper.getCodebookFromQuestionId(questionId)

        worksheet = await addColumnsToWorksheet(worksheet,codewords);
        worksheet = await addResponsesToWorksheet(worksheet,projectId,questionId,codewords) ;
    
        worksheets[i]=worksheet;
    }

    return out;

}

module.exports = {
    saveFormResponsesToExcel:saveFormResponsesToExcel
}