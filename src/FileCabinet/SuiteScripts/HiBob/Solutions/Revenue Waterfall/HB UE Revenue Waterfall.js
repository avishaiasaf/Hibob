/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
      'N/query',
      'N/record',
      '../../Utilities/HB CM Server Utilities',
      '../Subscription Versioning/HB CM Subscription Version View',
], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, server, SVV) => {
      const EntryPoints = {};

      const getRevenueWaterfall = (id) => {
            return query
                  .runSuiteQL({
                        query: `
                              SELECT 
                                    BUILTIN.DF(RP.accountingbook) AS Book, 
                                    BUILTIN.DF(RPPR.plannedperiod) AS rev_period, 
                                    RPPR.plannedperiod AS rev_period_id, 
                                    SUM(RPPR.amount) AS Amount,
                                    MAX(BUILTIN.DF(RP.revenueplancurrency)) AS Currency,
                                    MAX(CASE WHEN RPPR.journal > 0 THEN 'Recognized' ELSE 'Not Recognized' END) AS Recognized
                                FROM customrecordzab_subscription AS S
                                LEFT JOIN customrecordzab_revenue AS RO ON RO.custrecordzab_r_subscription = S.id
                                LEFT JOIN customrecordzab_revenue_detail AS RD ON RD.custrecordzab_rd_parent = RO.id
                                LEFT JOIN revenueelement AS RE ON RE.id = RD.custrecordzab_rd_revenue_element
                                LEFT JOIN revenueplan AS RP ON RP.createdfrom = RE.id
                                LEFT JOIN revenuePlanPlannedRevenue AS RPPR ON RPPR.revenueplan = RP.id
                                WHERE S.id = ${id} AND RP.accountingbook IN (0,1)
                                GROUP BY (BUILTIN.DF(RP.accountingbook), BUILTIN.DF(RPPR.plannedperiod), RPPR.plannedperiod)
				                ORDER BY Book, rev_period_id
          `,
                  })
                  .asMappedResults();
      };
      const getRevenuePlanLines = (id) => {
            return query
                  .runSuiteQL({
                        query: `
                          SELECT 
                                    BUILTIN.DF(RP.accountingbook) AS Book, 
                                    BUILTIN.DF(RP.item) AS Item, 
                                    BUILTIN.DF(RPPR.plannedperiod) AS rev_period, 
                                    RPPR.plannedperiod AS rev_period_id, 
                                    RPPR.amount AS Amount, 
                                    '<a href="/app/accounting/revrec/revenueelement.nl?id=' || RP.createdfrom || '">' || BUILTIN.DF(RP.createdfrom) || '</a>' AS Element, 
                                    '<a href="/app/accounting/transactions/journal.nl?id=' || RPPR.journal || '">' || BUILTIN.DF(RPPR.journal) || '</a>' AS journal, 
                                    BUILTIN.DF(RP.revenueplancurrency) AS Currency, 
                                    CASE WHEN RDC.Charge_Type <> ' ' THEN RDC.Charge_Type ELSE 'Usage' END AS Charge_Type
                          FROM customrecordzab_subscription AS S
                          LEFT JOIN customrecordzab_revenue AS RO ON RO.custrecordzab_r_subscription = S.id
                          LEFT JOIN customrecordzab_revenue_detail AS RD ON RD.custrecordzab_rd_parent = RO.id
                          LEFT JOIN revenueelement AS RE ON RE.id = RD.custrecordzab_rd_revenue_element
                          LEFT JOIN revenueplan AS RP ON RP.createdfrom = RE.id
                          LEFT JOIN revenuePlanPlannedRevenue AS RPPR ON RPPR.revenueplan = RP.id
                          LEFT JOIN (SELECT RL.custrecordzab_revlink_revenue_detail AS Rev_Detail, MAX(BUILTIN.DF(CH.custrecordzab_c_charge_type)) AS Charge_Type
                                          FROM customrecordzab_revenue_link AS RL
                                          LEFT JOIN customrecordzab_charge AS CH ON CH.id = RL.custrecordzab_revlink_charge
                                          GROUP BY RL.custrecordzab_revlink_revenue_detail) AS RDC ON RDC.Rev_Detail = RD.id
                          WHERE S.id = ${id} AND RP.accountingbook IN (0,1)
            `,
                  })
                  .asMappedResults();
      };

      const getBookCurrency = (book) => {
            try {
                  return `${book[0].currency}`;
            } catch (e) {
                  return '';
            }
      };

      const buildBarChartDataSet = (primary, secondary) => {
            return `
                                          labels: [${primary.map((item) => {
                                                return `'${item.rev_period}'`;
                                          })}],
                                    datasets: [  
                                        {
                                            label: 'Primary - ${getBookCurrency(
                                                  primary
                                            )}',
                                            data: [${primary.map((item) => {
                                                  return item.amount;
                                            })}],
                                            fill: false    	
                                        },
                                        {
                                            label: 'Secondary - ${getBookCurrency(
                                                  secondary
                                            )}',
                                            data: [${secondary.map((item) => {
                                                  return item.amount;
                                            })}],
                                            fill: false    	
                                        }   	
                                    ]
            `;
      };

      // const buildPieChartData = (data) => {
      //       return `
      //                               labels: [${data.map((item) => {
      //                                     return `'${item.recognized}'`;
      //                               })}],
      //                               datasets: [
      //                                   {
      //                                       label: 'Primary',
      //                                       data: [${data.map((item) => {
      //                                             return item.amount;
      //                                       })}],
      //                                       fill: false
      //                                   }
      //       `;
      // };

      const sumRecognizedAmount = (data) => {
            const recognized = data.reduce((a, c) => {
                  return c.recognized === 'Recognized' ? a + c.amount : a;
            }, 0);
            const notRecognized = data.reduce((a, c) => {
                  return c.recognized !== 'Recognized' ? a + c.amount : a;
            }, 0);
            return [
                  {
                        rev_period: 'Recognized',
                        amount: recognized,
                        currency: data[0]?.currency,
                  },
                  {
                        rev_period: 'Unrecognized',
                        amount: notRecognized,
                        currency: data[0]?.currency,
                  },
            ];
      };

      function generateChartHTML(data, title, i, type) {
            // log.debug('Records', records);
            var chartHTML = `
        <?xml version="1.0"?> 
            <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd"> 
            <html>
                <head>
                    <title>Sales Summarized by Period</title>
                    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                    <script src="https://cdn.jsdelivr.net/npm/chart.js@2.8.0"></script>
                    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-colorschemes"></script>
                </head>
                <body style="margin: 24px;" >
                    <h2 style="margin-bottom: 6px;">${title}</h2>
            
                    <div style="padding: 3px; width: 70%;">
                        <canvas id="theChart_${i}"></canvas>
                        <script>
                            var ctx = document.getElementById('theChart_${i}').getContext('2d');
                        var chart = new Chart(ctx, 
                            {
                                type: '${type}',
                                data: {
                                    ${data}
                                } 
                            }
                        );
                        </script>
                    </div>
                </body>
            </html>
    `;
            return chartHTML;
      }

      /**
       * Defines the function definition that is executed before record is loaded.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @param {Form} scriptContext.form - Current form
       * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
       * @since 2015.2
       */
      EntryPoints.beforeLoad = ({ form, newRecord }) => {
            try {
                  const enums = server.enums.REVENUE_TAB;
                  // log.debug('enums', enums);
                  enums.TABS.forEach((tab) => {
                        form.addTab({
                              id: tab.ID,
                              label: tab.LABEL,
                        });
                  });
                  enums.SUBTABS.forEach((subtab) => {
                        form.addSubtab({
                              id: subtab.ID,
                              label: subtab.LABEL,
                              tab: subtab.TAB,
                        });
                  });
                  // const sublists = {};
                  // enums.SUBLISTS.forEach((sublist) => {
                  //       let sublistObj = form.addSublist({
                  //             id: sublist.ID,
                  //             label: sublist.LABEL,
                  //             type: sublist.TYPE,
                  //             tab: sublist.TAB,
                  //       });
                  //       sublist.FIELDS.forEach((sublistField) => {
                  //             sublistObj.addField({
                  //                   id: sublistField.ID,
                  //                   label: sublistField.LABEL,
                  //                   type: sublistField.TYPE,
                  //             });
                  //       });
                  //       sublists[sublist.ID] = sublistObj;
                  // });
                  const fields = {};
                  enums.FIELDS.forEach((field) => {
                        const fieldObj = form.addField({
                              id: field.ID,
                              label: field.LABEL,
                              type: field.TYPE,
                              container: field.CONTAINER,
                        });
                        fields[field.ID] = fieldObj;
                  });
                  // const tab = form.addTab({
                  //       id: 'custpage_revenue_waterfall',
                  //       label: 'Revenue Waterfall',
                  // });
                  // form.addSubtab({
                  //       id: 'custpage_revenue_wf_chart_subtab',
                  //       label: 'Revenue Waterfall Chart',
                  //       tab: 'custpage_revenue_waterfall',
                  // });
                  // form.addSubtab({
                  //       id: 'custpage_revenue_wf_subtab',
                  //       label: 'Revenue Waterfall',
                  //       tab: 'custpage_revenue_waterfall',
                  // });
                  //
                  // form.addSubtab({
                  //       id: 'custpage_revenue_plan_details_subtab',
                  //       label: 'Revenue Plan Details',
                  //       tab: 'custpage_revenue_waterfall',
                  // });
                  const sublist = form.addSublist({
                        id: 'custpage_revenue_waterfall_sublist',
                        label: 'Revenue Waterfall',
                        type: 'LIST',
                        tab: 'custpage_revenue_wf_subtab',
                  });
                  const revenuePlanDetailsSublist = form.addSublist({
                        id: 'custpage_revenue_plan_details_sublist',
                        label: 'Revenue Details',
                        type: 'LIST',
                        tab: 'custpage_revenue_plan_details_subtab',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_book',
                        label: 'Accounting Book',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_charge_type',
                        label: 'Charge Type',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_item',
                        label: 'Item',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_period',
                        label: 'Period',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_amount',
                        label: 'Amount',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_currency',
                        label: 'Currency',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_element',
                        label: 'Element',
                        type: 'TEXT',
                  });
                  revenuePlanDetailsSublist.addField({
                        id: 'custpage_revplan_journal',
                        label: 'Journal',
                        type: 'TEXT',
                  });

                  sublist.addField({
                        id: 'custpage_rev_book',
                        label: 'Accounting Book',
                        type: 'TEXT',
                  });
                  sublist.addField({
                        id: 'custpage_rev_period',
                        label: 'Period',
                        type: 'TEXT',
                  });
                  sublist.addField({
                        id: 'custpage_rev_amount',
                        label: 'Revenue Amount',
                        type: 'TEXT',
                  });
                  sublist.addField({
                        id: 'custpage_rev_currency',
                        label: 'Currency',
                        type: 'TEXT',
                  });
                  // const primaryBookChart = form.addField({
                  //       id: 'custpage_primary_chart',
                  //       label: 'Primary Book',
                  //       type: 'INLINEHTML',
                  //       container: 'custpage_revenue_wf_chart_subtab',
                  // });
                  // const recognizedChart = form.addField({
                  //       id: 'custpage_recognized_chart',
                  //       label: 'Secondary Book',
                  //       type: 'INLINEHTML',
                  //       container: 'custpage_revenue_wf_chart_subtab',
                  // });
                  // // const UKBookChart = form.addField({
                  // //       id: 'custpage_uk_chart',
                  // //       label: 'UK Book',
                  // //       type: 'INLINEHTML',
                  // //       container: 'custpage_revenue_wf_chart_subtab',
                  // // });
                  const waterfall = getRevenueWaterfall(newRecord.id);
                  const revenueLines = getRevenuePlanLines(newRecord.id);
                  // log.debug('revenueLines', revenueLines);

                  // const revenuePlanDetailsSublist =
                  //       sublists['custpage_revenue_plan_details_sublist'];
                  // log.debug(
                  //       'revenuePlanDetailsSublist',
                  //       revenuePlanDetailsSublist
                  // );
                  // const waterfallSublist =
                  //       sublists['custpage_revenue_waterfall_sublist'];
                  //
                  // log.debug('Sublists', JSON.stringify(sublists));

                  // const revenueSublistKeyValueMapping = {
                  //       custpage_revplan_book: 'book',
                  //       custpage_revplan_item: 'item',
                  //       custpage_revplan_period: 'rev_period',
                  //       custpage_revplan_amount: 'amount',
                  //       custpage_revplan_element: 'element',
                  //       custpage_revplan_journal: 'journal',
                  //       custpage_revplan_currency: 'currency',
                  //       custpage_revplan_charge_type: 'charge_type',
                  // };

                  revenueLines.forEach((line, i) => {
                        // log.debug('revenueLines', line);
                        // for (let [id, value] of Object.entries(
                        //       revenueSublistKeyValueMapping
                        // )) {
                        //       log.debug(
                        //             'line ' + i,
                        //             `id: ${id}, value: ${line[value]}`
                        //       );
                        //       newRecord.setSublistValue({
                        //             sublistId:
                        //                   'custpage_revenue_plan_details_sublist',
                        //             fieldId: id,
                        //             line: i,
                        //             value: line[value],
                        //       });
                        //       form.setSublistValue({
                        //             id,
                        //             line: i,
                        //             value: line[value],
                        //       });
                        // }

                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_book',
                              line: i,
                              value: line.book,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_item',
                              line: i,
                              value: line.item,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_period',
                              line: i,
                              value: line.rev_period,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_amount',
                              line: i,
                              value: line.amount,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_element',
                              line: i,
                              value: line.element,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_journal',
                              line: i,
                              value: line.journal,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_currency',
                              line: i,
                              value: line.currency,
                        });
                        revenuePlanDetailsSublist.setSublistValue({
                              id: 'custpage_revplan_charge_type',
                              line: i,
                              value: line.charge_type,
                        });
                  });
                  // const waterfallSublistKeyValueMapping = {
                  //       custpage_rev_book: 'book',
                  //       custpage_rev_period: 'rev_period',
                  //       custpage_rev_currency: 'currency',
                  //       custpage_rev_amount: 'amount',
                  // };
                  // log.debug('waterfall', waterfall);
                  waterfall.forEach((line, i) => {
                        // log.debug('line', line);
                        if (line.book) {
                              // for (let [id, value] of Object.entries(
                              //       waterfallSublistKeyValueMapping
                              // )) {
                              //       waterfallSublist.setSublistValue({
                              //             id,
                              //             line: i,
                              //             value: line[value],
                              //       });
                              // }
                              sublist.setSublistValue({
                                    id: 'custpage_rev_book',
                                    line: i,
                                    value: line.book,
                              });
                              sublist.setSublistValue({
                                    id: 'custpage_rev_period',
                                    line: i,
                                    value: line.rev_period,
                              });
                              sublist.setSublistValue({
                                    id: 'custpage_rev_currency',
                                    line: i,
                                    value: line.currency,
                              });
                              sublist.setSublistValue({
                                    id: 'custpage_rev_amount',
                                    line: i,
                                    value: parseFloat(line.amount),
                              });
                        }
                  });

                  const recognized = waterfall.reduce((a, c) => {
                        return c.recognized === 'Recognized' ? a + c.amount : a;
                  }, 0);
                  const notRecognized = waterfall.reduce((a, c) => {
                        return c.recognized !== 'Recognized' ? a + c.amount : a;
                  }, 0);
                  log.debug(
                        'Recognized Vs. Unrecognized',
                        `Recognized: ${recognized}, Unrecognized: ${notRecognized}`
                  );
                  const chartDataRec = buildBarChartDataSet(
                        sumRecognizedAmount(
                              waterfall.filter((item) => {
                                    return (
                                          item.book ===
                                          'Primary Accounting Book'
                                    );
                              })
                        ),
                        sumRecognizedAmount(
                              waterfall.filter((item) => {
                                    return (
                                          item.book ===
                                          'Secondary Accounting Book'
                                    );
                              })
                        )
                  );

                  log.debug(
                        'Recognized Vs. Unrecognized Dataset',
                        chartDataRec
                  );

                  const chartData = buildBarChartDataSet(
                        waterfall.filter((item) => {
                              return item.book === 'Primary Accounting Book';
                        }),
                        waterfall.filter((item) => {
                              return item.book === 'Secondary Accounting Book';
                        })
                  );

                  const primaryChart = generateChartHTML(
                        chartData,
                        'Primary Accounting Book',
                        0,
                        'bar'
                  );
                  // const pieChartQuery = getRecognizedPercent(newRecord.id);
                  // log.debug('pieChartQuery', pieChartQuery);
                  // const pieChartData = buildPieChartData(pieChartQuery);
                  // log.debug('pieChartData', pieChartData);
                  const recChart = generateChartHTML(
                        chartDataRec,
                        'Recognized Vs. Unrecognized',
                        1,
                        'bar'
                  );
                  // log.debug('recChart', recChart);
                  // const secondaryChart = generateChartHTML(
                  //       waterfall.filter((item) => {
                  //             return item.book === 'Secondary Accounting Book';
                  //       }),
                  //       'Secondary Accounting Book',
                  //       1
                  // );
                  // const ukChart = generateChartHTML(
                  //       waterfall.filter((item) => {
                  //             return item.book === 'UK Gaap Adjustment Book';
                  //       }),
                  //       'UK Gaap Adjustment Book',
                  //       2
                  // );
                  // log.debug('primaryChart', primaryChart);
                  // log.debug('secondaryChart', secondaryChart);
                  // log.debug('ukChart', ukChart);
                  const primaryBookChart = fields['custpage_primary_chart'];
                  const recognizedChart = fields['custpage_recognized_chart'];
                  primaryBookChart.defaultValue = primaryChart;
                  recognizedChart.defaultValue = recChart;
                  // UKBookChart.defaultValue = ukChart;
                  log.debug('Loading Version Tab');
                  SVV.createVersionTab(form, newRecord);
            } catch (e) {
                  log.error('Error', e);
            }
      };

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
      // EntryPoints.afterSubmit = (scriptContext) => {};

      return EntryPoints;
});
