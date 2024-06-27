/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/query'], /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */ (record, runtime, search, query) => {
      const filterApproversBySubsidiary = (approvers, vendorId) => {
            log.debug('Approvers before Filter', approvers);
            const filteredApprovers = query
                  .runSuiteQL({
                        query: `
                              SELECT value, text, subsidiary
                              FROM 
                              (
                                    SELECT 
                                        id as value, 
                                        firstname || ' ' || lastname as text, 
                                        CASE WHEN BUILTIN.DF(subsidiary) IN('HB IL', 'HB AU', 'HB US', 'HB CA') THEN 'ROW' ELSE 'EMEA' END AS subsidiary
                                    FROM Employee                           
                              )
                              WHERE value IN(${approvers.map((item) => {
                                    return item.value;
                              })})  AND subsidiary = (
                                SELECT CASE WHEN S.name IN('HB IL', 'HB AU', 'HB US', 'HB CA') THEN 'ROW' ELSE 'EMEA' END 
                                FROM Vendor AS v
                                LEFT JOIN EntitySubsidiaryRelationShip AS ESR ON ESR.entity = v.id
                                LEFT JOIN Subsidiary as S ON S.id = ESR.subsidiary
                                WHERE v.id = ${vendorId}
                            )
                        `,
                  })
                  .asMappedResults();
            // .forEach((approver) => {
            //       filteredApprovers.push(approver.id);
            // });
            log.debug('Filtered Approvers', filteredApprovers);
            return filteredApprovers;
      };
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
      const onAction = (scriptContext) => {
            const bankDetailsApprovers = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_bda_rec_id' });
            const vendorId = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_bda_ven_id' });
            const level = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_approval_level' });
            const availableApproversRecordId = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_approvers_record' });
            const removeUser = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_remove_user' });
            log.debug(
                  'Parameters',
                  `bank details approvers: ${bankDetailsApprovers}, vendor id: ${vendorId}, level: ${level}, available Approvers Record Id: ${availableApproversRecordId}`
            );
            const approversRecord = search.lookupFields({
                  type: 'customrecord_hb_bank_details_approvers',
                  id: bankDetailsApprovers,
                  columns: [
                        'custrecord_hb_first_approvers',
                        'custrecord_hb_second_approvers',
                  ],
            });
            // const removeApprovers = search.lookupFields({
            //     type: 'vendor',
            //     id: vendorId,
            //     columns: ['custentity_mis_first_approver'],
            // });
            log.debug('Remove Approvers', removeUser);
            const firstApprovers = filterApproversBySubsidiary(
                  approversRecord['custrecord_hb_first_approvers'],
                  vendorId
            );
            const secondApprovers = filterApproversBySubsidiary(
                  approversRecord['custrecord_hb_second_approvers'],
                  vendorId
            );
            const availableApprovers =
                  level == 1
                        ? firstApprovers
                        : secondApprovers.filter((id) => {
                                log.debug(
                                      'filter',
                                      `id: ${id.value}, remove user: ${removeUser}`
                                );
                                return id.value != removeUser;
                          });
            log.debug(
                  'Available Approvers',
                  availableApprovers.map((item) => {
                        return item.value;
                  })
            );
            const availableApproversRecord = record.load({
                  type: 'customrecord_hb_available_approvers',
                  id: availableApproversRecordId,
            });
            availableApproversRecord.setValue({
                  fieldId: 'custrecord_hb_available_approvers_1',
                  value: availableApprovers.map((item) => {
                        return item.value;
                  }),
            });
            availableApproversRecord.save();
            // if (level == 1) {
            // record.submitFields({
            //       type: 'vendor',
            //       id: vendorId,
            //       values: {
            //             custentity_hb_available_approvers_rec:
            //                   availableApproversRecordId,
            //       },
            // });
            return 'DONE';
            // }
      };

      return { onAction };
});
