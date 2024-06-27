/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
      'N/query',
      'N/record',
      'N/runtime',
      'N/search',
      'N/task',
      'N/https',
      'N/encode',
], /**
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 */ (query, record, runtime, search, task, https, encode) => {
      const functions = {};

      const getFairValueBoundry = (low, high, fv) => {
            if (fv >= low && fv <= high) {
                  return fv;
            } else if (fv < low) {
                  return low;
            } else {
                  return high;
            }
      };

      const deleteOldRevenueLines = (allocationCalcId) => {
            const oldLines = query
                  .runSuiteQL({
                        query: `
            SELECT id
            FROM customrecord_hb_rev_alloc_line
            WHERE custrecord_hb_rev_alloc_calc = ${allocationCalcId}
            `,
                  })
                  .asMappedResults();
            oldLines.forEach((line) => {
                  log.debug('Deleting line', line);
                  record.delete({
                        id: line.id,
                        type: 'customrecord_hb_rev_alloc_line',
                  });
            });
      };

      const replacePlaceholders = (query, values) => {
            return query.replace(/\{(\d+)\}/g, function (match, index) {
                  const value = values[parseInt(index, 10) - 1];
                  return typeof value !== 'undefined' ? value : match;
            });
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

      functions.getInputData = (inputContext) => {
            return search.load({ id: 'customsearch_hb_create_rev_alloc_calc' });
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

      functions.map = (mapContext) => {
            log.debug('mapContext', mapContext);
            const key = mapContext.key;
            try {
                  const subscriptionId = key;
                  //newRecord.getValue({
                  //         fieldId: 'custrecord_hb_subscription_fv',
                  //   });
                  const calcRec = record.create({
                        type: 'customrecord_hb_rev_alloc_calc',
                  });
                  calcRec.setValue({
                        fieldId: 'custrecord_hb_subscription_fv',
                        value: key,
                  });
                  const calcId = calcRec.save();
                  log.debug('Calc ID', calcId);
                  const returnSalesAmount = runtime
                        .getCurrentScript()
                        .getParameter({
                              name: 'custscript_hb_ret_sales_amt_mr',
                        });
                  log.debug('Return Sales Amount', returnSalesAmount);
                  const allocationMapConfiguration = runtime
                        .getCurrentScript()
                        .getParameter({
                              name: 'custscript_hb_rev_alloc_map_config',
                        });
                  const allocationMapConfigurationRec = search.lookupFields({
                        type: 'customrecord_hb_rev_alloc_map_config',
                        id: allocationMapConfiguration,
                        columns: ['custrecord_hb_sql_config'],
                  })['custrecord_hb_sql_config'];
                  // log.debug(
                  //       `Allocation Map Config: ${allocationMapConfiguration}`,
                  //       allocationMapConfigurationRec
                  // );

                  //Delete old lines
                  deleteOldRevenueLines(calcId);
                  //
                  const subscriptionLines = query
                        .runSuiteQL({
                              query: `
                    SELECT 
                            SI.id as id,
                            SI.custrecordzab_si_quantity as qty, 
                            SI.custrecordzab_si_rate as rate, 
                            SI.custrecord_hb_duration_si as term, 
                            SI.custrecordzab_si_item as item, 
                            ROUND((SI.custrecordzab_si_end_date - SI.custrecordzab_si_start_date)/30) as duration, 
                            BUILTIN.DF(item.revenueallocationgroup) as rev_group,
                            BUILTIN.DF(SI.custrecordzab_si_class) as class
                            --S.custrecord_hb_module_fair_value as grouped_fv
                    FROM customrecordzab_subscription_item AS SI
                    LEFT JOIN customrecordzab_subscription AS S ON S.id = SI.custrecordzab_si_subscription
			        LEFT JOIN item  on item.id = SI.custrecordzab_si_item
                    WHERE custrecordzab_si_subscription = ${subscriptionId} --AND BUILTIN.DF(SI.custrecordzab_si_class) <> 'Implementation'
                    `,
                        })
                        .asMappedResults();
                  // const groupedFairValueQuery = '';
                  const groupedFairValueQueryAdj = replacePlaceholders(
                        allocationMapConfigurationRec,
                        [subscriptionId]
                  );
                  log.debug(
                        'groupedFairValueQueryAdj',
                        groupedFairValueQueryAdj
                  );
                  const groupedFairValue = query
                        .runSuiteQL({
                              query: groupedFairValueQueryAdj,
                              //           query: `
                              // SELECT TOP 1
                              //         RA.custrecord_hb_fair_value AS fair_value_price,
                              //         RA.custrecord_hb_num_of_modules AS number_of_modules,
                              //         (1 - RA.custrecord_hb_alloc_low_boundry) * RA.custrecord_hb_fair_value AS low_boundry,
                              //         (1 + RA.custrecord_hb_alloc_high_boudry) * RA.custrecord_hb_fair_value AS high_boundry,
                              //         custrecord_hb_imp_percent AS imp_percent
                              // FROM customrecordzab_subscription AS S
                              // LEFT JOIN Customer AS c ON c.id = S.custrecordzab_s_customer
                              // LEFT JOIN customrecord_hb_rev_alloc_map AS RA ON BUILTIN.DF(RA.custrecord_hb_acct_segment) = c.custentity_hb_account_segment AND RA.custrecord_hb_num_of_modules <= (
                              //       SELECT COUNT(SI.custrecordzab_si_item)
                              //       FROM customrecordzab_subscription AS S
                              //       LEFT JOIN  customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                              //       WHERE S.id = ${subscriptionId} AND BUILTIN.DF(SI.custrecordzab_si_class) <> 'Implementation'
                              //       GROUP BY S.id
                              // )
                              // WHERE S.id  = ${subscriptionId}
                              // ORDER BY RA.custrecord_hb_num_of_modules DESC
                              // `,
                        })
                        .asMappedResults();
                  log.debug('Selected Fair Value', groupedFairValue);
                  let groupedModuleRate = subscriptionLines.reduce((a, c) => {
                        return a + (c.class === 'Implementation' ? 0 : c.rate);
                  }, 0);
                  let totalModuleFV = 0;
                  let totalFV = 0;
                  const fairValue = groupedFairValue[0]['fair_value_price'];
                  const low = groupedFairValue[0]['low_boundry'];
                  const high = groupedFairValue[0]['high_boundry'];
                  const implementationPercent =
                        groupedFairValue[0]['imp_percent'];
                  const groupedPrice = subscriptionLines.reduce((a, c) => {
                        return a + (c.class === 'Implementation' ? 0 : c.rate);
                  }, 0);
                  const getSalesAmt = (line) => {
                        return line.class !== 'Implementation'
                              ? line.rate * line.qty * line.duration
                              : line.rate * line.qty;
                  };
                  const groupedSalesAmount = subscriptionLines.reduce(
                        (a, c) => {
                              return a + getSalesAmt(c);
                        },
                        0
                  );
                  const revenueAllocationLines = [];
                  subscriptionLines.forEach((line, i) => {
                        const groupedFV = getFairValueBoundry(
                              low,
                              high,
                              groupedPrice
                        );
                        const fvPercent = line.rate / groupedPrice;
                        const lineFV = fvPercent * groupedFV;

                        const fvAmount = lineFV * line.qty * line.duration; //fvPercent * groupedSalesAmount;

                        const salesAmount =
                              parseFloat(line.rate) *
                              parseFloat(line.qty) *
                              parseFloat(line.duration);
                        subscriptionLines[i]['fair_value'] = fvAmount;
                        subscriptionLines[i]['sales_amount'] = salesAmount;
                        if (line.class !== 'Implementation') {
                              totalModuleFV += lineFV;
                              totalFV += fvAmount;
                              revenueAllocationLines.push({
                                    custrecord_hb_subs_item_fv: line.id,
                                    custrecord_hb_revenue_group: line.rev_group,
                                    custrecord_hb_rev_alloc_item: line.item,
                                    custrecord_hb_rev_alloc_calc: calcId,
                                    custrecord_hb_module_rate: line.rate,
                                    custrecord_hb_minimum_ees: line.qty,
                                    custrecord_hb_term_months: line.duration,
                                    custrecord_hb_sales_amount: salesAmount,
                                    custrecord_hb_grouped_price: groupedPrice,
                                    custrecord_hb_grouped_fv_indicator:
                                          fairValue,
                                    custrecord_hb_low_boundry: low,
                                    custrecord_hb_high_boundry: high,
                                    custrecord_hb_in_range:
                                          groupedPrice >= low &&
                                          groupedPrice <= high,
                                    custrecord_hb_grouped_fv: groupedFV,
                                    custrecord_hb_rate_fv_percent: fvPercent,
                                    custrecord_hb_line_fv: lineFV,
                                    custrecord_hb_fv_amount: fvAmount,
                                    custrecord_hb_carve_in:
                                          fvAmount > salesAmount
                                                ? fvAmount - salesAmount
                                                : 0,
                                    custrecord_hb_carve_out:
                                          fvAmount < salesAmount
                                                ? fvAmount - salesAmount
                                                : 0,
                              });
                        }
                  });
                  revenueAllocationLines.forEach((revAllocLine) => {
                        const revAllocLineRec = record.create({
                              type: 'customrecord_hb_rev_alloc_line',
                        });
                        Object.entries(revAllocLine).forEach((pair) => {
                              revAllocLineRec.setValue({
                                    fieldId: pair[0],
                                    value: pair[1],
                              });
                        });
                        const recordId = revAllocLineRec.save();
                        log.debug('Revenue Allocation Line Created', recordId);
                  });

                  record.submitFields({
                        type: 'customrecord_hb_rev_alloc_calc',
                        id: calcId,
                        values: {
                              custrecord_hb_total_sales_amount:
                                    groupedSalesAmount,
                              custrecord_hb_total_module_rate:
                                    groupedModuleRate,
                              custrecord_hb_total_module_fv: totalModuleFV,
                              custrecord_hb_total_fv: totalFV,
                              custrecord_hb_ret_sales_amt: returnSalesAmount,
                              custrecord_hb_rev_imp_percent:
                                    implementationPercent,
                        },
                  });

                  subscriptionLines.forEach((subscriptionItem) => {
                        const values = {
                              custrecord_hb_saas_fv: returnSalesAmount
                                    ? subscriptionItem.sales_amount
                                    : subscriptionItem.fair_value,
                        };
                        log.debug(
                              `Updating Subscription Item: ${subscriptionItem.id}`,
                              values
                        );
                        record.submitFields({
                              type: 'customrecordzab_subscription_item',
                              id: subscriptionItem.id,
                              values,
                        });
                  });
                  record.submitFields({
                        type: 'customrecordzab_subscription',
                        id: subscriptionId,
                        values: { custrecord_hb_rev_alloc_rec: calcId },
                  });
                  // record.submitFields({
                  //       id: newRecord.id,
                  //       type: newRecord.type,
                  //       values: {
                  //             custrecord_hb_total_sales_amount:
                  //                   groupedSalesAmount,
                  //             custrecord_hb_total_module_rate:
                  //                   groupedModuleRate,
                  //             custrecord_hb_total_module_fv: totalModuleFV,
                  //             custrecord_hb_total_fv: totalFV,
                  //       },
                  // });
                  log.debug('Finished Subscription', subscriptionId);
            } catch (e) {
                  log.error('Error', e);
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
      // functions.reduce = (reduceContext) => {};

      const base64Encode = (str) => {
            return encode.convert({
                  string: str,
                  inputEncoding: encode.Encoding.UTF_8,
                  outputEncoding: encode.Encoding.BASE_64,
            });
      };

      const createRequestAuthHeader = () => {
            const username = 'api-token';
            const token =
                  'a19326ee8b3989584549671ad7a5249df5f3c78481806ba9224aca66bfe1ee29';

            const authHeader = 'Basic ' + base64Encode(username + ':' + token);
            return {
                  Authorization: authHeader,
                  'Content-Type': 'application/json',
            };
      };
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
      functions.summarize = (summaryContext) => {
            log.debug('summary', summaryContext);
            const data = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_ssp_mr_data' });
            log.debug('Data', data);
            try {
                  const parsedData = JSON.parse(data);
                  const {
                        callback_url,
                        callback_type,
                        callback_id,
                        script_activation,
                        params,
                  } = parsedData;
                  const parentTaskId = search.lookupFields({
                        type: 'customrecord_script_activation',
                        id: script_activation,
                        columns: ['custrecord_sa_script_taskid'],
                  })['custrecord_sa_script_taskid'];
                  log.debug('Parent Task ID', parentTaskId);
                  const parentTask = task.checkStatus({ taskId: parentTaskId });

                  log.debug('Parent Task Status', parentTask.status);
                  const body = {
                        callback_type,
                        script_activation,
                        callback_id,
                  };
                  log.debug('Params', params);
                  log.debug('Params', JSON.stringify(Object.entries(params)));
                  Object.entries(params).forEach((param) => {
                        // log.debug('Adding param', param);
                        body[param[0]] = param[1];
                  });
                  log.debug('Body', body);
                  const response = https.post({
                        url: callback_url,
                        body: JSON.stringify(body),
                        headers: createRequestAuthHeader(),
                  });
                  log.debug('Response', response);
            } catch (e) {
                  log.error('Error Occurred in Summarize function', e);
            }
      };

      return functions;
});
