/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/action', 'N/query', 'N/search', 'N/task'], /**
 * @param{action} action
 * @param{query} query
 * @param{search} search
 * @param{task} task
 */ (action, query, search, task) => {
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
            log.debug('Executing After submit');

            const arngId = newRecord.getValue({
                  fieldId: 'custrecord_hb_rev_argmt',
            });

            //Using the N/task module
            const recordActionTask = task.create({
                  taskType: task.TaskType.RECORD_ACTION,
            });
            recordActionTask.recordType = 'revenuearrangement';
            recordActionTask.action = 'allocate';
            recordActionTask.params = { recordId: 1 };
            recordActionTask.submit(); //Returns the Task ID

            //Using the N/action module
            const recordAction = action.get({
                  recordType: 'revenuearrangement',
                  id: 'allocate',
            });
            recordAction.executeBulk({
                  params: [
                        {
                              recordId: 1,
                        },
                        {
                              recordId: 5,
                        },
                  ],
            }); //Returns the Task ID

            // recordActionTask.paramCallback = function (v) {
            //       return { recordId: v, note: 'this is a note for ' + v };
            // };

            // recordActionTask.condition =
            //       task.ActionCondition.ALL_QUALIFIED_INSTANCES;
            // recordActionTask.paramCallback = function (v) {
            //       return { recordId: v };
            // };

            // const response = action.execute({
            //       recordType: 'revenuearrangement',
            //       id: 'allocate',
            //       params: [{ recordId: 2 }, { recordId: 4 }],
            // });
            // var actionObj = action.get({
            //       recordType: 'revenuearrangement',
            //       id: 'allocate',
            // });
            // var handle = actionObj.executeBulk({
            //       params: [
            //             {
            //                   recordId: 1,
            //             },
            //             {
            //                   recordId: 5,
            //             },
            //             {
            //                   recordId: 23,
            //             },
            //       ],
            // });
            log.debug('response', handle);

            // var handle = recordActionTask.submit();
            // log.debug('handle', handle);
            // var taskStatus = task.checkStatus({ taskId: handle });
            // log.debug('status', taskStatus.status);

            // log.debug('arngId', arngId);
            // const actionList = action.find({
            //       recordType: 'revenuearrangement',
            // });
            // log.debug('actionList', actionList);
            // const actionObj = action.get({
            //       recordType: 'revenuearrangement',
            //       id: 'allocate',
            // });
            // log.debug('actionObj', actionObj);
            // // const result = actionObj.execute({ recordId: arngId });
            // // log.debug('result', result);
            // // const execObj = action.execute({
            // //       recordType: 'revenuearrangement',
            // //       id: 'allocate',
            // //       params: { recordId: arngId },
            // // });
            // // log.debug('Execution', execObj);
            //
            // const handle = action.executeBulk({
            //       recordType: 'revenuearrangement',
            //       id: 'allocate',
            //       condition: action.ALL_QUALIFIED_INSTANCES,
            //       paramCallback: function (v) {
            //             return {
            //                   recordId: v,
            //                   note: 'this is a note for ' + v,
            //             };
            //       },
            // });
      };

      return EntryPoints;
});
