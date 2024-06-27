/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file', 'N/query', 'N/search', 'N/compress', 'N/runtime'], /**
 * @param{file} file
 * @param{query} query
 */ (file, query, search, compress, runtime) => {
      const EntryPoints = {};
      const getRelatedSubscriptions = (customer) => {
            return query
                  .runSuiteQL({
                        query: `SELECT
                  S.id,
                  MAX('<a href="/app/common/custom/custrecordentry.nl?rectype=334&id=' || S.id || '">' || BUILTIN.DF(S.id) || '</a>') AS Name,
                MIN(S.custrecordzab_s_start_date) AS Start_Date,
                MIN(S.custrecordzab_s_end_date) AS End_Date,
                MAX(BUILTIN.DF(S.custrecordzab_s_currency)) AS Currency,
                MAX(C.companyname) AS Bill_To,
                MAX(BUILTIN.DF(S.custrecordzab_s_billing_profile)) AS Billing_Profile
                  FROM customrecordzab_subscription AS S
                  LEFT JOIN customrecordzab_subscription_item AS SI ON SI.custrecordzab_si_subscription = S.id
                  LEFT JOIN Customer AS C ON C.id = SI.custrecordzab_si_bill_to_customer
                  WHERE SI.custrecordzab_si_bill_to_customer = ${customer} OR SI.custrecordzab_si_customer = ${customer}
                GROUP BY S.id
                `,
                  })
                  .asMappedResults();
      };

      const getRelatedRAs = (customer) => {
            return query
                  .runSuiteQL({
                        query: `
                              SELECT
                              RA.id,
                              MAX('<a href="/app/accounting/transactions/transaction.nl?id=' || RA.id || '">' || BUILTIN.DF(RA.id) || '</a>') AS Name,
                              MAX(BUILTIN.DF(RA.currency)) AS Currency,
                              C.companyname AS Customer
                              FROM Transaction AS RA
                              LEFT JOIN RevenueElement AS RE ON RE.revenuearrangement = RA.id
                              LEFT JOIN Customer AS C ON C.id = RE.Entity
                              WHERE RE.entity = ${customer}
                              GROUP BY RA.id, C.companyname
                `,
                  })
                  .asMappedResults();
      };

      const populateSublist = (records, sublist) => {
            records.forEach((rec, i) => {
                  Object.entries(rec).forEach((entry) => {
                        // log.debug('Line ' + i, 'Field ' + entry);
                        const id = 'custpage_multi_subs_' + entry[0];
                        if (i === 0) {
                              sublist.addField({
                                    id,
                                    label: entry[0].replace('_', ' '),
                                    type: 'TEXT',
                              });
                        }

                        sublist.setSublistValue({
                              id,
                              line: i,
                              value: entry[1],
                        });
                  });
            });
      };
      const createVersionTab = (form, newRecord) => {
            try {
                  const tabs = form.getTabs();
                  log.debug('Tabs ', tabs);
                  const zabSubscriptionTab = runtime
                        .getCurrentScript()
                        .getParameter({
                              name: 'custscript_hb_zab_subs_tab_id',
                        });
                  tabs.forEach((tab) => {
                        log.debug('tab ' + tab, form.getTab({ id: tab }));
                  });
                  // const tab = form.getTab({ id: 'subscriptionstab' });

                  // const tab = form.addTab({
                  //       ID: 'custpage_subscription_version',
                  //       label: 'Subscription Versions',
                  // });
                  form.addSubtab({
                        id: 'custpage_subscription_multi_entity',
                        label: 'Multi Entity subscription',
                        tab: zabSubscriptionTab,
                  });
                  form.addSubtab({
                        id: 'custpage_ra_multi_entity',
                        label: 'Multi Entity Revenue Arrangements',
                        tab: zabSubscriptionTab,
                  });
                  // form.addFieldGroup({
                  //       id: 'fieldgroupid',
                  //       label: 'Multi Entity Subscriptions',
                  //       tab: 'custpage_subscription_multi_entity',
                  // });
                  // form.addFieldGroup({
                  //       id: 'fieldgroupid',
                  //       label: 'Multi Entity Revenue Arrangements',
                  //       tab: 'custpage_ra_multi_entity',
                  // });
                  // form.addField({
                  //       id: 'custpage_multi',
                  //       label: 'Multi Entity Subscriptions',
                  //       type: 'CHECKBOX',
                  //       container: 'fieldgroupid',
                  // });
                  const multiEntitySubscriptions = form.addSublist({
                        id: 'custpage_multi_entity_subscriptions',
                        label: 'Multi Entity Subscription',
                        type: 'LIST',
                        tab: 'custpage_subscription_multi_entity',
                  });
                  const multiEntityRA = form.addSublist({
                        id: 'custpage_multi_entity_ras',
                        label: 'Multi Entity Revenue Arrangements',
                        type: 'LIST',
                        tab: 'custpage_ra_multi_entity',
                  });
                  const subscriptions = getRelatedSubscriptions(newRecord.id);
                  const RAs = getRelatedRAs(newRecord.id);
                  populateSublist(subscriptions, multiEntitySubscriptions);
                  populateSublist(RAs, multiEntityRA);
            } catch (e) {
                  log.error('Error', e);
            }
      };
      EntryPoints.beforeLoad = ({ form, newRecord }) => {
            createVersionTab(form, newRecord);
      };

      return EntryPoints;
});
