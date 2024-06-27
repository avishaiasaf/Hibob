/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record', 'N/file', 'N/compress'], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, file, compress) => {
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
            const subscriptionId = newRecord.getValue({
                  fieldId: 'custrecord_hb_subscription_v',
            });
            const subscriptionName = newRecord.getText({
                  fieldId: 'custrecord_hb_subscription_v',
            });
            const version = newRecord.getValue({
                  fieldId: 'custrecord_hb_subs_version',
            });
            const subscriptionData = query
                  .runSuiteQL({
                        query: `
                        SELECT SI.*, S.*
                        FROM customrecordzab_subscription AS S
                        LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                        WHERE S.id = ${subscriptionId}
                        `,
                  })
                  .asMappedResults();

            const chargeData = query
                  .runSuiteQL({
                        query: `
                        SELECT *
                        FROM customrecordzab_charge AS CH
                        WHERE CH.custrecordzab_c_subscription = ${subscriptionId}
                        `,
                  })
                  .asMappedResults();

            const revenueDetailData = query
                  .runSuiteQL({
                        query: `
                        SELECT *
                        FROM customrecordzab_revenue_detail AS RD
                        WHERE RD.custrecordzab_rd_subscription = ${subscriptionId}
                        `,
                  })
                  .asMappedResults();

            const data = JSON.stringify({
                  subscriptionData,
                  chargeData,
                  revenueDetailData,
            });

            const versionFile = file.create({
                  name: `${subscriptionName}-${version}.txt`,
                  fileType: file.Type.PLAINTEXT,
                  contents: data,
                  folder: 1602720,
            });
            const gzipedFile = compress.gzip({
                  file: versionFile,
                  level: 9,
            });
            gzipedFile.folder = 1602720;
            const fileId = gzipedFile.save();
            record.submitFields({
                  type: newRecord.type,
                  id: newRecord.id,
                  values: {
                        custrecord_hb_version_file: fileId,
                  },
            });
      };

      return EntryPoints;
});
