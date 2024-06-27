/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: HB UE Updating Custom Form Subsidiary
 * Purpose 		: Purpose: This script is used to update the custom form based on Subsidiary.
 * Script Type  : User Event
 * Created On   : 13/01/2022
 * Script Owner : 
 ********************************************************************/
define(['N/record', 'N/search'],

    function (record, search) {
        function beforeSubmit(scriptContext) {
            try {
                if (scriptContext.type == 'create') {
                    var recObj = scriptContext.newRecord;
                    var subsidiaryID = recObj.getValue({ fieldId: 'subsidiary' });
                    //Making Search on HB Invoice Subsidiary > Custom Form to retrieve custom form based on Subsidiary.
                    if (recObj.type == record.Type.INVOICE) {
                        var custFormSearchObj = search.create({
                            type: "customrecord_hb_invsub_customform",
                            filters: [["custrecord_hb_invsub_subsidiary", "anyof", subsidiaryID], "AND", ["custrecord_hb_inv_sub_custom_form", "noneof", "@NONE@"],
                                "AND", ["formulatext: {custrecord_hb_inv_sub_custom_form}", "contains", "Invoice"]],
                            columns: [search.createColumn({ name: "custrecord_hb_inv_sub_custom_form" }), search.createColumn({ name: "internalid", sort: search.Sort.DESC })]
                        });
                    }
                    if (recObj.type == record.Type.CREDIT_MEMO) {
                        var custFormSearchObj = search.create({
                            type: "customrecord_hb_invsub_customform",
                            filters: [["custrecord_hb_invsub_subsidiary", "anyof", subsidiaryID], "AND", ["custrecord_hb_inv_sub_custom_form", "noneof", "@NONE@"],
                                "AND", ["formulatext: {custrecord_hb_inv_sub_custom_form}", "contains", "Credit Memo"]],
                            columns: [search.createColumn({ name: "custrecord_hb_inv_sub_custom_form" }), search.createColumn({ name: "internalid", sort: search.Sort.DESC })]
                        });
                    }
                    var searchResultCount = custFormSearchObj.runPaged().count;
                    var customFormID = "";

                    if (searchResultCount > 0) {
                        custFormSearchObj.run().each(function (result) {
                            if (customFormID == "" || customFormID == null) {
                                customFormID = result.getValue({ name: "custrecord_hb_inv_sub_custom_form" });
                            }
                            if (customFormID != null && customFormID != undefined && customFormID != "") {
                                return false;
                            }
                            return true;
                        });
                        log.debug("customFormID :: ", customFormID);
                        recObj.setValue({
                            fieldId: 'customform',
                            value: customFormID,
                            ignoreFieldChange: true
                        });
                    }
                    if (subsidiaryID == 4 && recObj.type == record.Type.INVOICE){
                        var remain = recObj.getValue('origtotal2');
                        var fx = recObj.getValue('custbody_il_exchangerate');
                        recObj.setValue('custbody_cashapp_ils_amt',(remain * fx).toFixed(2));
                    }

                }
            } catch (er) {
                log.error("Error while updating custom form based on Subsidiary", er);
            }
        }

        return {

            beforeSubmit: beforeSubmit
        };

    });
