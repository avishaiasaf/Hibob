/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * *Author    Daniel Starkman - daniel@finance4.cloud
 */

 define(['N/record', 'N/runtime', 'N/cache', 'N/email', 'N/format', 'N/query', 'N/task','N/url','N/https'],
 function (record, runtime, cache, email, format, query, task,url,https) {
     function getInputData(inputContext) {
         try {
             var Stripe_ID = query.runSuiteQL({
                 query:`select custentity_cust_stripe_id,
                 C.ID cus_id,
                 P.Name,
                 C.companyname,
                 C.comments,
                 substr(C.comments, INSTR(C.comments, 'cus_', 1), 18) cust_id_stripe
          from customer C
                   left join customrecord_il_vendor_pay_method_list P on P.ID = C.custentityhb_customer_payment_method
          where C.comments like '%Stripe: cus_%'
and custentity_cust_stripe_id is null`
             }).asMappedResults();
             log.debug({
                 title : 'Data Length',
                 details : Stripe_ID.length
             });
         return Stripe_ID
         } catch (e) {
             log.error('error - getInputData', e);
         }

     }
     function map(mapContext) {
         var ObjLine = JSON.parse(mapContext.value)
         log.debug({ title: 'Data :'+ mapContext.key, details: JSON.stringify(ObjLine) });
         var Customer  = record.load({
             type: 'customer',
             id : ObjLine.cus_id ,
             isDynamic: false
         });
         Customer.setValue('custentity_cust_stripe_id',ObjLine.cust_id_stripe);
         Customer.save();

         return mapContext.value;
     }

     function summarize(context) {
         var originalPDFURL = url.resolveScript({
             scriptId: 'customscript_workato_sl_webhook',
             deploymentId: 'customdeploy_workato_webhook',
             returnExternalUrl: true
         });
         var response = https.get({
             url: originalPDFURL
         })
         log.debug({
             title: 'response',
             details: response.code
         })  
     }

  //--------------------------------------------------------------FUNCTIONS--------------------------------------------------------------
 function isNullOrEmpty(val) {
     if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
         return true;
     }
     return false;
 }
 return {
      getInputData: getInputData,
      map: map,
      //reduce: reduce,
      //summarize: summarize
  }

});