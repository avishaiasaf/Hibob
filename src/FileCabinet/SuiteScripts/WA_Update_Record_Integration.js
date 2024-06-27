/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: Update Record
 * Script Type  : Workflow Action
 * Created On       : 
 * Script Owner : Daniel Starkman
 * Purpose 		: This script is used to update the relteatd SFDC Status Record to Ready.
 ********************************************************************/

define(["N/url","N/record",'N/query'],

function(url,record,query) {

function onAction(context) {
    try{ 
        var Record = context.newRecord;
        var recordId = Record.id;
        log.debug('recordId',recordId);
        if (Record.type == 'creditmemo' || 'customerpayment' ){
            var linesapplyed = Record.getLineCount('apply');
            var inv_array = ''
            var inv_applyed_array = []
            for (var n = 0 ; n < linesapplyed ; n++ ){
                var inv = Record.getSublistValue('apply','internalid', n);
                var apply = Record.getSublistValue('apply','apply', n);
                if (apply){
                    inv_applyed_array.push(inv)
                } 
            }
            for ( var q = 0 ; q < inv_applyed_array.length ; q++){
                if (q == inv_applyed_array.length || q == 0){
                    inv_array = inv_array + inv_applyed_array[q]
                }else{
                    inv_array = inv_array + ',' + inv_applyed_array[q]
                }
            }      
            var sql = query.runSuiteQL({query:`                
                select id from customrecord_hb_sfdc_status_sync where custrecord_sync_status_tran in (${inv_array})
            `}).asMappedResults();
            for (var m = 0 ; m < sql.length ; m ++ ){
                var id = record.submitFields({
                    type: 'customrecord_hb_sfdc_status_sync',
                    id: sql[m].id ,
                    values: {
                        custrecord_sf_status:1 
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields : true
                    }
                });
                log.debug('Record edit Sync ID',id);
            }
        }
        var Status_Rec = Record.getValue({
            fieldId: 'custbody_sfdc_status_sync'
        });  
        if(!isNullOrEmpty(Status_Rec)&&  context.type != 'create' ){
           var id = record.submitFields({
               type: 'customrecord_hb_sfdc_status_sync',
               id: Status_Rec,
               values: {
                   custrecord_sf_status:1 
               },
               options: {
                   enableSourcing: false,
                   ignoreMandatoryFields : true
               }
           });
           log.debug('Record edit Sync ID',id);
        }
   }catch(ex){
    log.error('Error while updating Record Sync ',ex.message);
   }	
    function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }

}

return {
    onAction : onAction
};

});