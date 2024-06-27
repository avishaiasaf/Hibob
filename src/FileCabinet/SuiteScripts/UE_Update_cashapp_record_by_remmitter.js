/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query','N/runtime', 'N/log'],
    function (record, error, search, format, task,query,runtime,log) {
        var exports = {}
        function beforeload(context) {
        }
        function beforesubmit(context) {
            var Record = context.newRecord;
            var cust = Record.getValue('custrecord_crossref_netsuite_customer');
            if(isNullOrEmpty(cust)){
                var created_from = Record.getValue('custrecord_crossref_created_from');
                var remitter_name = Record.getValue('custrecord_crossref_remitter_name').split(" ")[0];
                var subsidiary = Record.getValue('custrecord_ref_sub');
                if (!isNullOrEmpty(remitter_name) && !isNullOrEmpty(subsidiary)){
                    var customerSearchObj = search.create({
                        type: "customer",
                        filters:
                        [
                            ["companyname","contains",remitter_name], 
                            "AND", 
                            ["subsidiary","anyof",subsidiary],
                            "AND", 
                            ["isinactive","is","F"]
                        ],
                        columns:
                        [
                           "companyname"
                        ]
                     });
                    var searchResultCount = customerSearchObj.runPaged().count;
                    log.debug({
                        title: 'searchResultCount',
                        details: searchResultCount
                    })
                    if (searchResultCount == 1 ){
                        customerSearchObj.run().each(function(result){
                            Record.setValue('custrecord_crossref_netsuite_customer',result.id);
                            Record.setText('custrecord_ref_remitter_found_ns','T');
                            var id = record.submitFields({
                                type: 'customrecord_hb_ar_bank_files',
                                id: created_from ,
                                values: {
                                    custrecord_hb_cashapp_process_status: 1 ,
                                    custrecord_hb_matching_logic_notes : 'Remitter matched by Internal search - Retry'
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields : true
                                }
                            });
                            log.debug('Update Rec Id' , id);
                            return true;
                         });
                    }
                }
            }  
        }
        function afersubmit(context) {
        var Rec_ID = context.newRecord.id;
        var Record = context.newRecord;
        var resultvalue = {}  
        var created_from = Record.getValue('custrecord_crossref_created_from');
        var bank_status = Record.getValue('custrecord_crossref_status_bank')
        if (!isNullOrEmpty(created_from) && bank_status == 2){
            var bank_ref = Record.getValue('custrecord_ref_bank_ref_code');
            if (!isNullOrEmpty(bank_ref)){
                var cust = Record.getValue('custrecord_crossref_netsuite_customer');
                resultvalue.custrecord_hb_cashapp_process_status = 117 //Pending Cash - Customer Matched by Counter Account Logic
                resultvalue.custrecord_hb_matching_logic_notes = 'Remitter Manually Matched by Account ' 
                resultvalue.custrecord_hb_matched_cust = cust
            }else{
                resultvalue.custrecord_hb_cashapp_process_status = 1 // Pending Cash Application
                resultvalue.custrecord_hb_matching_logic_notes = 'Remitter Manually Matched - Retry' 
            }
            var id = record.submitFields({
                type: 'customrecord_hb_ar_bank_files',
                id: created_from ,
                values: resultvalue ,
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });
            log.debug('Record edit Sync ID',id);    
            }
        }
        function isNullOrEmpty(val) {
            if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
            }
        return false;
        }
        function FormatDate(date) {
            var parsedDate = format.parse({
                value: date,
                type: format.Type.DATE
           });
        return parsedDate
        }
        function getListValueId(list, listValueScriptId) {
            var listValueId = null;
             
            search.create({
                type: list,
                columns: [
                    'internalid',
                    'scriptid'
                ]
            }).run().each(function(result) {
                // Note: From tests, the script ID from the search results are always uppercase.
                if (result.getValue("scriptid") === listValueScriptId.toUpperCase()) {
                    listValueId = result.getValue('internalid');
                }
                // Stop iterating when we find the target ID.
                return (listValueId === null);
            });
          
            return listValueId;
        }
        //exports.beforeLoad = beforeload
        exports.beforeSubmit = beforesubmit
        exports.afterSubmit = afersubmit
    return exports
    }
);
  