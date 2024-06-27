    /**
     * @NApiVersion 2.1
     * @NScriptType ScheduledScript
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
     function (search, runtime, format, record,query, task) {
        var exports = {};
        function execute(context) {
            var Vendor_Query = query.runSuiteQL({
                query: `select
                cur_sub.currency as Sub_Currency,
                ven_sub.subsidiary,
                ven_sub.entity as ven_id,
                ven_sub.name, 
                curr.currency  as Ven_Currency
                from 
                AccountingBookSubsidiaries as cur_sub
                left join VendorSubsidiaryRelationship as ven_sub on cur_sub.subsidiary = ven_sub.subsidiary 
                left join VendorCurrencyBalance as curr on ven_sub.entity= curr.vendor and curr.currency = cur_sub.currency 
                left join vendor as ven on ven.id = ven_sub.entity
                where curr.currency is null 
                and ven.isinactive <> 'T'`
            }).asMappedResults()
            log.debug({
                title: 'Vendor_Query',
                details: Vendor_Query
            })
            for (i = 0; i < Vendor_Query.length ; i++){
            try{
                var Ven = record.load({type: 'vendor',id: Vendor_Query[i].ven_id,isDynamic: true})
                log.debug({
                    title: 'Vendor_Query '+ i,
                    details: Vendor_Query[i].sub_currency
                })
                var New_Line = Ven.selectNewLine({sublistId: 'currency'});
                Ven.setCurrentSublistValue({sublistId: 'currency',fieldId: 'currency',value: Vendor_Query[i].sub_currency,ignoreFieldChange: true});
                New_Line.commitLine({sublistId: 'currency'});
                var save = Ven.save({ignoreMandatoryFields: true});
                log.debug({
                    title: 'Rec Save',
                    details: save
                });
                if (GetUsage() < 100) {
                                    
                    var taskId = Reschedule();
                    log.debug({
                        title: 'Reschedule',
                        details: 'Task ID : '+taskId
                    })
                    return;
                }
            }catch(e){
                log.error({
                    title: 'Record Field: '+Vendor_Query[i].ven_id,
                    details: e
                });
            }
            }
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
        function Date_String(date){
            return  date.getDate()+'/'+(date.getMonth() + 1)+'/'+(date.getYear() + 1900)
        }
        function GetUsage() {
        var scriptObj = runtime.getCurrentScript();
        var remainingUsage = scriptObj.getRemainingUsage();
        return remainingUsage
    }   
        exports.execute = execute
        return exports
     }
     );
 