/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

 define(['N/record', 'N/error', 'N/url','N/search', 'N/format','N/task','N/query','N/runtime','N/currency', 'N/log'],
 function (record, error,url, search, format, task,query,runtime,currency,log) {
    var exports = {};
    function beforeload(context) {
        var Rec = context.newRecord;
        var Cust = Rec.getValue({fieldId:'custrecord_hb_matched_cust'});
        var Currency = Rec.getValue({fieldId:'custrecord_hb_bank_account_currency'});
        var Status = Rec.getValue({fieldId:'custrecord_hb_cashapp_process_status'}); 
        var GuessTran = Rec.getValue({fieldId:'custrecord_hb_best_guess_transaction'}); 
        if (Status != 3 && !isNullOrEmpty(Cust)){
            var scheme = 'https://';
            var host = url.resolveDomain({hostType: url.HostType.APPLICATION});
            var relative_link = '/app/accounting/transactions/custpymt.nl?entity=' + Cust + '&currency=' + Currency
            if (!isNullOrEmpty(GuessTran)){
                relative_link = relative_link + '&inv=' + GuessTran
            }
            var url_link = scheme+host+relative_link     
            var thisForm = context.form;
            log.debug({title: 'URL',details: url_link});
            thisForm.addButton({id: "custpage_payment_bank",label: 'Create Payment',functionName: 'create_button("' + url_link + '")'});
            thisForm.clientScriptModulePath = "SuiteScripts/CL_Payment_button.js"
    }
    }
    function beforesubmit(context) {
        var Rec = context.newRecord;
        var bank_code = Rec.getValue({fieldId:'custrecord_hb_payer_account_no'});
        var status = Rec.getValue({fieldId:'custrecord_hb_cashapp_process_status'});
        if(!isNullOrEmpty(bank_code) && status == 101){
            var remitter_by_bank_search = query.runSuiteQL({
                query:`
                select 
                    custrecord_crossref_netsuite_customer, 
                    custrecord_crossref_status_cashapp
                from 
                    customrecord_remitter_netsuite_cross_ref 
                where 
                    custrecord_ref_bank_ref_code = '${bank_code}'
                `
            }).asMappedResults();
            if (remitter_by_bank_search.length == 1){
                if (!isNullOrEmpty(remitter_by_bank_search[0].custrecord_crossref_netsuite_customer)){
                    Rec.setValue({
                        fieldId: 'custrecord_hb_matched_cust',
                        value: remitter_by_bank_search[0].custrecord_crossref_netsuite_customer,
                        ignoreFieldChange: false
                    });
                    var status_value = getListValueId('customlist_cash_app_process_status','_pending_cash_by_account_logic') 
                    Rec.setValue({
                        fieldId: 'custrecord_hb_cashapp_process_status',
                        value: status_value,
                        ignoreFieldChange: false
                    });  
                }
                if (!isNullOrEmpty(remitter_by_bank_search[0].custrecord_crossref_status_cashapp)){
                    Rec.setValue({
                        fieldId: 'custrecord_hb_cashapp_process_status',
                        value: remitter_by_bank_search[0].custrecord_crossref_status_cashapp,
                        ignoreFieldChange: false
                    });    
                }
               
            }
        }
    };
    
    function afersubmit(context) {
        var Bank_Payment = record.load({
            type: context.newRecord.type,
            id: context.newRecord.id,
            isDynamic: true,
        });
        var Bank = Bank_Payment.getValue('custrecord_hb_bank_account_id');
        var tran_date = Bank_Payment.getValue('custrecord_hb_payment_date');
        try{
            if(isNullOrEmpty(Bank)){
                var Search = query.runSuiteQL({
                    query:`select A.id  bank_id ,
                    A.subsidiary sub_id ,  
                    A.currency 
                    from customrecord_hb_ar_bank_files B 
                    left join account A on A.acctnumber = B.custrecord_hb_bank_account_no
                    where B.id = ${context.newRecord.id}
                    `
                }).asMappedResults();
                // IL Flow
                if (Search[0].sub_id == 4 && Search[0].currency == 6 ){
                    Bank_Payment.setValue({
                        fieldId: 'customform',
                        value: 252,
                        ignoreFieldChange: false
                    }) ;
                } 
                Bank_Payment.setValue({
                    fieldId: 'custrecord_hb_bank_account_id',
                    value: Search[0].bank_id,
                    ignoreFieldChange: false
                }) ;
                  Bank_Payment.setValue({
                    fieldId: 'custrecord_hb_subsidiary',
                    value: Search[0].sub_id,
                    ignoreFieldChange: false
                });
                var func_date = FormatDate(tran_date);  
                var fx_rate = currency.exchangeRate({source: Search[0].currency, target: 1 ,date: func_date});
                var amount_payment = Bank_Payment.getValue('custrecord_hb_payment_amount');
                var amount_usd = fx_rate * amount_payment
                Bank_Payment.setValue('custrecord_hb_amount_usd',amount_usd);
            }
            Bank_Payment.save();
        }catch(e){
            log.error({
                title: 'Bank Payment Error ID: ' +context.newRecord.id,
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
    function getListValueId(list, listValueScriptId) {
        var listValueId = null;
         
        search.create({
            type: list,
            columns: [
                'internalid',
                'scriptid'
            ]
        }).run().each(function(result) {
            // Note: From tests, the script ID from the search results are always uppercase.
            if (result.getValue("scriptid") === listValueScriptId.toUpperCase()) {
                listValueId = result.getValue('internalid');
            }
            // Stop iterating when we find the target ID.
            return (listValueId === null);
        });
      
        return listValueId;
    }
    exports.beforeLoad = beforeload;
    exports.beforeSubmit = beforesubmit;
    exports.afterSubmit = afersubmit
    return exports
}
);
   