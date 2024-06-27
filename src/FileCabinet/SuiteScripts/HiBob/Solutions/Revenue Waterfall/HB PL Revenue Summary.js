/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/query'], /**
 * @param{query} query
 */ function (query) {
      const generateChartHTML = (data, title, i, type) => {
            // log.debug('Records', records);
            return `
                <div style='width:100%'>
                    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                    <script src="https://cdn.jsdelivr.net/npm/chart.js@2.8.0"></script>
                    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-colorschemes"></script>
                    <canvas id="theChart_${i}"></canvas>
                    <script>
                        var ctx = document.getElementById('theChart_${i}').getContext('2d');
                        var chart = new Chart(ctx, 
                            {
                                type: '${type}',
                                data: {
                                    ${data}
                                },
                                options: {
                                    // scales: {
                                    //     yAxes: [{
                                    //         ticks: {
                                    //             beginAtZero:true,
                                    //             callback: function(value, index, values) {
                                    //                 return '$ ' + parseFloat(value).toFixed(2).replace(/\\d(?=(\\d{3})+\\.)/g, '$&,');
                                    //             }
                                    //         }
                                    //     }]
                                    // },
                                    tooltips: {
                                        callbacks: {
                                            label: function(tooltipItem, chart){
                                                var datasetLabel = chart.datasets[0].data[tooltipItem.index] || '';
                                                var label = chart.labels[tooltipItem.index] || ''
                                                console.log('tooltip', tooltipItem)
                                                console.log('chart', chart)
                                                console.log('chart.datasets[tooltipItem.datasetIndex]',chart.datasets[tooltipItem.datasetIndex]);
                                                console.log('datasetLabel',datasetLabel);
                                                return label + ': $ ' + parseFloat(datasetLabel).toFixed(2).replace(/\\d(?=(\\d{3})+\\.)/g, '$&,');
                                            }
                                        }
                                    }
                                }
                            }
                        );
                      
                    </script>
                </div>   
                    
    `;
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
                                                return `'${
                                                      item.charge_type ||
                                                      'Empty'
                                                }'`;
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
                                        }
                                    ]
            `;
      };
      // const aggregatePerSegment = (subsetPerSegment, subsetLine) => {
      //       if (subsetPerSegment.hasOwnProperty(subsetLine['class'])) {
      //       }
      // };

      const transformObjectToArray = (obj) => {
            const array = [];
            Object.entries(obj).forEach((entry) => {
                  array.push({
                        rev_period: entry[0],
                        amount: entry[1],
                  });
            });
            return array;
      };
      const processSubset = (subset, filter, value) => {
            const revenuePerClass = {};
            const revenuePerSubsidiary = {};
            const revenuePerChargeType = {};
            const filteredSubset = subset.filter((item) => {
                  return item[filter] === value;
            });
            filteredSubset.forEach((subsetLine) => {
                  // log.debug('subsetLine', subsetLine);
                  let classVar = `${subsetLine['class']}`;
                  if (revenuePerClass.hasOwnProperty(classVar)) {
                        revenuePerClass[classVar]['amount'] +=
                              subsetLine.amount;
                  } else {
                        revenuePerClass[classVar] = subsetLine.amount;
                  }
                  let subsidiaryVar = `${subsetLine['subsidiary']}`;
                  if (revenuePerSubsidiary.hasOwnProperty(subsidiaryVar)) {
                        revenuePerSubsidiary[subsidiaryVar]['amount'] +=
                              subsetLine.amount;
                  } else {
                        revenuePerSubsidiary[subsidiaryVar] = subsetLine.amount;
                  }
                  let chargeVar = `${subsetLine['charge_type']}`;
                  if (revenuePerChargeType.hasOwnProperty(chargeVar)) {
                        revenuePerChargeType[chargeVar]['amount'] +=
                              subsetLine.amount;
                  } else {
                        revenuePerChargeType[chargeVar] = subsetLine.amount;
                  }
            });
            // log.debug('revenuePerClass', revenuePerClass);
            // log.debug('revenuePerSubsidiary', revenuePerSubsidiary);
            // log.debug('revenuePerChargeType', revenuePerChargeType);
            return {
                  revenuePerClass: transformObjectToArray(revenuePerClass),
                  revenuePerSubsidiary:
                        transformObjectToArray(revenuePerSubsidiary),
                  revenuePerChargeType:
                        transformObjectToArray(revenuePerChargeType),
            };
      };
      const processData = (data) => {
            const primary = processSubset(
                  data,
                  'book',
                  'Primary Accounting Book'
            )['revenuePerClass'];
            const secondary = processSubset(
                  data,
                  'book',
                  'Secondary Accounting Book'
            )['revenuePerClass'];
            // return [primary, secondary];
            return [data];
      };
      /**
       * Defines the Portlet script trigger point.
       * @param {Object} params - The params parameter is a JavaScript object. It is automatically passed to the script entry
       *     point by NetSuite. The values for params are read-only.
       * @param {Portlet} params.portlet - The portlet object used for rendering
       * @param {string} params.column - Column index forthe portlet on the dashboard; left column (1), center column (2) or
       *     right column (3)
       * @param {string} params.entity - (For custom portlets only) references the customer ID for the selected customer
       * @since 2015.2
       */
      const render = ({ portlet, column, entity }) => {
            const revenueQuery = `
                                 SELECT
                                    BUILTIN.DF(RP.accountingbook) AS Book, 
                                    Charge_Type, 
                                    SUM(RPPR.amount) AS Amount,
                                    MAX(BUILTIN.DF(RP.revenueplancurrency)) AS Currency
                                FROM customrecordzab_revenue_detail AS RD
                                LEFT JOIN revenueelement AS RE ON RE.id = RD.custrecordzab_rd_revenue_element
                                LEFT JOIN revenueplan AS RP ON RP.createdfrom = RE.id
                                LEFT JOIN revenuePlanPlannedRevenue AS RPPR ON RPPR.revenueplan = RP.id
                                LEFT JOIN accountingperiod AS AP ON AP.id = RPPR.plannedperiod
                                LEFT JOIN (SELECT RL.custrecordzab_revlink_revenue_detail AS Rev_Detail, MAX(CASE WHEN BUILTIN.DF(CH.custrecordzab_c_charge_type) NOT IN ('Usage','Fixed','One-Time') THEN 'Usage' ELSE BUILTIN.DF(CH.custrecordzab_c_charge_type) END) AS Charge_Type
                                          FROM customrecordzab_revenue_link AS RL
                                          LEFT JOIN customrecordzab_charge AS CH ON CH.id = RL.custrecordzab_revlink_charge
                                          GROUP BY RL.custrecordzab_revlink_revenue_detail) AS RDC ON RDC.Rev_Detail = RD.id
                                WHERE  RP.accountingbook IN (0,1) AND AP.startdate >= TO_DATE( BUILTIN.RELATIVE_RANGES( 'TFY', 'START' ), 'mm/dd/yyyy' )
                                GROUP BY (BUILTIN.DF(RP.accountingbook), Charge_Type)
                                ORDER BY Book
            `;

            portlet.title = 'This Year Revenue Per Charge Type';
            const fld = portlet.addField({
                  id: 'custpage_hb_chart_view',
                  type: 'INLINEHTML',
                  label: 'Chart',
            });
            const queryResults = query
                  .runSuiteQL({ query: revenueQuery })
                  .asMappedResults();
            const chartData = buildBarChartDataSet(
                  ...processData(queryResults)
            );
            // log.debug('queryResults', queryResults[0]);
            // log.debug(
            //       'queryResults',
            //       queryResults.filter((item) => {
            //             return item.book === 'Primary Accounting Book';
            //       })[0]
            // );
            const chartHTML = generateChartHTML(
                  chartData,
                  'Revenue Summary',
                  0,
                  'doughnut'
            );
            fld.defaultValue = chartHTML;
            portlet.clientScriptModulePath = './HB CS Revenue Summary.js';
            log.debug('chartHTML', chartHTML);
            // portlet.html = chartHTML;
      };

      return { render };
});
