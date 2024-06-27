/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(
    [
        'N/error',
        'N/file',
        'N/record',
        'N/search',
        'N/runtime',
        'N/email'
    ],
    /**
 * @param{error} error
 * @param{file} file
 * @param{record} record
 * @param{search} search
 * @param{runtime} runtime
 * @param{email} email
 */
    (
        error,
        file,
        record,
        search,
        runtime,
        email
    ) => {

        const FIELDS_MAP = {
            HEADER: ["externalid","name","subsidiary","nextdate","subsequentdate","accountingbook","inactive","weightsource","datebasis","frequency","subsequentdate","allocationmode","creditentity","creditaccount","creditdepartment","creditclass","accountsfromsource"],
            SUBLISTS: {
                allocationsource: ["lineType","account","department","class","entity","weight","weightsinpercentage","index","fileName"],
                allocationdestination: ["lineType","account","department","class","entity","weight","weightsinpercentage","index","fileName"]
            },
            BOOLEAN:["inactive","weightsinpercentage","accountsfromsource"],
            DATE:["subsequentdate","nextdate"]
        };
        const OBJ_CONSTANTS = {
            ERRORS: {
                DONT_MOVE_FILES: [
                    'MISSING_FOLDER_TO_PROCESS',
                    'MISSING_FOLDER_PROCESSED',
                    'MISSING_FOLDER_IN_ERROR',
                    'MISSING_EMAIL_SENDER',
                    'MISSING_EMAIL_RECIPIENT',
                    'MISSING_EMAIL_TEMLPATE'
                ],
                ERROR_STRING_IN_TEMPLATE: 'ERROR_TEXT_DO_NOT_REMOVE',
                MISSING_FOLDER_TO_PROCESS: {
                    code: 'MISSING_FOLDER_TO_PROCESS',
                    text: 'Folder where files to process are taken from is missing. Please review the script parameter custscript_ns_bulk_lancost__to_proc_id on the deployment.',
                },
                MISSING_FOLDER_PROCESSED: {
                    code: 'MISSING_FOLDER_PROCESSED',
                    text: 'Folder where files processed are moved to is missing. Please review the script parameter custscript_ns_bulk_lancost__process_id on the deployment.'
                },
                MISSING_FOLDER_IN_ERROR: {
                    code: 'MISSING_FOLDER_IN_ERROR',
                    text: 'Folder where files in error are moved from is missing. Please review the script parameter custscript_ns_bulk_lancost__error_id on the deployment.'
                },
                MISSING_EMAIL_SENDER: {
                    code: 'MISSING_EMAIL_SENDER',
                    text: 'Sender of email notification is missing. Please review the script parameter custscript_ns_bulk_lancost_notify_sender on the deployment.'
                },
                MISSING_EMAIL_RECIPIENT: {
                    code: 'MISSING_EMAIL_RECIPIENT',
                    text: 'Recipient of email notification is missing. Please review the script parameter custscript_ns_bulk_lancost_notify_recipi on the deployment.'
                },
                MISSING_EMAIL_TEMLPATE: {
                    code: 'MISSING_EMAIL_TEMLPATE',
                    text: 'Template of email notification is missing. Please review the script parameter custscript_ns_bulk_lancost_notify_templt on the deployment.'
                },
                INVALID_CSV_FORMATTING: {
                    code: 'INVALID_CSV_FORMATTING',
                    text: 'Invalid formatting in the CSV, please build it starting from the sample provided.'
                },
                INVALID_ITEM_RECEIPT_ID: {
                    code: 'INVALID_ITEM_RECEIPT_ID',
                    text: 'Invalid Field ITEM RECEIPT ID provided in CSV, please ensure it is an integer number.'
                },
                INVALID_ITEM_RECEIPT_LINE_ID: {
                    code: 'INVALID_ITEM_RECEIPT_LINE_ID',
                    text: 'Invalid Field ITEM RECEIPT LINE ID provided in CSV, please ensure it is an integer number.'
                },
                INVALID_RATE: {
                    code: 'INVALID_RATE',
                    text: 'Invalid Field RATE provided in CSV, please ensure it is an integer number or it is empty.'
                },
                INVALID_LANDED_COST_CATEGORY: {
                    code: 'INVALID_LANDED_COST_CATEGORY',
                    text: 'Invalid Field LANDED COST CATEGORY provided in CSV, please ensure it is an integer number.'
                },
                INVALID_LANDED_COST_AMOUNT: {
                    code: 'INVALID_LANDED_COST_AMOUNT',
                    text: 'Invalid Field LANDED COST AMOUNT provided in CSV, please ensure it is an decimal or integer number.'
                },
                INVALID_ITEM_RECEIPT_LINE_ID_NOT_FOUND: {
                    code: 'INVALID_ITEM_RECEIPT_LINE_ID_NOT_FOUND',
                    text: 'Invalid Field provided in CSV, please ensure the item receipt line id specified is present on the record.'
                }
            },
            CSV_SEPARATORS: {
                ROW_SEPARATOR: '\r\n',
                COLUMN_SEPARATOR: ','
            }
        };
        function throwError(objErrorMessage) {
            log.error({
                title: objErrorMessage.code,
                details: objErrorMessage.text
            })
            throw error.create({
                name: objErrorMessage.code,
                message: objErrorMessage.text
            });
        }

        // -- GETINPUTDATA -- //

        const getInputData = () => {
            var arrCsvLines = getAllocationschedule();
            log.debug('getInputData', "arrCsvLines: " + JSON.stringify(arrCsvLines));

            return arrCsvLines
        }
        function getAllocationschedule() {
            log.audit('** getInputData - START **');
            var arrFilesToProcess = getFilesToProcess();
            return extractAllocationSchedFromFiles(arrFilesToProcess);
        }
        function getFilesToProcess() {
            var arrFilesToProcess = [];
            var strToProcessFolder = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_to_process_alllocation_sch'
            });
            var strProcessedFolder = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_processed_alllocation_sch'
            });
            var strInErrorFolder = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_error_allocation_sch'
            });
            var strEmailSender = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_bulk_lancost_notify_sender'
            });
            var strEmailRecipient = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_bulk_lancost_notify_recipi'
            });
            var strEmailTemplate = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_bulk_lancost_notify_templt'
            });
            if (!strToProcessFolder) {
                throwError(OBJ_CONSTANTS.ERRORS.MISSING_FOLDER_TO_PROCESS);
            }
            if (!strProcessedFolder) {
                throwError(OBJ_CONSTANTS.ERRORS.MISSING_FOLDER_PROCESSED);
            }
            if (!strInErrorFolder) {
                throwError(OBJ_CONSTANTS.ERRORS.MISSING_FOLDER_IN_ERROR);
            }

            var fileSearchObj = search.create({
                type: 'file',
                filters:
                    [
                        ['folder','anyof', strToProcessFolder],
                        'AND',
                        ['filetype','anyof','CSV']
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'name',
                            sort: search.Sort.ASC,
                            label: 'Name'
                        })
                    ]
            });
            fileSearchObj.run().each(function(result){
                arrFilesToProcess.push(result.id);
                return true;
            });
            log.audit('getFilesToProcess', "arrFilesToProcess:" + arrFilesToProcess);
            return arrFilesToProcess;
        }
        function extractAllocationSchedFromFiles(arrFilesToProcess) {
            var arrLandedCosts = [];
            for (const strFileId of arrFilesToProcess) {
                log.debug('extractAllocationSchedFromFiles', "strFileId: " + strFileId);

                var objFile = file.load({
                    id: strFileId
                });
                var strFileContent = objFile.getContents();
                validateFileContent(strFileContent);
                log.debug('extractAllocationSchedFromFiles', "strFileContent: " + strFileContent);

                var arrFileContent = convertCsv2Array(strFileContent, objFile.name, objFile.id);
                log.debug('extractAllocationSchedFromFiles', "arrFileContent: " + JSON.stringify(arrFileContent));

                arrLandedCosts = arrLandedCosts.concat(arrFileContent);
            }
            return arrLandedCosts;
        }
        function convertCsv2Array(strFileContent, fileName, fileId) {
            var arrRowsSplit = strFileContent.split(OBJ_CONSTANTS.CSV_SEPARATORS.ROW_SEPARATOR);
            arrRowsSplit = arrRowsSplit.filter(function (el) {
                return el;
            });
            var arrHeaders = arrRowsSplit[0].split(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR);
            arrRowsSplit.shift();// removing the headers
            return arrRowsSplit.map(function (strCsvRow, index) {
                return mapArrayHeaderToJSON(strCsvRow.split(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR), arrHeaders, index, fileName, fileId)
            });
        }
        function validateFileContent(strFileContent) {
            if (strFileContent.indexOf(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR) === -1 || strFileContent.indexOf(OBJ_CONSTANTS.CSV_SEPARATORS.ROW_SEPARATOR) === -1) {
                throwError(OBJ_CONSTANTS.ERRORS.INVALID_CSV_FORMATTING);
            }
        }
        function mapArrayHeaderToJSON(arrCsvLine, arrHeaders, index, fileName, fileId ) {
            var objCsvLine = {};
            arrHeaders.forEach(function (lineEntry, index) {
                objCsvLine[lineEntry] = arrCsvLine[index];
            });
            objCsvLine.index = index;
            objCsvLine.fileName = fileName;
            objCsvLine.fileId = fileId;

            return objCsvLine;
        }

        // -- MAP -- //

        const map = (mapContext) => {
            log.debug('mapContext', mapContext);
            var objCsvLine = JSON.parse(mapContext.value);
            var intAllocationScheduleExternalId = objCsvLine.fileId + "_" + objCsvLine.uniqueid;
            mapContext.write({
                key: intAllocationScheduleExternalId,
                value: objCsvLine
            });
        }

        // -- REDUCE -- //
        const reduce = (reduceContext) => {
            log.debug('reduceContext', reduceContext);
            createUpdateAllocationSchedule(reduceContext);
        }
        function createUpdateAllocationSchedule(reduceContext) {
            var headerError = '';
            var lineErrors = [];
            try {
                log.debug('strItemReceiptID', strItemReceiptID);
                var strItemReceiptID = reduceContext.key;
                var objContextValues = reduceContext.values.map(function (stringifiedObj) {
                    return JSON.parse(stringifiedObj);
                });
                var objAllocationSchedule = record.create({
                    type: record.Type.ALLOCATION_SCHEDULE
                });
                log.debug('reduce - item Receipt updated', "objContextValues: " + JSON.stringify(objContextValues));

                for (var fieldId of FIELDS_MAP.HEADER) {
                    if(objContextValues[0][fieldId]){
                        var fieldValue = objContextValues[0][fieldId];
                        if(FIELDS_MAP.BOOLEAN.indexOf(fieldId) != -1){
                            fieldValue = fieldValue.toLowerCase() == "true"
                        }else if(FIELDS_MAP.DATE.indexOf(fieldId) != -1) {
                            fieldValue = formatDate(fieldValue);
                        }
                        objAllocationSchedule.setValue({fieldId: fieldId, value: fieldValue});
                    }
                }
                for (var csvLine of objContextValues) {
                    var strLineType = csvLine["lineType"];
                    if(FIELDS_MAP.SUBLISTS[strLineType]){
                        for (var fieldId of FIELDS_MAP.SUBLISTS[strLineType]) {
                            if(csvLine[fieldId] && csvLine["line"]){
                                objAllocationSchedule.setSublistValue({
                                    sublistId:strLineType,
                                    fieldId: fieldId,
                                    value: csvLine[fieldId],
                                    line: csvLine["line"]
                                });
                            }
                        }
                    }else{
                        throw "ERROR: missing line type"
                    }
                }

                objAllocationSchedule.save({
                    ignoreMandatoryFields: true
                });
                log.debug('reduce - item Receipt updated', strItemReceiptID);
            } catch (e) {
                log.error('Error in Reduce Context - Body', e);
                headerError = e.message;
                reduceContext.write({
                    key: reduceContext.key + '_' + JSON.parse(reduceContext.values[0]).fileId,
                    value: headerError
                });
            }
            if (lineErrors.length > 0) {
                reduceContext.write({
                    key: reduceContext.key.toString() + '_LINE',
                    value: JSON.stringify(lineErrors)
                });
            }
        }

        // -- SUMMARIZE -- //

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            handleErrorIfAny(summaryContext);
        }

        function handleErrorIfAny(summary) {

            var inputSummary = JSON.stringify(summary.inputSummary.error);
            var intErrorFolder = parseInt( runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_error_allocation_sch'
            }));
            var intProcessedFolder = parseInt( runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_processed_alllocation_sch'
            }));
            var arrFilesToProcess = [];
            if (inputSummary && inputSummary !== 'null') {
                var isDontMoveFile = false;
                OBJ_CONSTANTS.ERRORS.DONT_MOVE_FILES.forEach(function (errorCode) {
                    if (inputSummary.indexOf(errorCode) !== -1) {
                        isDontMoveFile = true;
                    }
                });

                if (!isDontMoveFile){ // according to error
                    arrFilesToProcess = getFilesToProcess();
                    moveToFolder({
                        files: arrFilesToProcess,
                        folder: intErrorFolder
                    });
                }
                handleErrorAndSendNotification(inputSummary, 'getInputData');
                return; // if error in input stage, do not process errors in other stages
            }
            arrFilesToProcess = getFilesToProcess();

            var objErrorFile = handleErrorInStage(summary);
            log.debug('handleErrorIfAny', "PROCESSED FILES: " + JSON.stringify(arrFilesToProcess));

            if (objErrorFile !== undefined) {
                log.debug('handleErrorIfAny', "moveToFolder1: " + JSON.stringify({objErrorFile: objErrorFile,intErrorFolder: intErrorFolder}));
                moveToFolder({
                    files: objErrorFile.description.split(','),
                    folder: intErrorFolder
                });
                log.debug('handleErrorIfAny', "moveToFolder1: " + JSON.stringify({objErrorFile: arrFilesToProcess.filter(function (fileID) {
                        return objErrorFile.description.split(',').indexOf(fileID) === -1;
                    }),intProcessedFolder: intProcessedFolder}));
                moveToFolder({
                    files: arrFilesToProcess.filter(function (fileID) {
                        return objErrorFile.description.split(',').indexOf(fileID) === -1;
                    }),
                    folder: intProcessedFolder
                });
                handleErrorAndSendNotification(null, 'reduce', objErrorFile);
            } else {
                log.debug('handleErrorIfAny', "moveToFolder3: " + JSON.stringify({arrFilesToProcess: arrFilesToProcess,intProcessedFolder: intProcessedFolder}));

                moveToFolder({
                    files: arrFilesToProcess,
                    folder: intProcessedFolder
                });
            }
        }
        function handleErrorInStage(summary) {
            var errorMsg = [];
            var fileIds = [];
            summary.output.iterator().each(function (key, value){
                log.debug('Handle error in stage', [key, value]);
                if (key.indexOf('_LINE') === -1) {
                    //header error
                    errorMsg.push([key.split('_')[1],'','','','','','','',value].join(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR));
                    fileIds.push(key.split('_')[0]);
                } else {
                    var values = JSON.parse(value);
                    fileIds.push(key.split('_')[0]);
                    for (const objValue of values) {
                        errorMsg.push(getLandedCostArrayFromObj(objValue).join(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR));
                    }
                }
                return true;
            });
            if (!errorMsg.length) {
                log.audit('NO ERRORS, END SCRIPT');
                return;
            }
            var arrHeaders = [
                'EXTERNALID',
                'FILENAME',
                'FILEID',
                'ERROR'
            ];

            errorMsg.unshift(arrHeaders.join(OBJ_CONSTANTS.CSV_SEPARATORS.COLUMN_SEPARATOR));
            fileIds = fileIds.filter(onlyUnique);
            var errorText = errorMsg.join(OBJ_CONSTANTS.CSV_SEPARATORS.ROW_SEPARATOR);
            log.audit('errorText', errorText);

            var fileObj = file.create({
                name: 'error_report.csv',
                fileType: file.Type.CSV,
                contents: errorText,
                description: fileIds.join(','),
                encoding: file.Encoding.UTF8
            });
            return fileObj;
        }
        function handleErrorAndSendNotification(error, stage, objErrorFile) {
            log.error('Stage: ' + stage + ' failed', error);
            var senderId = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_bulk_lancost_notify_sender'
            });
            var arrRecipientEmails = runtime.getCurrentScript().getParameter({
                name: 'custscript_ns_error_notif_email'
            }).split(',');


            if (error === null || error === undefined || error === 'null') {
                error = '';
            }
            var subject = "import allocation schedule error"
            var body =  error;
            var arrAttachmentsToSend = [];
            log.debug('objErrorFile', objErrorFile);
            if (objErrorFile !== undefined && objErrorFile !== null) {
                arrAttachmentsToSend.push(objErrorFile);
            }

            email.send({
                author: -5,
                recipients: arrRecipientEmails,
                subject: subject + " - " + new Date().toString(),
                body: "body"  + " - " + new Date().toString(),
                attachments: arrAttachmentsToSend,
            });
            log.audit('Email Notification sent - END SCRIPT');
            return;
        }
        function moveToFolder({files, folder}) {
            files.forEach(function (strFileID) {
                if (strFileID) {
                    var objFile = file.load({id: strFileID});
                    objFile.folder = folder;
                    objFile.save();
                }
            });
        }


        function getLandedCostArrayFromObj(values) {
            var arrValues = [];
            Object.keys(values).forEach(function (key) {
                if (key !== 'undefined') {
                    arrValues.push(values[key]);
                }
            });
            return arrValues;
        }
        function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        }
        function formatDate(strDate) {
            var arrDate = strDate.split("/")
            return new Date(arrDate[2],arrDate[1] - 1, arrDate[0]);
        }

        return {getInputData, map, reduce, summarize}
    });
