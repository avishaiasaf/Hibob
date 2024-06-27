/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task'], /**
 * @param{task} task
 */ (task) => {
      const EntryPoints = {};
      /**
       * Defines the function definition that is executed before record is loaded.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @param {Form} scriptContext.form - Current form
       * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
       * @since 2015.2
       */
      // EntryPoints.beforeLoad = (scriptContext) => {};

      /**
       * Defines the function definition that is executed before record is submitted.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @since 2015.2
       */
      // EntryPoints.beforeSubmit = (scriptContext) => {};

      /**
       * Defines the function definition that is executed after record is submitted.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @since 2015.2
       */
      EntryPoints.afterSubmit = ({ newRecord }) => {
            const taskId = newRecord.getValue({
                  fieldId: 'custrecord_hb_task_id',
            });

            var taskStatus = task.checkStatus({ taskId });
            log.debug('status', taskStatus.status);

            log.debug('status', taskStatus);
      };

      return EntryPoints;
});
