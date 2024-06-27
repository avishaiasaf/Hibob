/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

 define(['N/search','N/currency','N/ui/dialog','N/ui/message','N/record','N/query'],
 function ( search,currency,ui,message,record,query) {
     var exports = {};
     function fieldChanged(scriptContext) {
         debugger;
         var rec = scriptContext.currentRecord;
         var name = scriptContext.fieldId;
         var list = scriptContext.sublistId;

         log.debug('Field Change',scriptContext)
         if (list == 'expense' && name == 'amortizstartdate'||list == 'expense' && name == 'amortizationenddate'||list == 'expense' && name == 'amount'||list == 'expense' && name == 'department'){
             var Destination_account = rec.getCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_destination_account'});
             if (!isNullOrEmpty(Destination_account)){
                 rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'account',value: Destination_account})
                 rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_destination_account',value: ''})
                 rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_data',value: 'Change'})

             }
         }
         if (list == 'line' && name == 'startdate'||list == 'line' && name == 'enddate'||list == 'line' && name == 'debit'||list == 'line' && name == 'credit'||list == 'line' && name == 'department'){
             var Destination_account = rec.getCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_destination_account'});
             if (!isNullOrEmpty(Destination_account)){
                 rec.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: Destination_account})
                 rec.setCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_destination_account',value: ''})
                 rec.setCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_data',value: 'Change'})
             }
         }
  
         if (list == 'expense' && name == 'account'){
             var Destination_account = rec.getCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_destination_account'});
             if (!isNullOrEmpty(Destination_account)){
                 //rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'account',value: Destination_account})
                 rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_destination_account',value: ''})
                 rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'custcol_amr_data',value: 'Change'})

             }
         }
         if (list == 'line' && name == 'account'){
             var Destination_account = rec.getCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_destination_account'});
             if (!isNullOrEmpty(Destination_account)){
                 //rec.setCurrentSublistValue({sublistId: 'expense',fieldId: 'account',value: Destination_account})
                 rec.setCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_destination_account',value: ''})
                 rec.setCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_amr_data',value: 'Change'})

             }
         }



     }
     function validateDelete (scriptContext){
         var validation = true
         var rec = scriptContext.currentRecord;
         var rec_type = rec.type
         var sublist = 'expense'
         if (rec_type == 'journalentry'){
             sublist = 'line'
         }
         var AMR_DATA = rec.getCurrentSublistValue({sublistId: sublist ,fieldId: 'custcol_amr_data'});
         log.audit({
             title: 'DATA',
             details: sublist
         })
         if (!isNullOrEmpty(AMR_DATA)){
             validation = false
             var myMsg = message.create({
                 title: "Amortization Schedule Related",
                 message: "An Amortization Schedule is related to this Line, Please clear the Amortization Field before Deleting the Line",
                 type: message.Type.ERROR
             });
             myMsg.show();
         }
        
     return validation


     }
     function postSourcing(scriptContext) {
         
     }
 
     function validateLine  (scriptContext) {
         return true
     }
    
     function isNullOrEmpty(val) {
         if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
             return true;
         }
         return false;
     }

     exports.validateDelete = validateDelete
     exports.fieldChanged = fieldChanged
     //exports.validateLine    = validateLine   
        //exports.postSourcing = postSourcing
     return exports
 });