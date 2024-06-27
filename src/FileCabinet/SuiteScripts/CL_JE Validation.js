/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

define(['N/search','N/currency','N/ui/dialog','N/ui/message','N/record'],
    function ( search,currency,ui,message,record ) {
        var exports = {};

        function pageInit (scriptContext){
            var rec = scriptContext.currentRecord;
            var Clearing_Account = rec.getValue('custbody_clearing_account');
            var Bank_Account = rec.getValue('custbody_bank_account');
            if (Clearing_Account && Bank_Account){
                var Budget_Type = rec.getField({fieldId:'custbody_cash_flow_type'})
                Budget_Type.isMandatory = true

            }

        }
        function saveRecord (scriptContext){
            var rec = scriptContext.currentRecord;
            var valitation = true
            var Clearing_Account = rec.getValue('custbody_clearing_account');
            var Bank_Account = rec.getValue('custbody_bank_account');
            if (Clearing_Account && Bank_Account){
                var Budget_Type_Value = rec.getValue({fieldId:'custbody_cash_flow_type'})
                if (isNullOrEmpty(Budget_Type_Value)){
                    var Message = message.create({
                        title: "Missing Cash Flow Value",
                        message: "This Journal Entry requires a specific classification for Cashflow Report. Please fill the mandatory field",
                        type: message.Type.ERROR
                    });
                    Message.show();
                    valitation = false
                }
              
            }

            return valitation

        }
        
        
        function validateLine  (scriptContext) {
            var rec = scriptContext.currentRecord;
            var sublistName = scriptContext.sublistId;
            if (sublistName === 'line'){
            
            var AccountID = rec.getCurrentSublistValue({sublistId: 'line',fieldId: 'account'});
            if (!isNullOrEmpty(AccountID)){
                var Account = record.load({
                    type : 'account',
                    id: AccountID,
                    isDynamic:false
                })

                var Account_Type = Account.getValue({fieldId: 'accttype'});
                var Budget_Category = Account.getValue({fieldId: 'custrecord_cash_flow_category'});
                //var Budget_Category = rec.getCurrentSublistValue({sublistId: 'line',fieldId: 'custcol_budget_category_account'});
                if (Account_Type == 'Bank'){
                    rec.setText('custbody_bank_account','T')
                }
                if (isNullOrEmpty(Budget_Category) && Account_Type != 'Bank'){
                    rec.setText('custbody_clearing_account','T')
                }
                log.debug({
                    title: 'Line Detail',
                    details: '{Account_Type :' + Account_Type + ', Budget_Category :' + Budget_Category + '}'
                })
                var Clearing_Account = rec.getValue('custbody_clearing_account');
                var Bank_Account = rec.getValue('custbody_bank_account');
                log.debug({
                    title: 'Clearing & Bank Value',
                    details: '{Bank :' + Bank_Account + ', Clearing :' + Clearing_Account + '}'
                })
                if (Clearing_Account && Bank_Account){
                    var Budget_Type = rec.getField({fieldId:'custbody_cash_flow_type'})
                    Budget_Type.isMandatory = true

                }
                log.debug({title:'AccountID',details: AccountID});
            }
            return true
            }
        }
       
        function isNullOrEmpty(val) {
            if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
                return true;
            }
            return false;
        }
        exports.saveRecord    = saveRecord   
        exports.validateLine    = validateLine   
        exports.pageInit= pageInit
        return exports
    });