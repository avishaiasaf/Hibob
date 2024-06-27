/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query','N/runtime', 'N/log'],
 function (record, error, search, format, task,query,runtime,log) {
        
    function beforeload(context) {
}
    function beforesubmit(context) {
        var Rec_ID = context.newRecord.id;
        var Record = context.newRecord;
     };
    
    function afersubmit(context) {

        var script = runtime.getCurrentScript();
        var AP_Account = script.getParameter({ name: "custscript_ap_expense_account" });
        var Exp_Account = script.getParameter({ name: "custscript_exp_expense_account" });
        var Emp_Type = script.getParameter({ name: "custscript_emp_type_exp_report"});
        var Rec_ID = context.newRecord.id;
        var Exp_Rec = record.load({type: 'expensereport' ,id: Rec_ID,isDynamic: true});
        var Emp = Exp_Rec.getValue({fieldId:'entity'});
        var Emp_Rec = record.load({type: 'employee' ,id: Emp,isDynamic: true});
        var Emp_Type_Rec = Emp_Rec.getValue({fieldId:'employeetype'});
        log.debug({
            title: 'Validation',
            details: JSON.stringify({
                Record_ID : Rec_ID,
                Emp_Type: Emp_Type,
                Emp_Type_Rec: Emp_Type_Rec
            })
        });
        var JE_Related =  Exp_Rec.getValue('custbody_exp_je_related');
        if (isNullOrEmpty(JE_Related)&&Emp_Type_Rec==Emp_Type){
            try{
                var Amount = Exp_Rec.getValue({fieldId:'amount'});    
                var Currency = Exp_Rec.getValue({fieldId:'expensereportcurrency'});
                var Exchange_Rate = Exp_Rec.getValue({fieldId:'expensereportexchangerate'});
                var Subsidiary = Exp_Rec.getValue({fieldId:'subsidiary'});
                var JE = record.create({type: 'journalentry' ,isDynamic: true});
                var Date = Exp_Rec.getValue({fieldId:'trandate'});
                JE.setValue('subsidiary',Subsidiary);
                JE.setValue('currency',Currency);
                JE.setValue('trandate',Date);
                JE.setValue('exchangerate',Exchange_Rate);
                JE.selectNewLine({sublistId: 'line'});
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: AP_Account}); // AP Account
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'debit',value: Amount});
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'entity',value: Emp});
                JE.commitLine({sublistId: 'line'});
                JE.selectNewLine({sublistId: 'line'});
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: Exp_Account}); // Expense Account
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'credit',value: Amount});
                JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'entity',value: Emp});
                JE.commitLine({sublistId: 'line'});
                var Tran_ID = Exp_Rec.getValue({fieldId:'tranid'});  
                JE.setValue('memo', 'Expense Report related : '+ Tran_ID)                    
                var JE_Created =  JE.save();    
                log.debug({
                    title: 'JE_Created',
                    details: JE_Created
                });
                Exp_Rec.setValue('account',AP_Account);
                Exp_Rec.setValue('custbody_exp_je_related',JE_Created);
                Exp_Rec.save()    
            }catch(e){
                log.error({
                    title: 'JE Creation Error :' + Rec_ID,
                    details : JSON.stringify({
                        EXP_Rec_ID: Rec_ID,
                        Emp_ID : Emp,
                        Error: e
                    })
                })
            }
           
        } 
        //var Record = context.newRecord;..If needed
        
        
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
         //beforeLoad: beforeload,
         //beforeSubmit: beforesubmit,
         afterSubmit: afersubmit,
     };

}
);
   