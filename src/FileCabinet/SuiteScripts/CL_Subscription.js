/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/ui/message'],
function (message) {
    var exports = {};
    function create_button (url) {
        window.open(url)
    }
    function pageInit(context) {
        var rec = context.currentRecord
        log.debug({
            title: 'test',
            details: 'test'
        })
        var valid_m = message.create({
            title: "Subscription Valid",
            message: "Test",
            type: message.Type.CONFIRMATION
        });
        valid_m.show({ duration : 50000 }); 
        var status = rec.getValue('custrecord_sub_valid_for_approval');
        if (status == 1){
            var valid_m = message.create({
                title: "Subscription Valid",
                message: "Test",
                type: message.Type.CONFIRMATION
            });
            valid_m.show({ duration : 1500 }); 
        }
        if (status == 2){
            var error_m = message.create({
                title: "Subscription isn't Valid",
                message: "Test",
                type: message.Type.ERROR
            });
            error_m.show({ duration : 1500 }); 
        }
        
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