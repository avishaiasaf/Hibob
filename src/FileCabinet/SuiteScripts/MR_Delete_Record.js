/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: HB MR Generating Dig Signature	
 * Purpose 		: This script is Delete Record From Saved Search.
 * Script Type  : Map Reduce
 * Created On   : 
 * Script Owner : Daniel Starkman Daniel@finance4.cloud
 ********************************************************************/

 define(["N/url","N/record","N/search","N/render","N/email","N/runtime","N/file","N/https"],

 function(url,record,search,render,email,runtime,file,https) {

/**
* Marks the beginning of the Map/Reduce process and generates input data.
*
* @typedef {Object} ObjectRef
* @property {number} id - Internal ID of the record instance
* @property {string} type - Record type id
*
* @return {Array|Object|Search|RecordRef} inputSummary
* @since 2015.1
*/
function getInputData() {
 log.debug('Start','***** START *****');
 var scriptObj = runtime.getCurrentScript(); 
 var SearchID   = scriptObj.getParameter({name:'custscript_mr_search_data_delete'});

 return search.load({
     id: SearchID
 });
}



/**
* Executes when the reduce entry point is triggered and applies to each group.
*
* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
* @since 2015.1
*/
function reduce(context) {
    try{
        var recordId = context.key;
        var contObjText = JSON.parse(context.values[0])["values"];
        var scriptObj = runtime.getCurrentScript(); 
        var Record_Type = scriptObj.getParameter({name:'custscript_mr_type_delete'});
        log.debug({
            title: 'recordId',
            details: recordId
        });
        log.debug({
            title: 'contObjText',
            details: JSON.stringify(contObjText)
        });
        var Record_ID = contObjText.internalid.value
        record.delete({
            type: Record_Type,
            id: Record_ID
        })
        /*
        var recordType = contObjText["recordtype"];
        var documentNumber = contObjText["tranid"];
        var ILTransactionRecord = contObjText["custbody_il_transaction_state"]["value"]
        var entityID = contObjText["entity"]["value"];
        */
    }catch(e){
        log.error({
        title: 'Error Rec ID' + recordId,
        details: e
    })
    }

}
/**
* Executes when the summarize entry point is triggered and applies to the result set.
*
* @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
* @since 2015.1
*/
function summarize(summary) {
 log.debug('End','***** END *****');
}
return {
 getInputData: getInputData,
 //map: map,
 reduce: reduce,
 summarize: summarize
};

});