/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: Logs Execution API
 * Purpose 		: To send all logs to Splunk.
 * Script Type  : Suitelet
 * Created On   : 
 * Script Owner : Daniel Starkman Daniel@finance4.cloud
 ********************************************************************/


 define(["N/ui/serverWidget","N/record","N/redirect","N/workflow","N/runtime", 'N/query','N/search'],

 function(ui,record,redirect,workflow,runtime,query,search) {

function post(context) {
    try{
        log.debug({
            title: 'context',
            details: context
        });
        var taskid = context.taskid
        var logs = search.create({
            type: 'scheduledscriptinstance',
            filters:['taskid', 'contains', taskid],
            columns: [{name: 'datecreated'},{ name: 'startdate' },{ name: 'enddate' },{ name: 'status' },{ name: 'mapreducestage' },{ name: 'percentcomplete' },{ name: 'taskid' },
            { name: 'internalid', join: 'script' },{ name: 'scriptid', join: 'script' },{ name: 'name', join: 'script' },{ name: 'scripttype', join: 'script' },{ name: 'title', join: 'scriptDeployment' }]})
      
        var Result = [];
        var resultset = logs.run() 
        var s = [];
        var searchid = 0;
        do {
            var resultslice = resultset.getRange(searchid, searchid + 1000);
            for (var rs in resultslice) {
                s.push(resultslice[rs]);
                searchid++;
            }
        } while (resultslice != null && resultslice.length >= 1000);  
        if (s != null) {
            for (var i = 0; i < s.length; i++) {
                Result.push({
                    startdate : s[i].getValue({name: 'startdate'}),
                    enddate: s[i].getValue({name: 'enddate'}),
                    status : s[i].getValue({name: 'status'}),
                    mapreducestage: s[i].getValue({name: 'mapreducestage'}),
                    percentcomplete : s[i].getValue({name: 'percentcomplete'}),
                    taskid: s[i].getValue({name: 'taskid'}),
                    script_internal_id : s[i].getValue({ name: 'internalid', join: 'script' }),
                    script_id: s[i].getValue({name: 'scriptid', join: 'script' }),
                    script_name : s[i].getValue({ name: 'name', join: 'script'}),
                    script_type: s[i].getValue({ name: 'scripttype', join: 'script' }),
                    scriptDeployment : s[i].getValue({ name: 'title', join: 'scriptDeployment' }),
                })
            }
        }
    return Result
    }catch(ex){
        log.error('error in suitelet',ex);
    }
}

return {
    post: post
};

});
