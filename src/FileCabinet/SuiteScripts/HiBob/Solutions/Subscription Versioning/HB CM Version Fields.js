/**
 * @NApiVersion 2.1
 */
define([], () => {
      const getValue = (field, key) => {
            return (obj) => {
                  return obj[key][field];
            };
      };
      const fields = [
            {
                  id: `custpage_externalid_v_`,
                  label: 'External ID',
                  type: 'TEXT',
                  value: getValue('externalid', 'si') || -1,
            },
            {
                  id: `custpage_subscription_item_v_`,
                  label: 'Subscription Item',
                  type: 'SELECT',
                  source: 'customrecordzab_subscription_item',
                  value: getValue('id', 'si'),
            },
            {
                  id: `custpage_class_v_`,
                  label: 'Class',
                  type: 'SELECT',
                  source: 'class',
                  value: getValue('custrecordzab_si_class', 'si'),
            },
            {
                  id: `custpage_item_v_`,
                  label: 'Item',
                  type: 'SELECT',
                  source: 'item',
                  value: getValue('custrecordzab_si_item', 'si'),
            },
            {
                  id: `custpage_start_date_v_`,
                  label: 'Start Date',
                  type: 'DATE',
                  value: getValue('custrecordzab_si_start_date', 'si'),
            },
            {
                  id: `custpage_end_date_v_`,
                  label: 'End Date',
                  type: 'DATE',
                  value: getValue('custrecordzab_si_end_date', 'si'),
            },
            {
                  id: `custpage_rate_type_v_`,
                  label: 'Rate Type',
                  type: 'SELECT',
                  source: 'customlistzab_rate_type',
                  value: getValue('custrecordzab_si_rate_type', 'si'),
            },
            {
                  id: `custpage_rate_plan_v_`,
                  label: 'Rate Plan',
                  type: 'SELECT',
                  source: 'customrecordzab_rate_plan',
                  value: getValue('custrecordzab_si_rate_plan', 'si'),
            },
            {
                  id: `custpage_price_book_v_`,
                  label: 'Price Book',
                  type: 'SELECT',
                  source: 'customrecordzab_price_book',
                  value: getValue('custrecordzab_si_price_book', 'si'),
            },
            {
                  id: `custpage_quantity_v_`,
                  label: 'Quantity',
                  type: 'CURRENCY',
                  value: getValue('custrecordzab_si_quantity', 'si'),
            },
            {
                  id: `custpage_rate_v_`,
                  label: 'Rate',
                  type: 'CURRENCY',
                  value: getValue('custrecordzab_si_rate', 'si'),
            },
            {
                  id: `custpage_currency_v_`,
                  label: 'Currency',
                  type: 'SELECT',
                  source: 'currency',
                  value: getValue('custrecordzab_s_currency', 's') || -1,
            },
      ];

      return { fields };
});
