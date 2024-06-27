/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * Purpose             : Set Record name for Nexonia View
 * Created On          : 02/03/2023
 * Created By          : Daniel@finance4.cloud @Dsair92
 */

define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query', 'N/log'],
function (record, error, search, format, task,query,log) {
   var exports ={}     
   function beforeload(context) {
       var record = context.newRecord;
       record.setValue('altname','To Be Named');


   }
   function beforesubmit(context) {
        
    };
   
   function afersubmit(context) {
    var rec = context.newRecord;
    var load_rec = record.load({
        type: 'customrecord_travel',
        id: rec.id,
        isDynamic: false,
    })
    var emp_id = load_rec.getValue('custrecord_tvl_emp');
    if (!isNullOrEmpty(emp_id)){
        var emp_fields = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: emp_id,
            columns: ['firstname', 'lastname',]
        });
        var start_date = load_rec.getText('custrecord_tvl_start_date');
        var end_date = load_rec.getText('custrecord_tvl_end_date');
        var name = load_rec.getValue('name');
        if(!isNullOrEmpty(start_date)&& !isNullOrEmpty(end_date)){
            load_rec.setValue('altname', emp_fields.firstname + ' ' + emp_fields.lastname + ' '+ start_date + ' - ' + end_date +' '+ name )
        }else{
            load_rec.setValue('altname', emp_fields.firstname + ' ' + emp_fields.lastname +' '+ name)
        }
    load_rec.save();
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
   exports.beforeLoad = beforeload
   //exports.beforeSubmit = beforesubmit
   exports.afterSubmit = afersubmit
   return exports

}
);
  