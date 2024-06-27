/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record'], /**
 * @param{record} record
 */ (record) => {
      /**
       * Defines the WorkflowAction script trigger point.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
       * @param {string} scriptContext.type - Event type
       * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
       * @since 2016.1
       */
      const onAction = ({ newRecord }) => {
            const { id, type } = newRecord;
            const copyRec = record.create({ type });
            const recId = copyRec.save({ ignoreMandatoryFields: true });
            log.debug('New Record', recId);
            const values = {};
            const fields = newRecord.getFields();
            const recordObj = record.load({ type, id: recId });
            fields.forEach((field) => {
                  const value = newRecord.getValue({ fieldId: field });
                  if (
                        field.includes('custrecord') &&
                        !String(value).includes('https://')
                  ) {
                        values[field] = value;
                        try {
                              recordObj.setValue({
                                    fieldId: field,
                                    value: values[field],
                              });
                        } catch (e) {
                              log.error(
                                    'Error Setting Field ' + field,
                                    values[field]
                              );
                        }
                  }
            });
            log.debug('Fields', values);
            recordObj.save({
                  ignoreMandatoryFields: true,
                  enableSourcing: true,
            });

            // record.submitFields({
            //       id: recId,
            //       type,
            //       values,
            // });
      };

      return { onAction };
});
