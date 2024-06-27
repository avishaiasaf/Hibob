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
        try{  
            var rec = context.newRecord
            var emp = rec.getValue('custrecord_trl_id_emp');
            var dest_country = rec.getValue('custrecord_trl_id_dest_country');
            var start_date = rec.getValue('custrecord_trl_id_start_date');
            var end_date = rec.getValue('custrecord_trl_id_end_date');
            var city = rec.getValue('custrecord_trl_id_dest_city');
            var travel_search_start_date = date_to_string(addDays(FormatDate(start_date),-7));
            var travel_search_end_date = date_to_string(addDays(FormatDate(end_date),7));
            var origin_country = rec.getValue('custrecord_trl_id_origin_country');
            var lines_data = query.runSuiteQL({query:`
            select 
            id,
            custrecord_tvl_start_date,
            custrecord_tvl_end_date
            from customrecord_travel
            where custrecord_tvl_destination = ${dest_country} 
            and custrecord_tvl_emp = ${emp}
            and custrecord_tvl_start_date >= '${travel_search_start_date}' and custrecord_tvl_end_date <= '${travel_search_end_date}'
            `}).asMappedResults();
            log.debug({
                title: 'line',
                details: lines_data
            })
            var travel_record = null
            var len_data = lines_data.length
            log.debug({
                title: 'len_data',
                details: len_data
            })
            var emp_fields = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: emp,
                columns: ['firstname', 'lastname',]
            });
            if (len_data == 0){
                var Travel_rec = record.create({
                    type: 'customrecord_travel',
                    isDynamic: false,
                })
                var international = true
                if (dest_country == origin_country){
                    international = false
                }
                Travel_rec.setValue('custrecord_tvl_emp',emp);
                Travel_rec.setValue('custrecord_tvl_destination',dest_country);
                Travel_rec.setValue('custrecord_tvl_city',city);
                Travel_rec.setValue('custrecord_tvl_international',international);
                Travel_rec.setValue('custrecord_tvl_start_date',FormatDate(start_date));
                Travel_rec.setValue('custrecord_tvl_end_date',FormatDate(end_date));
                Travel_rec.setValue('altname', emp_fields.firstname + ' ' + emp_fields.lastname + ' '+ start_date + ' - ' + end_date )
                travel_record = Travel_rec.save();
            }
            if (len_data == 1){
                var Travel_rec = record.load({
                    type: 'customrecord_travel',
                    id: lines_data[0].id,
                    isDynamic: false
                });
                var mindate = new Date(Math.min(start_date.getTime(), FormatDate(lines_data[0].custrecord_tvl_start_date).getTime()));
                var maxdate = new Date(Math.max(end_date.getTime(), FormatDate(lines_data[0].custrecord_tvl_end_date).getTime()));
                Travel_rec.setValue('custrecord_tvl_start_date',mindate);
                Travel_rec.setValue('custrecord_tvl_end_date',maxdate);
                Travel_rec.setValue('altname', emp_fields.firstname + ' ' + emp_fields.lastname + ' '+ date_to_string(mindate) + ' - ' + date_to_string(maxdate) )
                travel_record = Travel_rec.save();
            }
            if (!isNullOrEmpty(travel_record)){
                rec.setValue('custrecord_tvl_id_rec',travel_record);
            }
        }catch(e){
            log.debug('error Rec : '+rec.id , e);
        }
    };
    
    function afersubmit(context) {
     
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
   exports.beforeSubmit = beforesubmit
   //exports.afterSubmit = afersubmit
    return exports
}
);
   