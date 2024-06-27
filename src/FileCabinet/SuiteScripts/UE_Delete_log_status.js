/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query','N/runtime', 'N/log'],
 function (record, error, search, format, task,query,runtime,log) {
    var exports = {};
    function beforeload(context) {
    }
    function beforesubmit(context) {   
       
    };
    
    function afersubmit(context) {
        var rec = context.newRecord
        var delete_indication = rec.getValue('custrecord_cls_delete');
        if (delete_indication){
            record.delete({
                type: rec.type,
                id: rec.id
            });
        }

    }
    function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }
    function addDays(theDate, days) {

        return new Date(theDate.getTime() + days*24*60*60*1000);
     
     }


    function date_to_string (date_string){
        var day = date_string.getDate();
        var month = date_string.getMonth() + 1;
        var year = date_string.getFullYear();
        var formattedDay = ("0" + day).slice(-2);
        var formattedMonth = ("0" + month).slice(-2);
        var finalDateStr = formattedDay + "/" + formattedMonth + "/" + year;
        return finalDateStr
    }
    function FormatDate(date) {
        var parsedDate = format.parse({
            value: date,
            type: format.Type.DATE
            });
        return parsedDate
    }
   //exports.beforeLoad = beforeload
   //exports.beforeSubmit = beforesubmit
   exports.afterSubmit = afersubmit
    return exports
}
);
   