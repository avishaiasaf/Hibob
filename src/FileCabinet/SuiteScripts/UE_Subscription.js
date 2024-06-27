/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 * 
 */

define(['N/record', 'N/url', 'N/search', 'N/format','N/task','N/query','N/runtime', 'N/log'],
    function (record, url, search, format, task,query,runtime,log) {
        var exports = {}
        function beforeload(context) {
            var Rec = context.newRecord;
            var link = Rec.getValue({fieldId:'custrecord_url_file_validate_contract'});
            
            var status_valid = Rec.getValue({fieldId:'custrecord_sub_valid_for_approval'});
            if (!isNullOrEmpty(link) && status_valid != 4){
               
                var thisForm = context.form;
                thisForm.addButton({id: "custpage_verification",label: 'View Result Verification',functionName: 'create_button("' + link + '")'});
                thisForm.clientScriptModulePath = "SuiteScripts/CL_Subscription.js"
        }
        };
        function beforesubmit(context) {  
        };
        function afersubmit(context) {
        };
        exports.beforeLoad = beforeload;
        //exports.beforeSubmit = beforesubmit;
        //exports.afterSubmit = afersubmit;
        return exports
        function isNullOrEmpty(val) {
            if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
                return true;
            }
            return false;
        } 
    }
);
  