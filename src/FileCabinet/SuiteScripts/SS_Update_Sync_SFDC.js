    /**
     * @NApiVersion 2.1
     * @NScriptType ScheduledScript
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task','N/https','N/url','N/redirect'],
     function (search, runtime, format, record,query, task,https,url,redirect) {
 
        var exports = {};
        function execute(context) {
            try{
                var script = runtime.getCurrentScript();
                //entity = script.getParameter({ name: "custscript_payment_entity" });
                var Last_Tran = query.runSuiteQL({
                    query:`select 
                    t.id ,
                    t.type  ,
                    t.LASTMODIFIEDDATE ,
                    t.custbody_sfdc_status_sync sync_rec,
                    s.custrecord_sf_status
                        from transaction t
                        left join customrecord_hb_sfdc_status_sync s on s.id = t.custbody_sfdc_status_sync
                    where 
                        LASTMODIFIEDDATE >= sysdate -1 and 
                        type in ('CustCred','CustPymt','CustInvc')
                        and s.custrecord_sf_status <> 1`
                }).asMappedResults();

                log.debug({
                    title: 'Last_Tran',
                    details: Last_Tran
                });
                for (var x = 0;x < Last_Tran.length ; x++){
                    var Status  = record.load({
                        type: 'customrecord_hb_sfdc_status_sync',
                        id : Last_Tran[x].sync_rec ,
                        isDynamic: false
                    });
                    Status.setValue('custrecord_sf_status',1);
                    Status.save();
                }
                
                log.debug({
                    title: 'Finish',
                    details: 'Finish'
                });
                var originalPDFURL = url.resolveScript({
                    scriptId: 'customscript_workato_sl_webhook',
                    deploymentId: 'customdeploy_workato_webhook',
                    returnExternalUrl: true
                });
                log.debug({
                    title: 'new URL',
                    details: originalPDFURL
                })
                var response = https.get({
                    url: originalPDFURL
                })
                log.debug({
                    title: 'response',
                    details: response.code
                })                
            }catch(e){
                log.error({
                    title: 'Request Error',
                    details: e
                })
            }
        }
        function DateString(date){
            format_date = FormatDate(date)
            return  format_date.getDay() + '/'+ (format_date.getMonth() + 1) +'/'+(format_date.getYear() + 1900) 
        }
        function GetUsage() {
             var scriptObj = runtime.getCurrentScript();
             var remainingUsage = scriptObj.getRemainingUsage();
             return remainingUsage
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
 
         function Reschedule() {
             var scriptTask = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
             scriptTask.scriptId = runtime.getCurrentScript().id;
             scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
             scriptTask.submit();
         }
         
         exports.execute = execute
         return exports
     }
     );
 