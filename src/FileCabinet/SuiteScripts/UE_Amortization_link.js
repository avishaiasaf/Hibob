/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/search', 'N/format','N/task','N/query', 'N/log'],
 function (record, error, search, format, task,query,log) {
        
    function beforeload(context) {
}
    function beforesubmit(context) {
        var Rec_ID = context.newRecord.id;
        var Record = context.newRecord;
     };
    
    function afersubmit(context) {
        var Rec_ID = context.newRecord.id;
        var search = query.runSuiteQL({
            query:`select
            atl.id , temp.name 
            from customrecord_atlb as atl
            left join amortizationtemplate as temp on atl.custrecord_atlb_at =temp.id
            where custrecord_altb_atl = ${Rec_ID} `}).asMappedResults();
        if (search.length > 0 ){
            for (i = 0; i < search.length; i++){
                var link = record.load({
                    type : 'customrecord_atlb',
                    id : search[i].id,
                    isdynamic: false
                });
                link.setValue('custrecord_atlb_atm',search[i].name);
                link.save();
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
         //beforeLoad: beforeload,
         //beforeSubmit: beforesubmit,
         afterSubmit: afersubmit,
     };

}
);
   