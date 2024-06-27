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
 *
 *
 * Module Description:
 * custom copy of the standard page "manage pending charges"
 *
 * Version          Date                        Author                  Remarks
 * 1.0              FEB 2022                    aelansri                Initial Version

 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * ACS Project
 */

define(['N/record', 'N/currentRecord', 'N/url', 'N/format', 'N/https','N/ui/message'], function (record, currentRecord, url ,format,https, message) {

    var action;
    var GLOBAL_CONSTANTS = {
        suitelet: {
            scriptId: 'customscript_ns_sl_agent_payments',
            deploymentId: 'customdeploy_ns_sl_agent_payments'
        }
    };
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit() {
    }

    function reloadPage() {
        var objCurrentRecord = currentRecord.get();
        var strTransactionReference = objCurrentRecord.getValue({fieldId: 'custfield_tran_ref'});
        var intARAccountId = objCurrentRecord.getValue({fieldId: 'custfield_ar_account'});
        var intAccountId = objCurrentRecord.getValue({fieldId: 'custfield_account'});
        var fltPaymentAmount = objCurrentRecord.getValue({fieldId: 'custfield_payment_amount'});
        if (!strTransactionReference) {
            alert("Please enter value for: TRANSACTION REFERENCE");
            return;
        }
        if (!intARAccountId) {
            alert("Please enter value for: AR ACCOUNT");
            return;
        }


        var strSuiteletlink = url.resolveScript({
            scriptId: GLOBAL_CONSTANTS.suitelet.scriptId,
            deploymentId: GLOBAL_CONSTANTS.suitelet.deploymentId,
            params: {
                custfield_tran_ref: strTransactionReference,
                custfield_ar_account: intARAccountId,
                custfield_account: intAccountId,
                custfield_payment_amount: fltPaymentAmount
            }
        });
        setWindowChanged(window, false);
        if (strSuiteletlink) {
            window.location.replace(strSuiteletlink);
        }

    }

    function csvExport() {
        var objCurrentRecord = currentRecord.get();
        var intLineCount = objCurrentRecord.getLineCount('ns_apply_payments_sublist');
        if (intLineCount = 0) {
            alert("no results to export, please change the filters and retry");
            return;
        }
        objCurrentRecord.setValue({fieldId: 'custpage_action', value: "CSV_EXPORT"});
        jQuery('#main_form').submit();

    }

    /**
     * function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        var strSublistId = scriptContext.sublistId;
        var strFieldId = scriptContext.fieldId;
        var intLineNum = scriptContext.lineNum;
        console.log("strSublistId: " + strSublistId)
        console.log("strFieldId: " + strFieldId)
        console.log("intLineNum: " + intLineNum)
        if (strSublistId === 'ns_apply_payments_sublist' && (strFieldId === 'apply' || strFieldId === 'custfield_amount_to_apply')) {
            var objCurrentRecord = scriptContext.currentRecord;

            var blnApplied = objCurrentRecord.getCurrentSublistValue({sublistId: strSublistId, fieldId: strFieldId});
            var fltAppliedAmount = objCurrentRecord.getCurrentSublistValue({
                sublistId: strSublistId,
                fieldId: "custfield_amount_to_apply"
            });
            var fltAmountRemaining = objCurrentRecord.getCurrentSublistValue({
                sublistId: strSublistId,
                fieldId: "custfield_amount_remaining"
            });
            if (blnApplied && !fltAppliedAmount && fltAmountRemaining) {
                objCurrentRecord.setCurrentSublistValue({
                    sublistId: strSublistId,
                    fieldId: "custfield_amount_to_apply",
                    value: fltAmountRemaining,
                    //ignoreFieldChange: true
                });
            } else if (!blnApplied && fltAppliedAmount) {
                objCurrentRecord.setCurrentSublistValue({
                    sublistId: strSublistId,
                    fieldId: "custfield_amount_to_apply",
                    value: 0,
                    //ignoreFieldChange: true
                });
            }
            calcTotalAppliedAmount();
        }
    }
    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        var strSublistId = scriptContext.sublistId;
        var strFieldId = scriptContext.fieldId;
        var intLineNum = scriptContext.lineNum;
        console.log("strSublistId: " + strSublistId)
        console.log("strFieldId: " + strFieldId)
        console.log("intLineNum: " + intLineNum)
        if (strSublistId === 'ns_apply_payments_sublist' && strFieldId === 'custfield_amount_to_apply') {
            var objCurrentRecord = currentRecord.get();

            var fltAppliedAmount = objCurrentRecord.getCurrentSublistValue({sublistId: strSublistId, fieldId: strFieldId});
            var fltAmountRemaining = objCurrentRecord.getCurrentSublistValue({sublistId: strSublistId, fieldId: "custfield_amount_remaining"});
            if( fltAppliedAmount) {
                if (parseFloat(fltAppliedAmount) <= parseFloat(fltAmountRemaining)) {
                    return true;
                } else {
                    alert("Applied amount can't be greater than REMAINING AMOUNT");
                    objCurrentRecord.setCurrentSublistValue({sublistId: strSublistId, fieldId: strFieldId, value: fltAmountRemaining});
                    return false;
                }
            }
        }
        return  true;
    }
    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        var objCurrentRecord = currentRecord.get();
        var strAction= objCurrentRecord.getValue({fieldId:'custpage_action'})
        if (strAction == "refresh") {
            return true;
        }
        var intARAccountId = objCurrentRecord.getValue({fieldId: 'custfield_ar_account'});
        var intAccountId = objCurrentRecord.getValue({fieldId: 'custfield_account'});
        var fltPaymentAmount = objCurrentRecord.getValue({fieldId: 'custfield_payment_amount'});
        var fltAppliedAmount = objCurrentRecord.getValue({fieldId: 'custfield_applied_amount'});

        if(strAction != "CSV_EXPORT") {
            calcTotalAppliedAmount()
            if ((!intARAccountId || !intAccountId)) {
                alert("Please enter value for: ACCOUNT and/or AR ACCOUNT");
                return false;
            } else if (!fltPaymentAmount) {
                alert("Please enter value for: PAYMENT AMOUNT");
                return false;
            } else {
                var arrApplyPayments = []
                var intLineCount = objCurrentRecord.getLineCount({sublistId: 'ns_apply_payments_sublist'});

                for (var i = 0; i < intLineCount; i++) {
                    var blnApply = objCurrentRecord.getSublistValue({
                        sublistId: 'ns_apply_payments_sublist',
                        fieldId: 'apply',
                        line: i
                    });
                    if (blnApply) {
                        var strLineJsonData = objCurrentRecord.getSublistValue({
                            sublistId: 'ns_apply_payments_sublist',
                            fieldId: 'custfield_line_json_data',
                            line: i
                        });
                        if (strLineJsonData) {
                            arrApplyPayments.push(JSON.parse(strLineJsonData));
                        }
                    }
                }
                if (arrApplyPayments.length == 0) {
                    alert("Please select at least one line and retry")
                    return false;
                } else if (fltAppliedAmount != fltPaymentAmount) {
                    alert("The Payment amount must be equal to the sum of the applied amounts");
                    return false;
                }
            }
        }
        return true;
    }

    function backToStart() {
        var suiteletURL = url.resolveScript({
            scriptId: GLOBAL_CONSTANTS.suitelet.scriptId,
            deploymentId: GLOBAL_CONSTANTS.suitelet.deploymentId
        });
        window.open(suiteletURL, '_self', false);
    }
    function confirmAll(action) {
        var objCurrentRecord = currentRecord.get();
        var intLineCount = objCurrentRecord.getLineCount({
            sublistId: 'ns_apply_payments_sublist'
        });
        for (var i = 0; i < intLineCount; i++) {
            objCurrentRecord.selectLine({
                sublistId: 'ns_apply_payments_sublist',
                line: i
            });
            objCurrentRecord.setCurrentSublistValue({
                sublistId: 'ns_apply_payments_sublist',
                fieldId: 'apply',
                value: action == '1' ? true : false
            })

            objCurrentRecord.commitLine({
                sublistId: 'ns_apply_payments_sublist'
            });
        }
        calcTotalAppliedAmount()

    }

    function calcTotalAppliedAmount() {
        var objCurrentRecord = currentRecord.get();
        var fltAppliedAmount = 0;
        var intLineCount = objCurrentRecord.getLineCount({
            sublistId: 'ns_apply_payments_sublist'
        });
        for (var i = 0; i < intLineCount; i++) {
            objCurrentRecord.selectLine({
                sublistId: 'ns_apply_payments_sublist',
                line: i
            });
            var blnApply = objCurrentRecord.getCurrentSublistValue({
                sublistId: 'ns_apply_payments_sublist',
                fieldId: 'apply',
                //line: i
            });
            if (blnApply) {

                var fltCurrentLineAmount = objCurrentRecord.getCurrentSublistValue({
                    sublistId: 'ns_apply_payments_sublist',
                    fieldId: 'custfield_amount_to_apply',
                    //line: i,
                });
                fltAppliedAmount += fltCurrentLineAmount? parseFloat(fltCurrentLineAmount): 0;
            }
        }
        objCurrentRecord.setValue({fieldId: 'custfield_applied_amount', value:  fltAppliedAmount.toFixed(2), ignoreFieldChange: true});

    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        validateField: validateField,
        reloadPage: reloadPage,
        csvExport: csvExport,
        backToStart: backToStart,
        confirmAll: confirmAll,
    }
});