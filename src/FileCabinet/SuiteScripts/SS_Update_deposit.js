    /**
     * @NApiVersion 2.1
     * @NScriptType ScheduledScript
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
     function (search, runtime, format, record,query, task) {
 
        var exports = {};
        function execute(context) {
            var script = runtime.getCurrentScript();
            var Tran = script.getParameter({ name: "custscript_tran" });
            var Payment = JSON.parse(script.getParameter({name: 'custscript_payment'}))
            var Record =  record.load({
                type: 'deposit',
                id: Tran,
                isdynamic : false
            });
            var Lines_Deposit = Record.getLineCount({sublistId: 'payment'});
            log.debug({
                title: 'Payment',
                details: Payment.length
            })

            
                for (x=0;x < Lines_Deposit; x++){
                    var Payment_ID = Record.getSublistValue({sublistId: 'payment' ,fieldId: 'id',line: x});
                    for (var i = 0 ; i < Payment.length ; i++ ){
                        if (Payment[i]== Payment_ID){
                            Record.setSublistText({
                                sublistId: 'payment',
                                fieldId: 'deposit',
                                line: x,
                                text: 'T'
                            })
                        }
                    }

                }
                Record.save();
            
            /*
            for (x=0;x < Lines_Deposit; x++){
                var Payment_ID = Record.getSublistValue({sublistId: 'payment' ,fieldId: 'id',line: x});
                for(y= 0;y < Payment.length ; y++){
                    log.debug('test',Payment[y]) 
                }
                log.debug({
                    title: 'Line '+x,
                    details: Payment_ID
                })
            }
            */
            
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
 