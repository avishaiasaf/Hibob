/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record'], /**
 * @param{query} query
 * @param{record} record
 */ (query, record) => {
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
            const queryResults = query
                  .runSuiteQL({
                        query: `
                    SELECT RA.custrecord_hb_fair_value_price_t AS fair_value_price
                    FROM customrecordzab_subscription AS S
                    LEFT JOIN Customer AS c ON c.id = S.custrecordzab_s_customer
                    LEFT JOIN customrecord_hb_revenue_allocation AS RA ON BUILTIN.DF(RA.custrecord_hb_account_segment) = c.custentity_hb_account_segment AND RA.custrecord_hb_no_of_modules = (
                    SELECT COUNT(SI.custrecordzab_si_item)
                    FROM customrecordzab_subscription AS S
                    LEFT JOIN  customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                    WHERE S.id = ${newRecord.id} AND BUILTIN.DF(SI.custrecordzab_si_class) <> 'Implementation'
                    GROUP BY S.id
                    )
                    WHERE S.id  = ${newRecord.id}
                `,
                  })
                  .asMappedResults();

            const fairValue = queryResults[0]['fair_value_price'];
            log.debug(
                  'Subscription ' + newRecord.id,
                  `Fair Value Price ${fairValue}`
            );
            record.submitFields({
                  id: newRecord.id,
                  type: newRecord.type,
                  values: {
                        custrecord_hb_module_fair_value: fairValue,
                  },
            });
      };

      return EntryPoints;
});
