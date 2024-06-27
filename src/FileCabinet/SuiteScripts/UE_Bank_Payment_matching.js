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
                var Payment = record.load({
                    type: context.newRecord.type,
                    id: context.newRecord.id,
                    isDynamic: true,
                });
                var bank_payment_rec = Payment.getValue('custbody_hb_bank_record_source');
                if(isNullOrEmpty(bank_payment_rec)){
                    var entity = Payment.getValue('customer');
                    var trandate = Payment.getText('trandate');
                    log.debug({
                        title: 'date',
                        details: trandate
                    })
                    var pay_amt = Payment.getValue('payment');
                    var Search = query.runSuiteQL({query:`
                        select 
                            id
                        from 
                            customrecord_hb_ar_bank_files 
                        where 
                            custrecord_hb_matched_cust = ${entity} 
                            and custrecord_hb_payment_date = '${trandate}'
                            and custrecord_hb_payment_amount = ${pay_amt}
                        `
                    }).asMappedResults();
                    if (Search.length == 1){
                        record.submitFields({
                            type: 'customrecord_hb_ar_bank_files',
                            id: Search[0].id,
                            values: {
                                custrecord_hb_cashapp_process_status : '102' ,
                                custrecord_hb_payment_created : context.newRecord.id
                            }
                        });
                        Payment.setValue('custbody_hb_bank_record_source',Search[0].id);
                        Payment.save();
                    }
                }
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
        exports.afterSubmit = afersubmit
        return exports
    }
);
  