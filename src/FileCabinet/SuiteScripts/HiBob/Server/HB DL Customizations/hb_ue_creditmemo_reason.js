/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/runtime'],

    function (record, search, runtime) {

        function afterSubmit(scriptContext) {
            try {
                if (scriptContext.type == 'edit') {

                    var recObjNew = scriptContext.newRecord;
                    var recObjOld = scriptContext.oldRecord;
                    if (recObjNew.getValue('custrecordzab_c_transaction') != recObjOld.getValue('custrecordzab_c_transaction') && recObjNew.getValue('custrecordzab_c_transaction')) {
                        var scriptObj = runtime.getCurrentScript();

                        var transactionText = recObjNew.getText('custrecordzab_c_transaction');
                        if (transactionText) {
                            transactionText = transactionText.toString();
                            if (transactionText.indexOf('Credit Memo') == -1)
                                return;
                        }

                        var customrecordzab_chargeSearchObj = search.create({
                            type: "customrecordzab_charge",
                            filters: [["internalid", "anyof", recObjNew.id], "AND", ["custrecordzab_c_transaction.mainline", "is", "T"]],
                            columns: [
                                search.createColumn({ name: "custrecordzab_c_credit_rebill_state" }),
                                search.createColumn({ name: "custrecord_hb_line_business_type", join: "CUSTRECORDZAB_C_SUBSCRIPTION_ITEM" }),
                                search.createColumn({ name: "custbodycustbody_il_credit_reason", join: "CUSTRECORDZAB_C_TRANSACTION" }),
                                search.createColumn({ name: "custrecordzab_c_transaction" })
                            ]
                        });
                        var searchResultCount = customrecordzab_chargeSearchObj.runPaged().count;
                        var cm_reason = '';

                        if (searchResultCount > 0) {
                            var searchResults = customrecordzab_chargeSearchObj.run().getRange(0, 1);

                            var cmId = searchResults[0].getValue({ name: "custrecordzab_c_transaction" });

                            if (searchResults[0].getValue({ name: "custbodycustbody_il_credit_reason", join: "CUSTRECORDZAB_C_TRANSACTION" }) == scriptObj.getParameter({ name: 'custscript_cm_reason_downsell' })
                                || searchResults[0].getValue({ name: "custbodycustbody_il_credit_reason", join: "CUSTRECORDZAB_C_TRANSACTION" }) == scriptObj.getParameter({ name: 'custscript_cm_reason_reissue' }))
                                return;


                            if (searchResults[0].getText({ name: "custrecordzab_c_credit_rebill_state" }) == '' && searchResults[0].getText({ name: "custrecord_hb_line_business_type", join: "CUSTRECORDZAB_C_SUBSCRIPTION_ITEM" }) == 'Downsell')
                                cm_reason = scriptObj.getParameter({ name: 'custscript_cm_reason_downsell' });
                            else
                                cm_reason = scriptObj.getParameter({ name: 'custscript_cm_reason_reissue' });


                            if (cm_reason) {
                                record.submitFields({
                                    type: record.Type.CREDIT_MEMO,
                                    id: cmId,
                                    values: { custbodycustbody_il_credit_reason: cm_reason }
                                });
                                log.debug('CM Updated for charge - ' + recObjNew.id, cmId)
                            }

                        }
                    }




                }
            } catch (err) {
                log.error("Error while updating credit memo reason for charge : " + recObjNew.id, err);
            }
        }


        return {
            afterSubmit: afterSubmit
        };

    });
