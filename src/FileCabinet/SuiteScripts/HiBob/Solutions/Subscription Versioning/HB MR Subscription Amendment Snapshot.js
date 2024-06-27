/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
      'N/compress',
      'N/file',
      'N/query',
      'N/record',
      'N/search',
      'N/runtime',
], /**
 * @param{compress} compress
 * @param{file} file
 * @param{query} query
 * @param{record} record
 * @param{search} search
 */ (compress, file, query, record, search, runtime) => {
      const methods = {};

      const queries = {
            subscriptionData: (subscriptionId) => {
                  return `
                        SELECT S.*
                        FROM customrecordzab_subscription AS S
                        WHERE S.id = ${subscriptionId}
                        `;
            },
            subscriptionItemsData: (subscriptionId) => {
                  return `
                        SELECT SI.*
                        FROM customrecordzab_subscription AS S
                        LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                        WHERE S.id = ${subscriptionId}
                        `;
            },
            chargeData: (subscriptionId) => {
                  return `
                        SELECT *
                        FROM customrecordzab_charge AS CH
                        WHERE CH.custrecordzab_c_subscription = ${subscriptionId}
                        `;
            },
            revenueDetailData: (subscriptionId) => {
                  return `
                        SELECT *
                        FROM customrecordzab_revenue_detail AS RD
                        WHERE RD.custrecordzab_rd_subscription = ${subscriptionId}
                        `;
            },
            priceBookData: (subscriptionId) => {
                  return `
                        SELECT PB.*
                        FROM customrecordzab_subscription AS S
                        LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                        LEFT JOIN customrecordzab_price_book AS PB ON PB.id = SI.custrecordzab_si_price_book
                        WHERE S.id = ${subscriptionId}
                        `;
            },
            priceTiersData: (subscriptionId) => {
                  return `
                        SELECT PT.*
                        FROM customrecordzab_subscription AS S
                        LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                        LEFT JOIN customrecordzab_price_book AS PB ON PB.id = SI.custrecordzab_si_price_book
                        LEFT JOIN customrecordzab_pricing_tier AS PT ON PB.id = PT.custrecordzab_pricing_tier_price_book
                        WHERE S.id = ${subscriptionId}
                        `;
            },
      };

      const getData = (subscriptionId) => {
            const data = {};
            Object.entries(queries).forEach((q) => {
                  data[q[0]] = query
                        .runSuiteQL({
                              query: q[1](subscriptionId),
                        })
                        .asMappedResults();
            });
            return JSON.stringify(data);
      };

      const createVersionFile = (
            subscriptionName,
            subscriptionVersion,
            folder,
            data
      ) => {
            const versionFile = file.create({
                  name: `${subscriptionName}-${subscriptionVersion}.txt`,
                  fileType: file.Type.PLAINTEXT,
                  contents: data,
                  folder,
            });
            const gzipedFile = compress.gzip({
                  file: versionFile,
                  level: 9,
            });
            gzipedFile.folder = folder;
            return gzipedFile.save();
      };
      /**
       * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
       * @param {Object} inputContext
       * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
       *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
       * @param {Object} inputContext.ObjectRef - Object that references the input data
       * @typedef {Object} ObjectRef
       * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
       * @property {string} ObjectRef.type - Type of the record instance that contains the input data
       * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
       * @since 2015.2
       */

      methods.getInputData = (inputContext) => {
            return search.load({
                  id: 'customsearch_hb_version_snapshot_queue',
            });
      };

      /**
       * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
       * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
       * context.
       * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
       *     is provided automatically based on the results of the getInputData stage.
       * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
       *     function on the current key-value pair
       * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
       *     pair
       * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
       *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
       * @param {string} mapContext.key - Key to be processed during the map stage
       * @param {string} mapContext.value - Value to be processed during the map stage
       * @since 2015.2
       */

      methods.map = (mapContext) => {
            try {
                  log.debug('mapContext', mapContext);
                  const values = JSON.parse(mapContext.value).values;
                  const subscriptionId =
                        values['custrecord_hb_subscription_v'].value;
                  const subscriptionName =
                        values['custrecord_hb_subscription_v'].text;
                  const subscriptionVersion =
                        values['custrecord_hb_subs_version'];
                  log.debug('Subscription Id', subscriptionId);
                  log.debug(
                        'values',
                        `subscriptionName: ${subscriptionName}, subscriptionVersion: ${subscriptionVersion}`
                  );
                  const folder = runtime.getCurrentScript().getParameter({
                        name: 'custscript_hb_snapshot_folder',
                  });
                  const data = getData(subscriptionId);
                  const fileId = createVersionFile(
                        subscriptionName,
                        subscriptionVersion,
                        folder,
                        data
                  );

                  const id = JSON.parse(mapContext.value).id;
                  const type = JSON.parse(mapContext.value).recordType;
                  log.debug(
                        'Sanpshot Saved',
                        `Folder: ${folder}, File: ${fileId}, Version record: ${id}`
                  );

                  //Update the Subscription Version Record
                  record.submitFields({
                        type,
                        id,
                        values: {
                              custrecord_hb_version_file: fileId,
                              custrecord_hb_update_finished: true,
                        },
                  });

                  //Update the ZAB Subscription record
                  record.submitFields({
                        type: 'customrecordzab_subscription',
                        id: subscriptionId,
                        values: {
                              custrecord_hb_subs_version_s: id,
                        },
                  });

                  //Update Subscription Items
                  query.runSuiteQL({
                        query: `
                        SELECT SI.id AS id
                        FROM customrecordzab_subscription AS S
                        LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                        WHERE S.id = ${subscriptionId}
                        `,
                  })
                        .asMappedResults()
                        .forEach((si) => {
                              record.submitFields({
                                    type: 'customrecordzab_subscription_item',
                                    id: si.id,
                                    values: {
                                          custrecord_hb_subscription_version:
                                                id,
                                    },
                              });
                        });
            } catch (e) {
                  log.error('Error Occurred', e);
            }
      };

      /**
       * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
       * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
       * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
       *     provided automatically based on the results of the map stage.
       * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
       *     reduce function on the current group
       * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
       * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
       *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
       * @param {string} reduceContext.key - Key to be processed during the reduce stage
       * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
       *     for processing
       * @since 2015.2
       */
      // methods.reduce = (reduceContext) => {};

      /**
       * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
       * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
       * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
       * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
       *     script
       * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
       * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
       *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
       * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
       * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
       * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
       *     script
       * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
       * @param {Object} summaryContext.inputSummary - Statistics about the input stage
       * @param {Object} summaryContext.mapSummary - Statistics about the map stage
       * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
       * @since 2015.2
       */
      methods.summarize = (summaryContext) => {
            log.debug('End Execution');
      };

      return methods;
});
