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
        var rec = context.newRecord;
        var entity = rec.getValue('entity');
        var vendor_travel = search.lookupFields({
            type: search.Type.VENDOR,
            id: entity,
            columns: ['custentity_trl_vendor']
        });
        var lines_count = rec.getLineCount('expense');
        if (vendor_travel.custentity_trl_vendor != true || lines_count > 1){
            return
        }
        log.debug('Success',entity)
        var tran_id = rec.getValue('tranid');
        var total = rec.getValue('total');
        log.debug({
            title: 'tran_id',
            details: tran_id
        })
        var lines_data = query.runSuiteQL({query:`
        select 
            trl.custrecord_travel_line_account, 
            trl.custrecord_travel_line_ref_n,
            serv.name memo , 
            e.department dep,
            trl.id,
            trl.custrecord_travel_line_parent,
            trl.custrecord_travel_line_emp, 
            trl.custrecord_travel_line_amount, 
            sum.total 
        from 
            customrecord_travel_line trl 
            inner join employee e on e.id =  trl.custrecord_travel_line_emp
            inner join customrecord_tp_service serv on serv.id =  trl.custrecord_travel_line_service
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
        if (lines_data[0].total == total){
            var total_line = lines_data.length
            log.debug('total_line', total_line);
            if (total_line > 50){
                log.debug({
                    title:'Script Schedule',
                    details: 'Script'
                });
                var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
                scriptTask.scriptId = 'customscript_ss_travelperk_split';
                scriptTask.deploymentId = null;
                scriptTask.params = {
                    custscript_tp_tran_id : rec.id,
                    custscript_tp_tran_type : rec.type
                }
                var scriptTaskid = scriptTask.submit();
                log.debug('taskid',scriptTaskid);
            }else{
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
                        value: lines_data[y].memo
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
            }
        }else{
            rec.setValue('custbody_travel_perk_intgreation_sync',true);
        }
    }
    function afersubmit(context) {
      
       
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
   //exports.beforeLoad = beforeload
   exports.beforeSubmit = beforesubmit
   //exports.afterSubmit = afersubmit
   return exports

}
);
  