/**
 * Copyright (c) 1998-2020 Oracle NetSuite GBU, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Oracle NetSuite GBU, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Oracle NetSuite GBU.
 */
/**
 * Module Description:
 *
 *
 * Version          Date                        Author                  Remarks
 * 1.0              JUN 2023                    aelansri                Initial Version

 */


/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/error', 'N/ui/serverWidget', 'N/file', 'N/xml', 'N/runtime', 'N/search', 'N/url', 'N/task', 'N/record'],
    function (error,serverWidget, file, xml, runtime, search, url, task, record) {
        var GLOBAL_CONSTANTS = {
            mainSearch: 'customsearch_ns_agent_payments_tran_ss',
            folderName: 'NS AGENT_PAYMENTS',
            storageFileName: 'USER_ID_ns_agent_payment_process.txt',
            mapReduceScriptId: 'customscript_ns_mr_agent_payments',
        };
        function onRequest(context) {
            var _LOGGER_TITLE = '' + context.request.method + ' |  ';
            log.debug(_LOGGER_TITLE, "START");
            log.debug(_LOGGER_TITLE + "context", "context: " + JSON.stringify(context));
            log.debug(_LOGGER_TITLE + "context", "context.request: " + JSON.stringify(context.request));
            var strAction = context.request.parameters.custpage_action;
            var intTaskId = context.request.parameters.custpage_taskid;
            var intStatusFileId = context.request.parameters.custpage_status_file_id;
            log.debug(_LOGGER_TITLE + "context", "intStatusFileId: " + intStatusFileId);
            log.debug(_LOGGER_TITLE + "context", "strAction: " + strAction);

            if (context.request.method === 'GET') {
                    createForm(context);
            }else if (context.request.method === 'POST'){
                if(strAction == "CSV_EXPORT"){
                    exportCSV(context);
                }else {
                    if (!intTaskId) {
                        var arrPaymentsToProcess = getSelectedPayments(context.request);
                        log.debug('transactionToBeProcessed', "arrPaymentsToProcess: " + JSON.stringify(arrPaymentsToProcess));

                        intStatusFileId = storeDataToProcessInFile(arrPaymentsToProcess);
                        intTaskId = submitMapReduceTask(intStatusFileId);
                    }
                    initiateRefreshForm(context, intTaskId, intStatusFileId);
                }
            }
            log.debug(_LOGGER_TITLE, "END");
        }

        /**
         *  Function which create initial Form
         */
        function createForm(context) {
            var _LOGGER_TITLE = 'createForm | ';
            log.audit(_LOGGER_TITLE, "START");
            var scriptObj = runtime.getCurrentScript();

            var strTransactionReference = context.request.parameters.custfield_tran_ref;
            var intARAccount = context.request.parameters.custfield_ar_account;
            var intAccount = context.request.parameters.custfield_account;
            log.debug(_LOGGER_TITLE + "strTransactionReference", strTransactionReference);
            log.debug(_LOGGER_TITLE + "intARAccount", intARAccount);
            log.debug(_LOGGER_TITLE + "intAccount", intAccount);
            var arrFilters = [];
            if (strTransactionReference) {
                var objTransactionReferenceFilter = search.createFilter({
                    name: 'memo',
                    operator: search.Operator.CONTAINS,
                    values: strTransactionReference
                });
                arrFilters.push(objTransactionReferenceFilter);
            }
            if (intARAccount) {
                var objAccountFilter = search.createFilter({
                    name: 'account',
                    operator: search.Operator.ANYOF,
                    values: intARAccount
                });
                arrFilters.push(objAccountFilter);
            }

            var form = serverWidget.createForm({
                title: 'Accept Agent Payment'
            });

            var intClientScriptId = scriptObj.getParameter({
                name: 'custscript_ns_batch_alloraction_cs_id'
            });
            form.clientScriptFileId = intClientScriptId;

            createFieldGroups(form)
            createHeaderButtons(form)
            createHeaderFields(form, context)



            var intTransactionSearchId = scriptObj.getParameter({
                name: 'custscript_ns_transaction_ss'
            });

            var arrOpenTransactions = arrFilters.length > 0 ? getAllTextResults({searchId: intTransactionSearchId, filters: arrFilters}) : [];

            var arrSublistColumnLabels = [];
            if(arrOpenTransactions.length > 0){
                for(key in arrOpenTransactions[0]){
                    if(arrSublistColumnLabels.indexOf(key) == -1 && key.indexOf("script_") == -1){
                        arrSublistColumnLabels.push(key);
                    }
                }
            }

            log.debug(_LOGGER_TITLE, "arrSublistColumnLabels: " + JSON.stringify(arrSublistColumnLabels))
            log.debug(_LOGGER_TITLE, "arrOpenTransactions: " + JSON.stringify(arrOpenTransactions))
            createSublist(form,arrSublistColumnLabels, arrOpenTransactions);

            context.response.writePage(form);

            log.audit(_LOGGER_TITLE, "END");
        }

        function exportCSV(context) {
            var _LOGGER_TITLE = 'exportCSV | ';
            log.audit(_LOGGER_TITLE, "START");
            var strSublistLabels = context.request.parameters.ns_apply_payments_sublistlabels;
            var strSublistData = context.request.parameters.ns_apply_payments_sublistdata;
            log.debug(_LOGGER_TITLE, "strSublistLabels: " + (strSublistLabels))
            log.debug(_LOGGER_TITLE, "strSublistData: " + (strSublistData))

            var strCSV = strSublistLabels + "\"\n\"" + strSublistData;
            var strCSVFormatted = strCSV.replace(/\u0001/g, '","').replace(/\u0002/g, '"\n\"').replace(/(<([^>]+)>)/ig, "") + '"';

            var objCSVFile = file.create({
                name: "agent_payments.csv",
                fileType: file.Type.CSV,
                contents: strCSVFormatted
            });
            context.response.writeFile({file: objCSVFile});
            log.audit(_LOGGER_TITLE, "END");

        }


        /**
         *  Function which create Header Fields
         */
        function createHeaderFields(form, context) {
            var _LOGGER_TITLE = 'createHeaderFields | ';
            log.audit(_LOGGER_TITLE, "START");
            var scriptObj = runtime.getCurrentScript();
            var intDefaultAccount = scriptObj.getParameter({name: 'custscript_ns_agent_p_account'});
            var intDefaultARAccount = scriptObj.getParameter({name: 'custscript_ns_agent_p_ar_account'});
            var intSubsidiaryId = context.request.parameters.custfield_subsidiary;
            var strNextDate = context.request.parameters.custfield_next_date;
            var intARAccountId = context.request.parameters.custfield_ar_account;
            var fltPaymentAmount = context.request.parameters.custfield_payment_amount;

            log.debug(_LOGGER_TITLE, "strTransactionReference: " + strTransactionReference);
            log.debug(_LOGGER_TITLE, "intAccountId: " + intAccountId);
            log.debug(_LOGGER_TITLE, "intDefaultAccount: " + intDefaultAccount);
            log.debug(_LOGGER_TITLE, "intARAccountId: " + intARAccountId);
            log.debug(_LOGGER_TITLE, "intDefaultARAccount: " + intDefaultARAccount);


            // TRANSACTION REFERENCE
            var fldSubsidiary = form.addField({
                id: 'custfield_subsidiary',
                type: serverWidget.FieldType.TEXT,
                label: 'Subsidiary',
                source: -117,
                container: 'grp_filters'
            });
            fldSubsidiary.isMandatory = true;
            if (intSubsidiaryId) {
                fldSubsidiary.defaultValue = intSubsidiaryId;
            }

            var fldNextDate = form.addField({
                id: 'custfield_next_date',
                type: serverWidget.FieldType.DATE,
                label: 'Next Date',
                container: 'grp_filters'
            });
            fldNextDate.isMandatory = true;
            if (strNextDate) {
                fldNextDate.defaultValue = strNextDate;
            }

            log.audit(_LOGGER_TITLE, "END");
        }

        /**
         *  Function which fieldGroups
         */
        function createFieldGroups(form) {
            var _LOGGER_TITLE = 'createHeaderButtons | ';
            log.audit(_LOGGER_TITLE, "START");
            form.addSubtab({
                id: 'tab_allocation_schedule',
                label: 'Allocation Schedule'
            });
            form.addFieldGroup({
                id: 'grp_filters',
                label: "Filters",
            });
            log.audit(_LOGGER_TITLE, "END");
        }
        /**
         *  Function which create Header Buttons
         */
        function createHeaderButtons(form) {
            var _LOGGER_TITLE = 'createHeaderButtons | ';
            log.audit(_LOGGER_TITLE, "START");
            form.addSubmitButton({
                id: 'btn_create_je',
                label: 'Submit'
            });
            log.audit(_LOGGER_TITLE, "END");
        }

        /**
         *  Function which create Sublist and sublistFields
         */
        function createSublist(form, arrHeaderLine,arrLines) {

            var _LOGGER_TITLE = 'createSublist | ';
            log.debug(_LOGGER_TITLE, "START");
            // Create Sublist
            var objSublist = form.addSublist({
                id: 'ns_apply_payments_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Sales Invoices',
                tab: "tab_apply"
            });
            objSublist.addButton({
                id : 'markall',
                label : 'Mark All',
                functionName: 'confirmAll(\'1\')'
            });
            objSublist.addButton({
                id : 'unmarkall',
                label : 'Unmark All',
                functionName: 'confirmAll(\'0\')'
            });

            objSublist.addField({
                id: 'apply',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Apply'
            });

            // Add sublist header line
            for(var i = 0; i < arrHeaderLine.length; i++){
                var strCurrentColumnLabel = arrHeaderLine[i];
                var objCurrentField=objSublist.addField({
                    id: 'custfield_' + i,
                    type: serverWidget.FieldType.TEXTAREA,
                    label: strCurrentColumnLabel
                });
                if(strCurrentColumnLabel.indexOf("_HIDDEN") > -1)
                {
                    objCurrentField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                }
            }
            var fldAmount =objSublist.addField({
                id: 'custfield_amount_to_apply',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Amount'
            });

            fldAmount.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.ENTRY
            });
            var fldAmountRemaining = objSublist.addField({
                id: 'custfield_amount_remaining',
                type: serverWidget.FieldType.TEXTAREA,
                label: "amount remaining hidden"
            });
            fldAmountRemaining.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var fldLineJsonData  = objSublist.addField({
                id: 'custfield_line_json_data',
                type: serverWidget.FieldType.TEXTAREA,
                label: "JSON hidden"
            });

            fldLineJsonData.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var fldCustomerId  = objSublist.addField({
                id: 'custfield_customer_id',
                type: serverWidget.FieldType.TEXTAREA,
                label: "customer"
            });

            fldCustomerId.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            for(var j = 0; j < arrLines.length; j++){
                var objCurrentLine = arrLines[j]
                objSublist.setSublistValue({
                    id: 'custfield_line_json_data' ,
                    line: j,
                    value: JSON.stringify(objCurrentLine)
                });
                for (var key in objCurrentLine) {
                    var intFieldIndex = arrHeaderLine.indexOf(key);
                    var strValue = objCurrentLine[key];
                    if(key == "Document Number") {
                        var intTransactionId = objCurrentLine["ID"];
                        if (intTransactionId) {
                            var strTransactionLink = '<a style="color: #255599;" "target="_blank" href="https://1127280-sb1.app.netsuite.com/app/accounting/transactions/transaction.nl?id=' + intTransactionId + '">' + strValue + '</a>'
                            strValue = strTransactionLink;
                        }
                    }
                    if(key == "Amount Remaining") {
                        var fltAmountRemaining = objCurrentLine["Amount Remaining"];
                        if (fltAmountRemaining) {
                            objSublist.setSublistValue({
                                id: 'custfield_amount_remaining' ,
                                line: j,
                                value: fltAmountRemaining
                            });
                        }
                    }

                    if(intFieldIndex != -1 && strValue){
                        objSublist.setSublistValue({
                            id: 'custfield_' + intFieldIndex,
                            line: j,
                            value: strValue
                        });
                    }
                }

            }
        }
        /**
         *  Function which returns all TEXT results of a NS saved search
         */
        function getAllTextResults(options) {
            var _LOGGER_TITLE = 'getAllTextResults | ';

            var strSearchId = options.searchId;
            var arrFilters = options.filters;

            var baseSearch = search.load({
                id: strSearchId
            });
            if (arrFilters && arrFilters.length > 0) {
                baseSearch.filters = arrFilters.concat(baseSearch.filters);
            }


            var searchResults = [];
            var start = 0;
            var partialResults = null;
            var baseSearchObj = baseSearch.run();
            var baseSearchColumns = baseSearchObj.columns;
            do {
                partialResults = baseSearchObj.getRange({
                    start: start,
                    end: start + 1000
                });
                if (partialResults) {
                    partialResults.forEach(function (currentResult) {
                        var currentLineObj = {};
                        //currentLineObj.recordType = currentResult.recordType;
                        //currentLineObj.id = currentResult.id;
                        baseSearchColumns.forEach(function (currentColumn) {
                            var columnLabel = currentColumn.label;
                            var columnName = currentColumn.name;
                            var columnId = columnLabel ? columnLabel : columnName;
                            var value = currentResult.getValue(currentColumn);
                            var text = currentResult.getText(currentColumn);

                            if (text) {
                                currentLineObj[columnId] = xml.escape({
                                    xmlText: text
                                });
                            } else {
                                if (typeof value == "string") {
                                    currentLineObj[columnId] = xml.escape({
                                        xmlText: value
                                    });
                                }else{
                                    currentLineObj[columnId] = value;
                                }
                            }
                        });
                        searchResults.push(currentLineObj);

                    });
                }
                start += 1000;
            } while (partialResults && partialResults.length >= 1000);
            log.debug(_LOGGER_TITLE, "searchResults: " + searchResults)

            return searchResults;
        }

        function getAllResults(baseSearch) {
            var searchResults = [];
            var start = 0;
            var partialResults = null;
            var baseSearchObj = baseSearch.run();
            var baseSearchColumns = baseSearchObj.columns;
            do {
                partialResults = baseSearchObj.getRange({
                    start: start,
                    end: start + 1000
                });

                if (partialResults) {
                    partialResults.forEach(function (currentResult) {
                        var currentLineObj = {};
                        currentLineObj.recordType = currentResult.recordType;
                        currentLineObj.id = currentResult.id;
                        baseSearchColumns.forEach(function (currentColumn) {
                            var columnName = currentColumn.name;
                            var join = currentColumn.join;
                            if (join) {
                                columnName = join + '_' + columnName;
                            }
                            currentLineObj[columnName] = currentResult.getValue(currentColumn);
                            currentLineObj[columnName + '_text'] = currentResult.getText(currentColumn);
                        });
                        searchResults.push(currentLineObj);

                    });
                }
                start += 1000;
            } while (partialResults && partialResults.length >= 1000);
            return searchResults;
        }

        function initiateRefreshForm(context, intTaskId, intStatusFileId) {
           var form = context.form;

            form = serverWidget.createForm({
                title: 'Accept Agent Payment - Job Status',
                hideNavBar: false
            });
            var scriptObj = runtime.getCurrentScript();

            var intClientScriptId = scriptObj.getParameter({
                name: 'custscript_ns_agent_payments_cs_id'
            });
            form.clientScriptFileId = intClientScriptId;
            var actionFld = form.addField({
                id: 'custpage_action',
                type: serverWidget.FieldType.TEXT,
                label: 'refresh'
            });
            actionFld.defaultValue = 'refresh';
            actionFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var statusFileIdFld = form.addField({
                id: 'custpage_status_file_id',
                type: serverWidget.FieldType.INTEGER,
                label: 'status file id'
            });
            statusFileIdFld.defaultValue = intStatusFileId;
            statusFileIdFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var taskIdField = form.addField({
                id: 'custpage_taskid',
                type: serverWidget.FieldType.TEXT,
                label: 'taskid'
            });
            taskIdField.defaultValue = intTaskId;
            taskIdField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var csvExportField = form.addField({
                id: 'custpage_csv_export',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'csv'
            });
            csvExportField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            addStatusInfo(form, intTaskId, intStatusFileId);
            form.addSubmitButton({
                label: 'Refresh'
            });
            form.addButton({
                id : 'backtostart',
                label : 'Back To Start',
                functionName: 'backToStart()'
            });
            //addErrorLogsSublist(form);
            context.response.writePage(form);
        }
        function addErrorLogsSublist(form) {
            var sublist;

            var scriptexecutionlogSearchObj = search.create({
                type: 'scriptexecutionlog',
                filters:
                    [
                        ['date','within','today'],
                        'AND',
                        ['type','anyof','ERROR', 'SYSTEM'],
                        'AND',
                        ['script.scriptid','startswith',GLOBAL_CONSTANTS.mapReduceScriptId]
                    ],
                columns:
                    [
                        search.createColumn({name: 'detail', label: 'Details'}),
                        search.createColumn({name: 'internalid', label: 'Internal ID'}),
                        search.createColumn({name: 'time', label: 'Time'})
                    ]
            });
            var searchResultCount = scriptexecutionlogSearchObj.runPaged().count;
            if (searchResultCount) {
                sublist = form.addSublist({
                    id: 'sublist_errors',
                    type : serverWidget.SublistType.LIST,
                    label : 'All today\'s errors logs'
                });
                sublist.addField({
                    id: 'sublist_errorid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Log ID'
                }).updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.INLINE
                });
                sublist.addField({
                    id: 'sublist_errortime',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Time'
                }).updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.INLINE
                });
                sublist.addField({
                    id: 'sublist_errorsmsg',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Error Message'
                }).updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.INLINE
                });
                var counter = 0;
                scriptexecutionlogSearchObj.run().each(function(result){
                    sublist.setSublistValue({
                        id: 'sublist_errorsmsg',
                        line: counter,
                        value: result.getValue('detail').slice(0,298)
                    });
                    sublist.setSublistValue({
                        id: 'sublist_errorid',
                        line: counter,
                        value: result.id
                    });
                    sublist.setSublistValue({
                        id: 'sublist_errortime',
                        line: counter,
                        value: result.getValue('time')
                    });
                    counter++;
                    return true;
                });
            }
        }
        function getFileContent(intFileId) {
            log.debug('getFileContent', 'intFileId: ' + intFileId);
            var objJobFile = file.load({
                id: intFileId
            });
            var strFileContent = objJobFile.getContents();
            return strFileContent
        }
        function addStatusInfo(form, intTaskId, intStatusFileId) {
            var taskStatus = task.checkStatus(intTaskId);
            var objStatusFld = form.addField({
                id: 'mrstatus',
                type: serverWidget.FieldType.TEXT,
                label: 'Process status',
            });
            var processStatus = taskStatus.status
            objStatusFld.defaultValue = processStatus;
            objStatusFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var strJobFileContent = getFileContent(intStatusFileId);
            if(strJobFileContent){
                var objJobFileContent = JSON.parse(strJobFileContent);
                if(objJobFileContent.results && objJobFileContent.results.length > 0 ){

                    var objSublist = form.addSublist({
                        id: 'sublist_customer_payments',
                        type : serverWidget.SublistType.LIST,
                        label : 'Generated Payments'
                    });
                    objSublist.addField({
                        id: 'custpage_customer',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Customer'
                    }).updateDisplayType({
                        displayType : serverWidget.FieldDisplayType.INLINE
                    });
                    objSublist.addField({
                        id: 'custpage_customer_payment',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Customer Payment'
                    }).updateDisplayType({
                        displayType : serverWidget.FieldDisplayType.INLINE
                    });

                    for (var i = 0; i < objJobFileContent.results.length; i++) {
                        var objCurrentResult = objJobFileContent.results[i];
                        log.debug('storeDataToProcessInFile - i', i);
                        log.debug('storeDataToProcessInFile - objCurrentResult.strCustomerName', objCurrentResult.strCustomerName);
                        log.debug('storeDataToProcessInFile - objCurrentResult.intPaymentId', objCurrentResult.intPaymentId);
                        if (objCurrentResult.intPaymentId) {
                            objSublist.setSublistValue({

                                id: 'custpage_customer',
                                line: i,
                                value: objCurrentResult.strCustomerName
                            });
                            var strOpportunityLink = '<a target="_blank" href="/app/accounting/transactions/custpymt.nl?id=' + objCurrentResult.intPaymentId + '">' + objCurrentResult.intPaymentTranId + '</a>'
                            objSublist.setSublistValue({
                                id: 'custpage_customer_payment',
                                line: i,
                                value: strOpportunityLink
                            });
                        }
                    }

                }
            }
        }


        function getSelectedPayments(request) {
            var arrPaymentsToProcess = [];
            var strTransactionReference = request.parameters.custfield_tran_ref;
            var intAccountId = request.parameters.custfield_account;
            var intARAccountId = request.parameters.custfield_ar_account;
            var fltPaymentAmount = request.parameters.custfield_payment_amount;
            var lineCount = request.getLineCount({
                group: 'ns_apply_payments_sublist'
            });
            log.debug('getSelectedTransactions', "lineCount: " + lineCount);
            log.debug('getSelectedTransactions', "params: " + JSON.stringify({
                strTransactionReferenc: strTransactionReference,
                intAccountId: intAccountId,
                intARAccountId: intARAccountId,
                fltPaymentAmount: fltPaymentAmount,
                objCurrentLineJsonData: objCurrentLineJsonData,
            }));

            for(var i = 0; i<lineCount; i++){
                var isMarked = request.getSublistValue({
                    group: 'ns_apply_payments_sublist',
                    name: 'apply',
                    line: i
                });
                log.debug('getSelectedTransactions', "isMarked: " + isMarked);

                if (isMarked === 'T') {
                    var strCurrentLineJsonData = request.getSublistValue({
                        group: 'ns_apply_payments_sublist',
                        name: 'custfield_line_json_data',
                        line: i
                    });
                    var objCurrentLineJsonData = JSON.parse(strCurrentLineJsonData)
                    var fltApplyAmount = request.getSublistValue({
                        group: 'ns_apply_payments_sublist',
                        name: 'custfield_amount_to_apply',
                        line: i
                    });


                    if (objCurrentLineJsonData) {
                        var objToPush = {
                            strTransactionReferenc: strTransactionReference,
                            intAccountId: intAccountId,
                            intARAccountId: intARAccountId,
                            fltPaymentAmount: fltPaymentAmount,
                            fltApplyAmount: fltApplyAmount,
                            intCustomerId: objCurrentLineJsonData["Customer_ID_HIDDEN"],
                            objCurrentLineJsonData: objCurrentLineJsonData
                        };
                        arrPaymentsToProcess.push(objToPush);
                    }
                }
            }
            log.debug('arrPaymentsToProcess', arrPaymentsToProcess);
            return arrPaymentsToProcess;
        }
        function storeDataToProcessInFile(dataToProcess) {
            var intCurrentUserId = runtime.getCurrentUser().id
            var fileContent = JSON.stringify({dataToProcess: dataToProcess, results:[]});
            var fileObj = file.create({
                name: GLOBAL_CONSTANTS.storageFileName.replace("USER_ID", intCurrentUserId),
                fileType: file.Type.PLAINTEXT,
                contents: fileContent,
                description: 'This is a plain text file.',
                encoding: file.Encoding.UTF8
            });
            var folderId = getFolderByName(GLOBAL_CONSTANTS.folderName);
            log.debug('storeDataToProcessInFile - folderId', folderId);
            fileObj.folder = folderId;
            return fileObj.save();
        }
        function submitMapReduceTask(processDataFileId) {
            var scriptId = GLOBAL_CONSTANTS.mapReduceScriptId;

            var scrMR = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: scriptId,
                params: {
                    'custscript_ns_payment_file_id': processDataFileId,
                }
            });
            var intTaskId = scrMR.submit();
            log.debug('Map Reduce Task Submitted', scrMR);
            return intTaskId;
        }
        //UTILS
        function getFolderByName(folderName) {
            var folderId;
            var folderSearchObj = search.create({
                type: 'folder',
                filters:
                    [
                        ['name', 'is', folderName]
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
            folderSearchObj.run().each(function(result){
                folderId = result.id;
                return true;
            });
            if (!folderId) {
                throw error.create({
                    name: 'WRONG_FOLDER_PARAMETER',
                    message: 'Error. Folder not found. Please access script deployment page and fill in NS | BULK JE SET APPROVER FOLDER field correctly.',
                    notifyOff: true
                });
            }
            return folderId;
        }

        function getBankAccountList(folderName) {
            var accountSearchObj = search.create({
                type: "account",
                filters:
                    [
                        ["type","anyof","Bank"]
                    ],
                columns:
                    [
                        "internalid",
                        search.createColumn({
                            name: "displayname",
                            sort: search.Sort.ASC
                        })
                    ]
            });
            return getAllResults(accountSearchObj);
        }
        return {
            onRequest: onRequest
        };
    });

