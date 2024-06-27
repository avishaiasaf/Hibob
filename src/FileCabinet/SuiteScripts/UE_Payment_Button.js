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
  