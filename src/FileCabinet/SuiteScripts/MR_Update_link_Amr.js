    /**
     * @NApiVersion 2.1
     * @NScriptType MapReduceScript
    /*******************************************************************
     * Name 		: Hold Billing For Downsell Validation
     * Purpose 		: Update AMR Link For Report 
     * Script Type  : Map Reduce
     * Created On   : 04/12/2022
     * Script Owner : Daniel Starkman Daniel@finance4.cloud
     ********************************************************************/
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
     function (search, runtime, format, record,query, task) {
 
         function getInputData() {
            var Data = query.runSuiteQL({
                query:`select custrecord_amr_amr_schedule_id amr_id , id amr_link_id 
                from customrecord_amr_link where custrecord_amr_rec_amount <> custrecord_amr_amount or custrecord_amr_deffered_amount is null`
                }).asMappedResults();
            log.debug({
                title : 'Data Length',
                details : Data.length
            });
        return Data
           
        }
    
        function map(mapContext) {
            var ObjLine = JSON.parse(mapContext.value)
            log.debug({ title: 'Data :'+ mapContext.key, details: JSON.stringify(ObjLine) });
            var Revenue_Schedule = record.load({
                type: 'revRecSchedule',
                id: ObjLine.amr_id,
                isDynamic: true,
            });
            var Line_Count = Revenue_Schedule.getLineCount({sublistId: 'recurrence'});
            log.debug({
                title: 'Revenue_Schedule',
                details: Revenue_Schedule
            })
            var Amount_Rec = 0;
            var Amount_Deffered = 0;
            for (var n = 0 ; n < Line_Count; n++){
                var Line_Obj = Revenue_Schedule.selectLine({sublistId: 'recurrence',line: n });
                var Amount = Line_Obj.getCurrentSublistValue({sublistId: 'recurrence',fieldId: 'recamount'});
                var Journal = Line_Obj.getCurrentSublistText({sublistId: 'recurrence',fieldId: 'journal'});
                Journal.substr(0,2);
                if (Journal.substr(0,2) == 'JE'){
                    Amount_Rec = Amount_Rec + Amount
                }else {
                    Amount_Deffered = Amount_Deffered + Amount
                }
            }
            var Link = record.submitFields({
                type: 'customrecord_amr_link',
                id: ObjLine.amr_link_id,
                values: {
                    custrecord_amr_deffered_amount: Amount_Deffered,
                    custrecord_amr_rec_amount: Amount_Rec
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });

    
        }
        return {
            getInputData: getInputData,
            map: map,
            //reduce: reduce,
            //summarize: summarize
        }
     }
     );
 