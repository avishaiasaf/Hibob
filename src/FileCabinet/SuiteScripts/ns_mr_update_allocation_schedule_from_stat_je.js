/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Module Description:
 *
 *
 * Version    	Date            	Author          Remarks
 * 1.00       	APR  2023           alansari		Initial Development
 **/
/**
 * @param{error} error
 * @param{file} file
 * @param{record} record
 * @param{search} search
 * @param{runtime} runtime
 * @param{email} email
 */
define(
    ['N/error', 'N/file', 'N/record', 'N/search', 'N/runtime', 'N/email'],
    (error, file, record, search, runtime, email) => {

        // -- GETINPUTDATA -- //

        const getInputData = () => {
            var _LOGGER_TITLE = 'getInputData | ';
            log.audit(_LOGGER_TITLE, 'start');
            var objCurrentScript = runtime.getCurrentScript();
            var intSavedSearchId = objCurrentScript.getParameter({name: 'custscript_ns_journal_entry_ss'});
            log.debug(_LOGGER_TITLE + ' - params', 'intSavedSearchId: ' + intSavedSearchId);
            log.audit(_LOGGER_TITLE, 'end');
            return search.load({id: intSavedSearchId});w
        }

        // -- MAP -- //

        const map = (mapContext) => {
            var _LOGGER_TITLE = 'map | ';
            log.audit(_LOGGER_TITLE, 'start');
            log.audit(_LOGGER_TITLE + 'mapContext', mapContext);
            log.debug(_LOGGER_TITLE + 'mapContext.value', mapContext.value);
            try {
                var objSearchResData = JSON.parse(mapContext.value);
                var intAllocationScheduleId = objSearchResData.values["GROUP(custbody_ns_allocation_schedule_ref)"].value;
                mapContext.write({
                    key: intAllocationScheduleId,
                    value: objSearchResData
                });

            }catch (exc){
                log.error( _LOGGER_TITLE + 'ERROR', JSON.stringify(exc));
            }
            log.debug(_LOGGER_TITLE , "end");

        }

        // -- REDUCE -- //
        const reduce = (reduceContext) => {
            var _LOGGER_TITLE = 'reduce | ';
            log.audit(_LOGGER_TITLE, 'start');

            var intAllocationScheduleId = reduceContext.key;
            var objContextValues = reduceContext.values.map(function (stringifiedObj) {
                return JSON.parse(stringifiedObj);
            });
            var objAllocationScheduleRec = record.load({
                type: record.Type.ALLOCATION_SCHEDULE,
                id: intAllocationScheduleId
            });
            for(line of objContextValues){
                var intDepartmentId =  line.values['GROUP(department)'].value;
                var fltNewWeight =  line.values['SUM(amount)'];

                var intLineToUpdate = objAllocationScheduleRec.findSublistLineWithValue({
                    sublistId: 'allocationdestination',
                    fieldId: 'department',
                    value: intDepartmentId
                });
                log.debug(_LOGGER_TITLE , "intDepartmentId: " + intDepartmentId + ", fltNewWeight: " + fltNewWeight+ ", intLineToUpdate: " + intLineToUpdate);
                if(intLineToUpdate >= 0 && fltNewWeight) {
                    objAllocationScheduleRec.setSublistValue({
                        sublistId: 'allocationdestination',
                        fieldId: 'weight',
                        line: intLineToUpdate,
                        value: fltNewWeight
                    });
                }
            }
            var intSavedRecord = objAllocationScheduleRec.save();

            log.debug(_LOGGER_TITLE , "strItemReceiptID: " + intSavedRecord);
            log.debug(_LOGGER_TITLE , "end");

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
            var _LOGGER_TITLE = 'summarize | ';
            log.audit(_LOGGER_TITLE, "START");

            var intReduceKeysProcessed = 0;
            summaryContext.reduceSummary.keys.iterator().each(function (key, executionCount, completionState) {
                if (completionState === 'COMPLETE') {
                    intReduceKeysProcessed++;
                }
                return true;
            });

            var intMapKeysProcessed = 0;
            summaryContext.mapSummary.keys.iterator().each(function (key, executionCount, completionState) {
                if (completionState === 'COMPLETE') {
                    intMapKeysProcessed++;
                }
                return true;
            });

            log.audit('Total seconds elapsed', summaryContext.seconds);
            log.audit('Total usage', summaryContext.usage);
            log.audit('Total yields', summaryContext.yields);
            log.audit({
                title: 'Reduce key statistics',
                details: 'Total number of reduce keys processed successfully: ' + intReduceKeysProcessed
            });
            log.audit({
                title: 'Map key statistics',
                details: 'Total number of map keys processed successfully: ' + intMapKeysProcessed
            });

            summaryContext.reduceSummary.errors.iterator().each(function (key, objError) {
                var errorObject = JSON.parse(objError);
                log.error({
                    title: 'Reduce error for key: ' + key,
                    details: errorObject.name + ': ' + errorObject.message
                });
                return true;
            });

            summaryContext.mapSummary.errors.iterator().each(function (key, objError) {
                var errorObject = JSON.parse(objError);
                log.error({
                    title: 'Map error for key: ' + key,
                    details: errorObject.name + ': ' + errorObject.message
                });
                return true;
            });

            log.audit(_LOGGER_TITLE, "END");
        }

        return {getInputData, map, reduce, summarize}
    });



