/**
 * @NAPIVersion 2.0
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/search', 'N/format','N/task', 'N/log'],
 function (record, error, search, format, task,log) {
        

     function beforesubmit(context) {
        var Account = context.newRecord
        var Exclude = Account.getValue({fieldId: 'custrecord_exclude_inheritance'})
        if (!Exclude){
            var Father_Account = Account.getValue({fieldId: 'parent'})
            if (!isNullOrEmpty(Father_Account)){
                var Rec_Father_Account = record.load({type: 'account',id: Father_Account,isDynamic: true,})
                Account.setValue({fieldId: 'custrecord_cash_flow_category',value: Rec_Father_Account.getValue('custrecord_cash_flow_category'),ignoreFieldChange: true})
            }
        }
        return         
    };
    function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }

     return {
         //beforeLoad: beforeload,
         beforeSubmit: beforesubmit,
         //afterSubmit: afersubmit
     };

}
);
   