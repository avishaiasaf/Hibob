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
    };
    
    function afersubmit(context) {
        var Rec_ID = context.newRecord.id;
        var Rec_Type = context.newRecord.type;
        var Record = record.load({
            type: Rec_Type,
            id: Rec_ID,
            isDynamic: false,
        })
        var list_type = 'expense'
        var Subsidiary = Record.getValue({fieldId: 'subsidiary'});
        var Entity = Record.getValue({fieldId: 'entity'});
        var fieldLookUp = search.lookupFields({
            type: search.Type.VENDOR,
            id: Entity,
            columns: ['category']
        });
        try {
            var Category_Ven = fieldLookUp.category[0].value    
        }catch(e){
            var Category_Ven = null
        }
        log.debug({
            title: 'Field_Lookup',
            details: Category_Ven
        })
        var numLines = Record.getLineCount({sublistId: list_type});
        if (numLines > 0){
            for (i=0;i < numLines; i++){
                var Account = Record.getSublistValue({sublistId: list_type,fieldId: 'account',line: i});
                log.debug({
                    title: 'Account',
                    details: Account
                });
                var tax_to_assign = query.runSuiteQL({
                    query:`select * from (
                            select
                            id ,
                            custrecord_taa_tax_code tax_codes 
                            from customrecord_tax_assignment_account 
                            where custrecord_taa_account = ${Account}
                            and custrecord_taa_subsidiary = ${Subsidiary} 
                            and custrecord_taa_vendor_category = ${Category_Ven}
                            and custrecord_taa_all_category = 'F'   
                            union all
                            select
                            id ,
                            custrecord_taa_tax_code tax_codes 
                            from customrecord_tax_assignment_account 
                            where custrecord_taa_account = ${Account}
                            and custrecord_taa_subsidiary = ${Subsidiary} 
                            and custrecord_taa_all_category = 'T'
                            ) data
                            fetch first 1 rows only;
                        `
                }).asMappedResults();
                if (tax_to_assign.length > 0 ){
                    log.debug({
                        title: 'Tax_Code',
                        details: tax_to_assign[0].tax_codes
                    });
                    var gross_amt = Record.getSublistValue({sublistId: list_type,fieldId: 'grossamt',line: i});
                    Record.setSublistValue({sublistId: list_type,fieldId: 'taxcode', line: i,value: tax_to_assign[0].tax_codes});
                    Record.setSublistValue({sublistId: list_type,fieldId: 'grossamt', line: i,value: gross_amt});

                }
            }
            Record.save();
        }     
    };
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
   