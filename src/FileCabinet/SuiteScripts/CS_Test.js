/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param{record} record
 * @param{search} search
 */
function(record, search) {
    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        let currentRecord = scriptContext.currentRecord;
        let recordType = currentRecord.type;
        if (recordType === record.Type.INVOICE || recordType === record.Type.CREDIT_MEMO) {
            let postingPeriod = currentRecord.getValue({fieldId: 'postingperiod'});
            let systemNotesSearch = search.create({
                type: "systemnote",
                filters:
                    [
                        ["recordtype","anyof","-105"],
                        "AND",
                        ["recordid","equalto",postingPeriod],
                        "AND",
                        ["field","anyof","ACCOUNTINGPERIOD.PCP_CLOSE"],
                        "AND",
                        ["oldvalue","is","Closed"],
                        "AND",
                        ["newvalue","is","Open"]
                    ],
                columns:
                    [
                        search.createColumn({name: "date", label: "Date"}),
                    ]
            });
            let searchResultCount = systemNotesSearch.runPaged().count;
            if (searchResultCount > 0) {
                return confirm(`You trying to save transaction for period that was closed previously. Are you certain you want to proceed?`);
            }
            return true;
        }
    }
    return {
        saveRecord: saveRecord
    };
    
});
