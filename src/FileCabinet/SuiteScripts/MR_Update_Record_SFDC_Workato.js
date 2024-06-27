/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * *Author    Daniel Starkman - daniel@finance4.cloud
 */

define(['N/record', 'N/runtime', 'N/cache', 'N/email', 'N/format', 'N/query', 'N/task','N/url','N/https'],
    function (record, runtime, cache, email, format, query, task,url,https) {
        function getInputData(inputContext) {
            try {
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
                    title : 'Data Length',
                    details : Last_Tran.length
                });
                log.debug({
                    title : 'Data ',
                    details : Last_Tran
                });
                

            return Last_Tran
            } catch (e) {
                log.error('error - getInputData', e);
            }

        }
        function map(mapContext) {
            var ObjLine = JSON.parse(mapContext.value)
            log.debug({ title: 'Data :'+ mapContext.key, details: JSON.stringify(ObjLine) });
            var Status  = record.load({
                type: 'customrecord_hb_sfdc_status_sync',
                id : ObjLine.sync_rec ,
                isDynamic: false
            });
            Status.setValue('custrecord_sf_status',1);
            Status.save();
   
            return mapContext.value;
        }

        function summarize(context) {
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
        }

     //--------------------------------------------------------------FUNCTIONS--------------------------------------------------------------
    function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }
    return {
         getInputData: getInputData,
         map: map,
         //reduce: reduce,
         summarize: summarize
     }

 });