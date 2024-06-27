/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record'], /**
 * @param{query} query
 * @param{record} record
 */ (query, record) => {
      const createZABPolicyRule = (rule) => {
            log.debug('Creating Rule', JSON.stringify(rule));
            const policyRule = record.create({
                  type: 'customrecordzab_rate_policy_rule',
            });
            policyRule.setValue({ fieldId: 'altname', value: rule.name });
            const actionId = getRatePolicyRuleActionId('set_to_specific_value');
            policyRule.setValue({
                  fieldId: 'custrecordzab_rrpr_action',
                  value: actionId,
            });
            const fieldId = getRatePolicyFieldId('rate');
            policyRule.setValue({
                  fieldId: 'custrecordzab_rrpr_field',
                  value: fieldId,
            });
            policyRule.setValue({
                  fieldId: 'custrecordzab_rrpr_decimal_precision',
                  value: 2,
            });
            policyRule.setValue({
                  fieldId: 'custrecordzab_rrpr_value_type',
                  value: 1, //1: amount, 2: percentage
            });
            policyRule.setValue({
                  fieldId: 'custrecordzab_rrpr_value',
                  value: rule.rate,
            });
            return policyRule.save({ ignoreMandatoryFields: true });
      };
      const createZABRatePolicy = (policy) => {
            log.debug('Creating Policy', JSON.stringify(policy));
            const ratePolicy = record.create({
                  type: 'customrecordzab_rate_policy',
            });
            ratePolicy.setValue({
                  fieldId: 'name',
                  value: policy.name,
            });
            ratePolicy.setValue({
                  fieldId: 'custrecordzab_rp_set_to_price_book',
                  value: policy.priceBook,
            });
            ratePolicy.setValue({
                  fieldId: 'custrecordzab_rp_rate_policy_rules',
                  value: policy.rule,
            });
            return ratePolicy.save({ ignoreMandatoryFields: true });
      };

      const updateSubscriptionItem = (subscriptionItem) => {
            log.debug(
                  'Updating Subscription Item',
                  JSON.stringify(subscriptionItem)
            );
            record.submitFields({
                  type: 'customrecordzab_subscription_item',
                  id: subscriptionItem.id,
                  values: {
                        custrecordzab_si_adjustment_rate_policy:
                              subscriptionItem.policy,
                        custrecordzab_si_adjustment_initial_date:
                              subscriptionItem.adjustmentDate,
                  },
            });
      };

      const executeRetrospectiveAdjustment = (newRecord) => {
            const amendmentName = newRecord.getValue({ fieldId: 'name' });
            // Create ZAB Policy Rule (Fixed Amount)
            const newRate = newRecord.getValue({
                  fieldId: 'custrecord_hb_new_rate',
            });
            const rule = {
                  name: `${amendmentName} Policy Rule`,
                  rate: newRate,
            };

            const policyRule = createZABPolicyRule(rule);
            // Create ZAB Rate Policy
            const priceBook = newRecord.getValue({
                  fieldId: 'custrecord_hb_price_book',
            });
            const policy = {
                  name: `${amendmentName} Rate Policy`,
                  priceBook,
                  rule: policyRule,
            };

            const ratePolicy = createZABRatePolicy(policy);
            // Update Subscription Item
            const subscriptionItemId = newRecord.getValue({
                  fieldId: 'custrecord_hb_subscription_item',
            });
            const adjustmentDate = newRecord.getValue({
                  fieldId: 'custrecord_hb_adj_effective_date',
            });
            log.debug('subscriptionItem Id', subscriptionItemId[0]);
            const subscriptionItem = {
                  id: subscriptionItemId[0],
                  policy: ratePolicy,
                  adjustmentDate,
            };
            updateSubscriptionItem(subscriptionItem);
      };

      const getRatePolicyRuleActionId = (action) => {
            const actions = {
                  adjust_up_down: 1,
                  set_to_specific_value: 2,
                  minimum_adjustment: 3,
                  maximum_adjustment: 4,
                  minimum_value: 5,
                  maximum_value: 6,
            };
            return actions[action];
      };

      const getRatePolicyFieldId = (field) => {
            const fields = {
                  additional_discount_amount: 5,
                  additional_discount_percentage: 4,
                  overage_usage_rate: 3,
                  quantity: 1,
                  rate: 2,
                  total_value: 6,
            };
            return fields[field];
      };

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
            //Check the ARPU Change Type
            const ARPUChange = newRecord
                  .getText({
                        fieldId: 'custrecord_hb_arpu_change_type',
                  })
                  .toUpperCase();
            const isProcessed = newRecord.getText({
                  fieldId: 'custrecord_hb_processed',
            });
            if (isProcessed === 'T') return;
            log.audit('ARPU Change Type', ARPUChange);
            switch (ARPUChange) {
                  case 'RETROSPECTIVE':
                        executeRetrospectiveAdjustment(newRecord);
                        record.submitFields({
                              type: newRecord.type,
                              id: newRecord.id,
                              values: { custrecord_hb_processed: true },
                        });

                        break;
                  case 'PROSPECTIVE':
                        break;
                  default:
                        log.error('Unrecognized ARPU Change', ARPUChange);
                        break;
            }
      };

      return EntryPoints;
});
