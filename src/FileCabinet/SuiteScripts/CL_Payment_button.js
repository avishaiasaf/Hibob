/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

define(['N/search','N/currency','N/currentRecord','N/ui/dialog','N/ui/message','N/record','N/query'],
function ( search,currency,cr,ui,message,record,query) {
    var exports = {};
    function create_button (url) {
        window.open(url)
    }
    function pageInit(context) {
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
    exports.create_button = create_button
    exports.pageInit = pageInit
    //exports.validateLine    = validateLine   
    //exports.postSourcing = postSourcing
    return exports
});