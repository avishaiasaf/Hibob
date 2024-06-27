/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query','N/runtime', 'N/log'],
 function (record, error, search, format, task,query,runtime,log) {
        
    function beforeload(context) {
        if (context.type == 'create' ||context.type == 'copy' ){
            var Record = context.newRecord;
            var list_type = 'expense';
            if (Record.type == 'journalentry'){
                list_type = 'line';
            }
            var numLines = Record.getLineCount({sublistId: list_type});
            if (numLines > 0){
                for (i=0;i < numLines; i++){
                    var Account_Dest = Record.getSublistValue({sublistId: list_type,fieldId: 'custcol_amr_destination_account',line: i});
                    var Tax_code = Record.getSublistValue({sublistId: list_type,fieldId: 'taxcode',line: i});
                    if (!isNullOrEmpty(Account_Dest)){
                        Record.setSublistValue({sublistId: list_type,fieldId: 'account', line: i,value: Account_Dest});
                        Record.setSublistValue({sublistId: list_type,fieldId: 'custcol_amr_destination_account', line: i,value: ''});
                        Record.setSublistValue({sublistId: list_type,fieldId: 'custcol_amr_data', line: i,value: 'Create'});
                        Record.setSublistValue({sublistId: list_type,fieldId: 'taxcode', line: i,value: Tax_code});
                    }
                }
            }
        }
    }
    function beforesubmit(context) {
        var Record = context.newRecord;
        var list_type = 'expense';
        var start_date_amr = 'amortizstartdate';
        var end_date_amr = 'amortizationenddate';
        var ContextScript = runtime.executionContext;
        log.debug({
            title: 'Content Script Type',
            details: ContextScript
        })
        if (Record.type == 'journalentry'){
            list_type = 'line';
            start_date_amr = 'startdate';
            end_date_amr = 'enddate';
        }
        var numLines = Record.getLineCount({sublistId: list_type});
        if (numLines > 0){
            for (i=0;i < numLines; i++){
                if (ContextScript == 'RESTLET'){
                    Record.setSublistValue({sublistId: list_type,fieldId: 'amortizationsched', line: i,value: ''})
                }
                if (ContextScript == 'WEBSERVICES'){
                    var Schedule_Accrulify = Record.getSublistValue({sublistId: list_type,fieldId: 'amortizationsched', line: i})
                    log.debug({
                        title: 'Schedule_Accrulify',
                        details: Schedule_Accrulify
                    })
                    if ( !isNullOrEmpty(Schedule_Accrulify)){
                        Record.setSublistValue({sublistId: list_type,fieldId: 'amortizationsched', line: i,value: ''})
                        Record.setSublistValue({sublistId: list_type,fieldId: 'custcol_amr_temp', line: i,value: '1'})
                    }
                }
                var Tax_code = Record.getSublistValue({sublistId: list_type,fieldId: 'taxcode',line: i});
                var Account = Record.getSublistValue({sublistId: list_type,fieldId: 'account',line: i});
                var Account_Dest = Record.getSublistValue({sublistId: list_type,fieldId: 'custcol_amr_destination_account',line: i});
                var amr_start = Record.getSublistValue({sublistId: list_type,fieldId: start_date_amr,line: i});
                var amr_end = Record.getSublistValue({sublistId: list_type,fieldId: end_date_amr,line: i});
                var amr_template = Record.getSublistValue({sublistId: list_type, fieldId: 'custcol_amr_temp',line: i})
                var amr_data = Record.getSublistValue({sublistId: list_type,fieldId: 'custcol_amr_data',line: i});
                if (!isNullOrEmpty(amr_start)&&!isNullOrEmpty(amr_end)&&!isNullOrEmpty(amr_template)&&isNullOrEmpty(Account_Dest)){
                    var ClearingQL = query.runSuiteQL({
                        query:`select custrecord_default_clearing_acc as cl_account
                        from customrecord_amortization_settings
                        fetch first 1 rows only`
                    }).asMappedResults();
                    Clearing_account = ClearingQL[0].cl_account
                    Record.setSublistValue({sublistId: list_type,fieldId: 'custcol_amr_destination_account', line: i,value: Account});
                    Record.setSublistValue({sublistId: list_type,fieldId: 'account', line: i,value: Clearing_account});
                    if (isNullOrEmpty(amr_data)) Record.setSublistValue({sublistId: list_type,fieldId: 'custcol_amr_data', line: i,value: 'Create'});
                    Record.setSublistValue({sublistId: list_type,fieldId: 'taxcode', line: i,value: Tax_code});
                }
            }
        }
       
    };
    
    function afersubmit(context) {
        var Rec_ID = context.newRecord.id;
        var Record = context.newRecord;
        var ContextScript = runtime.executionContext;
        var list_type = 'expense'
        if (Record.type == 'journalentry'){
            list_type = 'line'
        }
        if (ContextScript != 'SCHEDULED'){
            var numLines = Record.getLineCount({sublistId: list_type});
            if (numLines > 0){
                for (i=0;i < numLines; i++){
                    var AMR_DATA = Record.getSublistValue({sublistId: list_type,fieldId: 'custcol_amr_data',line: i});
                    log.debug({
                        title: 'AMR',
                        details: AMR_DATA
                    })
                    if (AMR_DATA == 'Create' || AMR_DATA == 'Change'){
                        var params = {
                            'custscript_amr_rec': Rec_ID,
                            'custscript_amr_rec_type' : context.newRecord.type
                        }
                        log.debug('Params', params)
                        var Task = task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: 'customscript_ss_create_amortization',
                            deploymentId: null,
                            params: params
                        });
                        Task.submit();
                        return
                    }
                }
            }
        }   
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

     return {
         beforeLoad: beforeload,
         beforeSubmit: beforesubmit,
         afterSubmit: afersubmit,
     };

}
);
   