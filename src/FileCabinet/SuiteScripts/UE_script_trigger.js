/**
 * @NAPIVersion 2.1
 * @NscriptType UserEventScript
 * @NmoduleScope SameAccount
 *
 */

define([
    'N/record',
    'N/error',
    'N/search',
    'N/format',
    'N/task',
    'N/query',
    'N/runtime',
    'N/log',
], function (record, error, search, format, task, query, runtime, log) {
    var exports = {};
    function beforeload(context) {}
    function beforesubmit(context) {}
    function afersubmit(context) {
        var Rec = record.load({
            type: context.newRecord.type,
            id: context.newRecord.id,
        });
        var script_task = Rec.getValue('custrecord_sa_script_taskid');
        if (isNullOrEmpty(script_task)) {
            var script_id = Rec.getValue('custrecord_sa_script_id');
            var script_type = Rec.getValue('custrecord_sa_script_type');
            var script_deploy = Rec.getValue('custrecord_sa_script_deployment');

            // Adding params
            const params = Rec.getValue('custrecord_sa_params');

            var scriptTask = task.create({ taskType: script_type });

            // Adding params
            if (params) {
                log.debug('Task Params', params);
                const taskParams = JSON.parse(params);
                scriptTask.params = taskParams;
                scriptTask.params[Object.keys(taskParams)[0]][
                    'script_activation'
                ] = Rec.id;
            }

            scriptTask.scriptId = script_id;
            scriptTask.deploymentId = script_deploy;
            var scriptTaskId = scriptTask.submit();
            log.debug({
                title: 'scriptTaskId',
                details: scriptTaskId,
            });
            Rec.setValue('custrecord_sa_script_taskid', scriptTaskId);
            Rec.save();
        }
    }
    function isNullOrEmpty(val) {
        if (
            typeof val == 'undefined' ||
            val == null ||
            (typeof val == 'string' && val.length == 0)
        ) {
            return true;
        }
        return false;
    }
    function FormatDate(date) {
        var parsedDate = format.parse({
            value: date,
            type: format.Type.DATE,
        });
        return parsedDate;
    }
    //exports.beforeLoad = beforeload
    //exports.beforeSubmit = beforesubmit
    exports.afterSubmit = afersubmit;
    return exports;
});
