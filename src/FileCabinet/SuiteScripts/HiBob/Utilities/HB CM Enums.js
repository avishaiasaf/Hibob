/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define([], () => {
      const enums = {};

      enums.ENUMS = 'Enumerations Library';
      enums.ZAB_SUBSCRIPTION_ITEM = {
            ZAB_REVENUE_DETAIL: 'custrecord_hb_si_zab_rev_event_added',
            REVENUE_PLAN: 'custrecord_hb_si_rev_plan',
            REVENUE_ORDER: 'custrecordzab_si_revenue_order',
      };
      enums.CUSTOM_RECORDS_TYPES = {
            ZAB_REVENUE_DETAIL: 'customrecordzab_revenue_detail',
            ZAB_SUBSCRIPTION_ITEM: 'customrecordzab_subscription_item',
            ZAB_REVENUE_EVENT: 'customrecordzab_revenue_event',
            FISPAN_BANK_DETAILS: 'customrecord_fispan_vendor_bank_details',
            SCRIPTING_DAHSBOARD: 'customrecord_hb_script_dashboard',
            SUITEQL_FORMULA: 'customrecord_hb_ssql_formula',
            SAVED_QUERY_RESULT: 'customrecord_hb_saved_query_results',
            SAVED_SUITEQL: 'customrecord_hb_saved_suiteql',
      };
      enums.ZAB_REVENUE_DETAIL = {
            REVENUE_ELEMENT: 'custrecordzab_rd_revenue_element',
            REVENUE_EVENT_SUBSCRIPTION_ITEM:
                  'custrecordzab_rd_rev_event_sub_item',
            REVENUE_PLAN: 'custrecord_hb_revenue_plan',
      };
      enums.ZAB_REVENUE_EVENT = {
            CUMULATIVE_PERCENT_COMPLETE:
                  'custrecordzab_rvn_cumulative_percent_cmp',
            EVENT_DATE: 'custrecordzab_rvn_event_date',
            REVENUE_DETAIL: 'custrecordzab_rvn_revenue_detail',
      };
      enums.SAVED_SEARCH_IDS = {
            ZAB_REVENUE_DETAILS_NO_PLAN: 'customsearch2607',
            FISPAN_BANK_DETAILS_REPORT: 'customsearch_hb_bank_details_report',
            SUITEQL_RUNNING_QUEUE: 'customsearch_hb_ssql_run_queue',
      };

      enums.SUITEQL_FORMULA = {
            FORMULA: 'custrecord_hb_ssql_formula',
      };

      enums.ENTITY_BANK_DETAILS_FI = {
            BANK_NAME: 'custrecord_hb_bank_name',
            IBAN: 'custrecord_hb_iban',
            ACCOUNT_NUMBER: 'custrecord_hb_account_number',
            ACCOUNT_TYPE: 'custrecord_hb_account_type',
            BIC: 'custrecord_hb_bic_code',
            BANK_ADDRESS: 'custrecord_hb_bank_addr',
            PURPOSE: 'custrecord_hb_purpose',
            PAYMENT_DATA: 'custrecord_fispan_vbd_payment_data',
            APPROVAL_STATUS: 'custrecord_hb_approval_status',
            VENDOR: 'custrecord_fispan_vbd_vendor',
            FIRST_APPROVER: 'custrecord_hb_first_approver',
            SECOND_APPROVER: 'custrecord_hb_2nd_approver',
            PRIMARY: 'custrecord_fispan_vbd_primary',
            APPROVED: 'custrecord_hb_ebd_approved',
            SORT_CODE: 'custrecord_hb_sort_code',
            BANK_CODE: 'custrecord_hb_bank_code',
            INSTITUTION_NUMBER: 'custrecord_hb_int_number',
            TRANSIT_NUMBER: 'custrecord_hb_transit_number',
            ROUTING_NUMBER: 'custrecord_hb_routing_number',
            ADDRESS_LINE_1: 'custrecord_hb_addr_line_1',
            ADDRESS_CITY: 'custrecord_hb_addr_city',
            ADDRESS_STATE: 'custrecord_hb_addr_state',
            ADDRESS_POSTAL_CODE: 'custrecord_hb_addr_postal_code',
            PURPOSE_MESSAGE: 'custrecord_hb_purpose_msg',
            PURPOSE_CODE: 'custrecord_hb_purpose_code',
            PAYMENT_ISO_CODE: 'custrecord_hb_pay_iso_code',
            PAYMENT_CODEWORD: 'custrecord_hb_pay_codeword',
            PAYMENT_PARTY_TYPE: 'custrecord_hb_pay_party_type',
            RESIDENTIAL_STATUS: 'custrecord_hb_resident_status',
            VENDOR_ADDRESS: 'custrecord_hb_entity_address',
            VENDOR_PHONE: 'custrecord_hb_entity_phone',
      };

      enums.SAVED_SUITEQL = {
            EMAIL_TEMPLATE: 'custrecord_hb_ssql_email_temp',
      };

      enums.SCRIPT_PARAMS = {
            FROM_DATE: 'custscript_hb_from_date',
            SCRIPTING_DASHBOARD: 'custscript_hb_script_dashboard',
            UPDATE_VENDOR: 'custscript_hb_update_vendor',
      };

      enums.SCRIPTING_DASHBOARD = {
            DEFAULT_SENDER: 'custrecord_hb_default_sender',
            DEFAULT_ERROR_RECIPIENT: 'custrecord_hb_def_err_recipient',
            SUITEQL_COMPRESS_RESULTS: 'custrecord_hb_ssql_compress',
            SUITEQL_RETENTION_PERIOD: 'custrecord_hb_ssql_retention_period',
            SUITEQL_DEFAULT_EMAIL_TEMP: 'custrecord_hb_default_email_temp',
            INTERNAL_API_SECRET: 'custrecord_hb_internal_api_secret',
            INTERNAL_ACCESS_TOKEN: 'custrecord_hb_script_internal_token',
      };

      enums.SAVED_QUERY_RESULTS = {
            RESULT_FILE: 'custrecord_hb_ssql_results_file',
            TASK_ID: 'custrecord_hb_ssql_task_id',
      };

      enums.ENTITY_FIELDS = {
            FIRST_APPROVER: 'custentity_mis_first_approver',
            SECOND_APPROVER: 'custentitymis_second_approver',
      };

      enums.FIELD_TYPES = {
            CHECKBOX: 'CHECKBOX',
            SELECT: 'SELECT',
            CURRENCY: 'CURRENCY',
            TEXT: 'TEXT',
            DATE: 'DATE',
            PERCENT: 'PERCENT',
      };

      enums.FIELD_DISPLAY_TYPES = {
            INLINE: 'INLINE',
      };

      enums.CLEARING_FOREIGN_PAYMENTS_SUITELET = {
            SUBLIST_ID: 'custscript_payment_for_clearing',
            SUBLIST_FIELDS: [
                  {
                        ID: 'custscript_transfer_payment',
                        LABEL: 'Select',
                        TYPE: enums.FIELD_TYPES.CHECKBOX,
                  },
                  {
                        ID: 'custscript_payment_number',
                        LABEL: 'Payment Number',
                        TYPE: enums.FIELD_TYPES.SELECT,
                        SOURCE: 'transaction',
                        DISPLAY_TYPE: enums.FIELD_DISPLAY_TYPES.INLINE,
                  },
                  {
                        ID: 'custscript_document_number',
                        LABEL: 'Document Number',
                        TYPE: enums.FIELD_TYPES.TEXT,
                  },
                  {
                        ID: 'custscript_payment_amount',
                        LABEL: 'Payment Amount',
                        TYPE: enums.FIELD_TYPES.CURRENCY,
                  },
                  {
                        ID: 'custscript_invoice_amount',
                        LABEL: 'Actual Amount',
                        TYPE: enums.FIELD_TYPES.CURRENCY,
                  },
                  {
                        ID: 'custscript_payment_date',
                        LABEL: 'Date',
                        TYPE: enums.FIELD_TYPES.DATE,
                  },
                  {
                        ID: 'custscript_company_name',
                        LABEL: 'Customer',
                        TYPE: enums.FIELD_TYPES.TEXT,
                  },
            ],
      };

      enums.SAVED_QUERY_SUITELET = {
            SCRIPT_ID: 'customscript_hb_sl_saved_suiteql',
            DEPLOY_ID: 'customdeploy_hb_sl_saved_suiteql',
            FIELD_GROUPS: [
                  {
                        ID: 'saved_queries',
                        LABEL: 'Saved Queries',
                  },
                  {
                        ID: 'filters',
                        LABEL: 'Available Filters',
                  },
                  {
                        ID: 'query_page',
                        LABEL: 'Query Page',
                  },
            ],
            FIELDS: [
                  {
                        ID: 'saved_queries_list',
                        LABEL: 'Saved Queries',
                        TYPE: enums.FIELD_TYPES.SELECT,
                        SOURCE: enums.CUSTOM_RECORDS_TYPES.SAVED_SUITEQL,
                        CONTAINER: 'saved_queries',
                  },
                  {
                        ID: 'query_pages',
                        LABEL: 'Page',
                        TYPE: enums.FIELD_TYPES.SELECT,
                        CONTAINER: 'query_page',
                  },
            ],
            BUTTONS: [
                  {
                        ID: 'filter',
                        LABEL: 'Search',
                        FUNCTION_NAME: 'filterResults',
                  },
                  {
                        ID: 'export',
                        LABEL: 'Export',
                        FUNCTION_NAME: 'export',
                  },
                  {
                        ID: 'search_n_export',
                        LABEL: 'Search & Export',
                        FUNCTION_NAME: 'searchAndExport',
                  },
            ],
      };

      enums.REVENUE_TAB = {
            FIELDS: [
                  {
                        ID: 'custpage_primary_chart',
                        LABEL: 'Primary Book',
                        TYPE: 'INLINEHTML',
                        CONTAINER: 'custpage_revenue_wf_chart_subtab',
                  },
                  {
                        ID: 'custpage_recognized_chart',
                        LABEL: 'Secondary Book',
                        TYPE: 'INLINEHTML',
                        CONTAINER: 'custpage_revenue_wf_chart_subtab',
                  },
            ],
            TABS: [
                  {
                        ID: 'custpage_revenue_waterfall',
                        LABEL: 'Revenue Waterfall',
                  },
            ],
            SUBTABS: [
                  {
                        ID: 'custpage_revenue_wf_chart_subtab',
                        LABEL: 'Revenue Waterfall Chart',
                        TAB: 'custpage_revenue_waterfall',
                  },
                  {
                        ID: 'custpage_revenue_wf_subtab',
                        LABEL: 'Revenue Waterfall',
                        TAB: 'custpage_revenue_waterfall',
                  },
                  {
                        ID: 'custpage_revenue_plan_details_subtab',
                        LABEL: 'Revenue Plan Details',
                        TAB: 'custpage_revenue_waterfall',
                  },
            ],
            SUBLISTS: [
                  {
                        ID: 'custpage_revenue_waterfall_sublist',
                        LABEL: 'Revenue Waterfall',
                        TYPE: 'LIST',
                        TAB: 'custpage_revenue_wf_subtab',
                        FIELDS: [
                              {
                                    ID: 'custpage_revplan_book',
                                    LABEL: 'Accounting Book',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_charge_type',
                                    LABEL: 'Charge Type',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_item',
                                    LABEL: 'Item',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_period',
                                    LABEL: 'Period',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_amount',
                                    LABEL: 'Amount',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_currency',
                                    LABEL: 'Currency',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_element',
                                    LABEL: 'Element',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_revplan_journal',
                                    LABEL: 'Journal',
                                    TYPE: 'TEXT',
                              },
                        ],
                  },
                  {
                        ID: 'custpage_revenue_plan_details_sublist',
                        LABEL: 'Revenue Details',
                        TYPE: 'LIST',
                        TAB: 'custpage_revenue_plan_details_subtab',
                        FIELDS: [
                              {
                                    ID: 'custpage_rev_book',
                                    LABEL: 'Accounting Book',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_rev_period',
                                    LABEL: 'Period',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_rev_amount',
                                    LABEL: 'Revenue Amount',
                                    TYPE: 'TEXT',
                              },
                              {
                                    ID: 'custpage_rev_currency',
                                    LABEL: 'Currency',
                                    TYPE: 'TEXT',
                              },
                        ],
                  },
            ],
      };

      return enums;
});
