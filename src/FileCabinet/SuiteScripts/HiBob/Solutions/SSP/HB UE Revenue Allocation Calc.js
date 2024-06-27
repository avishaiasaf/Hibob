/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record', 'N/runtime'], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, runtime) => {
      const EntryPoints = {};

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
      EntryPoints.afterSubmit = ({ newRecord }) => {
            try {
                  const subscriptionId = newRecord.getValue({
                        fieldId: 'custrecord_hb_subscription_fv',
                  });

                  const returnSalesAmount = runtime
                        .getCurrentScript()
                        .getParameter({
                              name: 'custscript_hb_get_sales_amount',
                        });
                  log.debug('Return Sales Amount', returnSalesAmount);
                  newRecord.setValue({
                        fieldId: 'custrecord_hb_ret_sales_amt',
                        value: returnSalesAmount,
                  });

                  //Delete old lines
                  deleteOldRevenueLines(newRecord.id);
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
                            BUILTIN.DF(item.revenueallocationgroup) as rev_group
                            --S.custrecord_hb_module_fair_value as grouped_fv
                    FROM customrecordzab_subscription_item AS SI
                    LEFT JOIN customrecordzab_subscription AS S ON S.id = SI.custrecordzab_si_subscription
			        LEFT JOIN item  on item.id = SI.custrecordzab_si_item
                    WHERE custrecordzab_si_subscription = ${subscriptionId}
                    `,
                        })
                        .asMappedResults();
                  const groupedFairValue = query
                        .runSuiteQL({
                              query: `
                    SELECT 
                            RA.custrecord_hb_fair_value AS fair_value_price,
                            (1 - RA.custrecord_hb_alloc_low_boundry) * RA.custrecord_hb_fair_value AS low_boundry, 
                            (1 + RA.custrecord_hb_alloc_high_boudry) * RA.custrecord_hb_fair_value AS high_boundry
                    FROM customrecordzab_subscription AS S
                    LEFT JOIN Customer AS c ON c.id = S.custrecordzab_s_customer
                    LEFT JOIN customrecord_hb_rev_alloc_map AS RA ON BUILTIN.DF(RA.custrecord_hb_acct_segment) = c.custentity_hb_account_segment AND RA.custrecord_hb_num_of_modules = (
                    SELECT COUNT(SI.custrecordzab_si_item)
                    FROM customrecordzab_subscription AS S
                    LEFT JOIN  customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                    WHERE S.id = ${subscriptionId} AND BUILTIN.DF(SI.custrecordzab_si_class) <> 'Implementation'
                    GROUP BY S.id
                    )
                    WHERE S.id  = ${subscriptionId}
                    `,
                        })
                        .asMappedResults();
                  let groupedModuleRate = subscriptionLines.reduce((a, c) => {
                        return a + c.rate;
                  }, 0);
                  let totalModuleFV = 0;
                  let totalFV = 0;
                  const fairValue = groupedFairValue[0]['fair_value_price'];
                  const low = groupedFairValue[0]['low_boundry'];
                  const high = groupedFairValue[0]['high_boundry'];
                  const groupedPrice = subscriptionLines.reduce((a, c) => {
                        return a + c.rate;
                  }, 0);
                  const groupedSalesAmount = subscriptionLines.reduce(
                        (a, c) => {
                              return a + c.rate * c.qty * c.duration;
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
                        totalModuleFV += lineFV;

                        const fvAmount = lineFV * line.qty * line.duration; //fvPercent * groupedSalesAmount;
                        totalFV += fvAmount;
                        const salesAmount =
                              parseFloat(line.rate) *
                              parseFloat(line.qty) *
                              parseFloat(line.duration);
                        subscriptionLines[i]['fair_value'] = fvAmount;
                        subscriptionLines[i]['sales_amount'] = salesAmount;
                        revenueAllocationLines.push({
                              custrecord_hb_subs_item_fv: line.id,
                              custrecord_hb_revenue_group: line.rev_group,
                              custrecord_hb_rev_alloc_item: line.item,
                              custrecord_hb_rev_alloc_calc: newRecord.id,
                              custrecord_hb_module_rate: line.rate,
                              custrecord_hb_minimum_ees: line.qty,
                              custrecord_hb_term_months: line.duration,
                              custrecord_hb_sales_amount: salesAmount,
                              custrecord_hb_grouped_price: groupedPrice,
                              custrecord_hb_grouped_fv_indicator: fairValue,
                              custrecord_hb_low_boundry: low,
                              custrecord_hb_high_boundry: high,
                              custrecord_hb_in_range:
                                    groupedPrice >= low && groupedPrice <= high,
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

                  newRecord.setValue({
                        fieldId: 'custrecord_hb_total_sales_amount',
                        value: groupedSalesAmount,
                  });
                  newRecord.setValue({
                        fieldId: 'custrecord_hb_total_module_rate',
                        value: groupedModuleRate,
                  });
                  newRecord.setValue({
                        fieldId: 'custrecord_hb_total_module_fv',
                        value: totalModuleFV,
                  });
                  newRecord.setValue({
                        fieldId: 'custrecord_hb_total_fv',
                        value: totalFV,
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
            } catch (e) {
                  log.error('Error', e);
            }
      };

      /**
       * Defines the function definition that is executed after record is submitted.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @since 2015.2
       */
      // EntryPoints.afterSubmit = (scriptContext) => {};

      return EntryPoints;
});
