/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record'],

function(currentRecord,record) {
	'use strict';
	/**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function pageInit(scriptContext) {
    }
    
    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function fieldChanged(scriptContext) {
    	var rec = scriptContext.currentRecord;
    	// Start DT 962
    	if(rec.type == record.Type.INVOICE) {
    		var sublistName = scriptContext.sublistId;
    		if(sublistName == 'item' && (scriptContext.fieldId == 'custcol_hb_num_of_employee' || scriptContext.fieldId == 'custcol_hb_num_of_month')) {
    			var numOfEmployees = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_hb_num_of_employee'});
    			var numOfMonths = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_hb_num_of_month'});
    			var total = Number(numOfEmployees) * Number(numOfMonths);
    			rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: total});
    		}
    	}
    	// End DT 962
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function postSourcing(scriptContext) {
    	    
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function sublistChanged(scriptContext) {
     }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function lineInit(scriptContext) {
     }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function validateField(scriptContext) {
    	return true;
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function validateLine(scriptContext) {
    	return true;
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function validateInsert(scriptContext) {
		return true;
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function validateDelete(scriptContext) {
    	return true;
    }

    /**
	 * @memberOf NCS.Client.Transaction.Forms
	 * @param {Object} scriptContext 
	 **/
    function saveRecord(scriptContext) {
    	return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord
    };
    
});