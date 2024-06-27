/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: Create Payment Employees
 * Script Type  : Workflow Action
 * Created On   : 
 * Script Owner : Daniel Starkman daniel@finance4.cloud
 * Purpose 		: This script is used create Payment
 ********************************************************************/

define(["N/url","N/record","N/runtime","N/task"],

function(url,record,runtime,task) {

function onAction(context) {
    try{
        var Record = context.newRecord;
        var Rec = record.load({
            type: Record.type,
            id: Record.id,
            isDynamic: false,
        });
        var period = Record.getValue('custrecord_wfa_period');
        if(!isNullOrEmpty(period)){
            var Rec = record.load({
                type: context.newRecord.type,
                id: context.newRecord.id,
            });
            var scriptTask = task.create({taskType: 'MAP_REDUCE'});
            scriptTask.scriptId = 'customscript_mr_waterfall_collection';
            scriptTask.deploymentId = 'customdeploy_waterfall_manual';
            var param = {
                custscript_waterfall_period : period   
            }

            scriptTask.params = param
            var scriptTaskId = scriptTask.submit();
            log.debug({
                title: 'scriptTaskId',
                details: scriptTaskId
            })
            Rec.setValue('custrecord_wfa_task_id',scriptTaskId);
            Rec.save();
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