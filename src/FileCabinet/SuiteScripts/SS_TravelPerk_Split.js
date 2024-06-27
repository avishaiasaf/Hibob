    /**
     * @NApiVersion 2.1
     * @NScriptType ScheduledScript
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
     function (search, runtime, format, record,query, task) {
 
        var exports = {};
        function execute(context) {
            try{
                var script = runtime.getCurrentScript();
                t_id = script.getParameter({ name: "custscript_tp_tran_id" });
                tran_type = script.getParameter({name: 'custscript_tp_tran_type'});
                log.debug('t_id' , t_id);
                log.debug('tran_type' , tran_type);
                var rec = record.load({
                    type: tran_type,
                    id: t_id,
                    isDynamic: false,
                });
                var tran_id = rec.getValue('tranid');
                var lines_data = query.runSuiteQL({query:`
                select 
                    trl.custrecord_travel_line_account, 
                    trl.custrecord_travel_line_ref_n,
                    trl.custrecord_trl_line_memo ,
                    trl.id,
                    trl.custrecord_travel_line_parent,
                    trl.custrecord_travel_line_emp,
                    e.department dep,
                    trl.custrecord_travel_line_amount, 
                    sum.total 
                from 
                    customrecord_travel_line trl
                    inner join employee e on e.id =  trl.custrecord_travel_line_emp
                    left join (
                        select 
                            sum(custrecord_travel_line_amount) total, 
                            custrecord_travel_line_ref_inv 
                        from 
                            customrecord_travel_line 
                        where 
                            custrecord_travel_line_ref_inv = '${tran_id}' 
                        group by 
                            custrecord_travel_line_ref_inv
                        ) sum on 
                        sum.custrecord_travel_line_ref_inv = trl.custrecord_travel_line_ref_inv 
                where 
                    trl.custrecord_travel_line_ref_inv = '${tran_id}'
                `}).asMappedResults();
                log.debug('lines_data', lines_data);
                var total = rec.getValue('total');
                var total_line = lines_data.length
                var lines_count = rec.getLineCount('expense');
                log.debug('total_line', total_line);
                log.debug('lines_count', lines_count);
                for ( var y = 0 ; y < total_line ; y++ ){
                    log.debug({
                        title: 'account',
                        details: lines_data[y].custrecord_travel_line_account
                    })
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account',
                        line: y ,
                        value: lines_data[y].custrecord_travel_line_account
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'custcol_travel_line',
                        line: y,
                        value: lines_data[y].id
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'department',
                        line: y,
                        value: lines_data[y].dep,
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'custcol_travel',
                        line: y,
                        value: lines_data[y].custrecord_travel_line_parent
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'memo',
                        line: y,
                        value: lines_data[y].custrecord_trl_line_memo
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'custcol_hb_employee',
                        line: y ,
                        value: lines_data[y].custrecord_travel_line_emp
                    });
                    rec.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: y  ,
                        value: lines_data[y].custrecord_travel_line_amount
                    });
                }
                rec.save();
            }catch(e){
                log.error({
                    title: 'Rec ID Error : '+tran_id,
                    details: e
                });
                rec.setValue('custbody_travel_perk_intgreation_sync',true);
                rec.save();
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
 