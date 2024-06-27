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
 * this script checks the latest created/modified customer records, if they are listed in the "Vendor Related Partners"
 * set the field VENDOR TO CHECK (custentity_acs_ven_to_check) equal TRUE
 *
 * Version          Date                        Author                  Remarks
 * 1.0              MAY 2023                    aelansri                Initial Version

 *//**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, runtime) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            var _LOGGER_TITLE = 'getInputData | ';
            log.audit(_LOGGER_TITLE, 'start');
            const script = runtime.getCurrentScript();
            const searchId = script.getParameter({name: 'custscript_ns_je_to_update_ss'});
            return {
                type: 'search',
                id: searchId
            };
            log.audit(_LOGGER_TITLE, 'end');
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            var _LOGGER_TITLE = 'map | ';
            log.audit(_LOGGER_TITLE, 'start');
            try {
                const result = JSON.parse(mapContext.value);
                log.audit(_LOGGER_TITLE, 'mapContext.value: ' + mapContext.value);
                log.audit(_LOGGER_TITLE, 'result: ' + JSON.stringify(result));
                var intRecordId = result.values["GROUP(internalid)"].value;
                var objJournalEntryRec = record.load({
                    type : record.Type.JOURNAL_ENTRY,
                    id : intRecordId
                });
                log.audit(_LOGGER_TITLE, 'intRecordId: ' + intRecordId );

                var intCreatedFromAllocation = objJournalEntryRec.getValue({fieldId: "parentexpensealloc"});
                log.audit(_LOGGER_TITLE, 'intCreatedFromAllocation: ' + intCreatedFromAllocation);
                if(intCreatedFromAllocation){
                    objJournalEntryRec.setValue({fieldId: "custbody_ns_allocation_schedule_ref", value: intCreatedFromAllocation});
                    var objAllocationSchedule = record.load({type: "allocationschedule", id: intCreatedFromAllocation})
                    var strUnitsType = objAllocationSchedule.getValue({fieldId: 'unitstype'});
                    log.audit(_LOGGER_TITLE, 'strUnitsType: ' + strUnitsType);
                    if(strUnitsType){
                        objJournalEntryRec.setText({fieldId: "custbody_acs_allocation_type", text: strUnitsType});
                    }
                }
                var intLineCount = objJournalEntryRec.getLineCount('line');
                log.debug('intLineCount', intLineCount);

                for(var i = 0; i < intLineCount; i++){
                    var strLineMemo = objJournalEntryRec.getSublistValue({sublistId:'line', fieldId: 'memo', line: i});
                    if(strLineMemo == "Allocation Source"){
                        objJournalEntryRec.setSublistValue({sublistId:'line', fieldId: 'custcol_allocation_source_account', line: i, value: true});
                    }
                }
                objJournalEntryRec.setValue({fieldId: "custbody_is_allocation_je", value: true});
                var intJournalEntryId = objJournalEntryRec.save();
                log.debug( _LOGGER_TITLE,"saved JE, intJournalEntryId: " + intJournalEntryId);

            } catch (e) {
                log.error({title: _LOGGER_TITLE, details: e.toString()});
            }

            log.audit(_LOGGER_TITLE, 'end');
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

        }


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

        }

        return {getInputData, map, /*reduce,*/ summarize}

    });
