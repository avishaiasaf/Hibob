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
        try{
            var Vendor = record.load({
                type: context.newRecord.type,
                id: context.newRecord.id,
                isDynamic: true,
            });
            var category = Vendor.getValue('category');
            var Tax_List = Vendor.getLineCount({
                sublistId: 'submachine'
            });
            for (var x = 0; x < Tax_List ; x++){
                var Line = Vendor.selectLine({
                    sublistId: 'submachine',
                    line: x
                });

                var Tax_Item = Line.getCurrentSublistValue({
                    sublistId: 'submachine',
                    fieldId: 'taxitem'
                });
                var Subsidiary = Line.getCurrentSublistValue({
                    sublistId: 'submachine',
                    fieldId: 'subsidiary',
                });
                if(isNullOrEmpty(Tax_Item)){
                    var Search = query.runSuiteQL({
                        query:`select 
                        custrecord_tax_ap_tax_code tax_codes
                            from customrecord_tax_ap as Tax_AP 
                        where Tax_AP.custrecord_tax_ap_subsidairy = ${Subsidiary}  and Tax_AP.custrecord_tax_ap_category = ${category} `
                    }).asMappedResults();
                    var TaxID = Search[0].tax_codes
                    Line.setCurrentSublistValue({
                        sublistId: 'submachine',
                        fieldId: 'taxitem',
                        value: TaxID,
                        ignoreFieldChange: true
                    });
                    Tax_Item = TaxID                
                    Line.commitLine({
                        sublistId: 'submachine'
                    });
                    log.debug({
                        title: 'TaxID',
                        details: TaxID
                    })
                }  
            }
            var Vendor_Query = query.runSuiteQL({
                query: `select
                cur_sub.currency as Sub_Currency,
                ven_sub.subsidiary,
                ven_sub.entity as ven_id,
                ven_sub.name, 
                curr.currency  as Ven_Currency
                from 
                AccountingBookSubsidiaries as cur_sub
                left join VendorSubsidiaryRelationship as ven_sub on cur_sub.subsidiary = ven_sub.subsidiary 
                left join VendorCurrencyBalance as curr on ven_sub.entity= curr.vendor and curr.currency = cur_sub.currency 
                left join vendor as ven on ven.id = ven_sub.entity
                where 
                ven.id = ${Vendor.id} and curr.currency is null`
            }).asMappedResults();
            log.debug({
                title: 'Vendor_Query',
                details: Vendor_Query
            });
            Vendor.setValue({fieldId: 'custentity_default_tax_item',value: Tax_Item});
            if (Vendor_Query.length == 0 ){
                Vendor.save();
                return
            }
            for (i = 0; i < Vendor_Query.length ; i++){
                var New_Line = Vendor.selectNewLine({sublistId: 'currency'});
                New_Line.setCurrentSublistValue({sublistId: 'currency',fieldId: 'currency',value: Vendor_Query[i].sub_currency,ignoreFieldChange: true});
                New_Line.commitLine({sublistId: 'currency'});
            }
            Vendor.save();
        }catch(e){
            log.error({
                title: 'Error Tax Assign - '+Vendor.id,
                details: e
            })
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
    exports.afterSubmit = afersubmit
    return exports
}
);
   