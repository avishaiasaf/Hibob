/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define(['N/search', './HB CM Enums'], (search, enums) => {
    const reportingEnums = {};

    reportingEnums.REPORTING_ENUMS = 'Reporting Enumerations Library';
    const { CUSTOM_RECORDS_TYPES, ENTITY_BANK_DETAILS_FI } = enums;

    reportingEnums.getRevenuePlanByElement = (revenueElement) => {
        return {
            type: 'revenueplan',
            filters: [
                ['revenueelement.source', 'anyof', revenueElement],
                'AND',
                ['revenueplantype', 'anyof', 'ACTUAL'],
            ],
            columns: [
                {
                    name: 'recordnumber',
                    summary: 'GROUP',
                    sort: search.Sort.ASC,
                    label: 'Number',
                },
                {
                    name: 'internalid',
                    summary: 'MAX',
                    label: 'Internal ID',
                },
            ],
        };
    };

    reportingEnums.getRevenuePlanByElements = (elementIds) => {
        return {
            type: 'revenueplan',
            filters: [
                elementIds,
                'AND',
                ['revenueplantype', 'anyof', 'ACTUAL'],
            ],
            columns: [
                { name: 'internalid', label: 'Plan ID' },
                {
                    name: 'internalid',
                    join: 'revenueElement',
                    label: 'Element ID',
                },
            ],
        };
    };

    reportingEnums.getAccountingBooks = {
        type: 'accountingbook',
        filters: [['status', 'anyof', 'ACTIVE']],
        columns: [
            {
                name: 'internalid',
                label: 'Internal ID',
            },
            {
                name: 'name',
                sort: search.Sort.ASC,
                label: 'Name',
            },
            { name: 'status', label: 'Status' },
        ],
    };

    reportingEnums.getRevenueDetailsBySubscriptionItems = (itemId) => {
        return {
            type: 'customrecordzab_revenue_detail',
            filters: [
                ['custrecordzab_rd_rev_event_sub_item', 'anyof', itemId],
                'AND',
                ['custrecordzab_rd_status', 'anyof', '1', '5'],
                'AND',
                ['custrecordzab_rd_accounting_book', 'anyof', '1'],
            ],
            columns: [{ name: 'internalid', label: 'Internal ID' }],
        };
    };

    reportingEnums.getEntityBankDetailsByVendor = (
        vendorId,
        approved = true
    ) => {
        let filters = [
            [ENTITY_BANK_DETAILS_FI.VENDOR, 'anyof', vendorId],
            'AND',
            [ENTITY_BANK_DETAILS_FI.PRIMARY, 'is', 'T'],
        ];
        if (approved) {
            filters.push('AND', [ENTITY_BANK_DETAILS_FI.APPROVED, 'is', 'T']);
        }
        return {
            type: CUSTOM_RECORDS_TYPES.FISPAN_BANK_DETAILS,
            filters,
            columns: [{ name: 'internalid', label: 'Internal ID' }],
        };
    };

    reportingEnums.getSuiteQLFieldByQueryId = (id) => {
        return {
            type: 'customrecord_hb_saved_suiteql_field',
            filters: [['custrecord_hb_ssql_parent', 'anyof', id]],
            columns: [
                {
                    name: 'custrecord_hb_ssql_id',
                },
                {
                    name: 'custrecord_hb_ssql_type',
                },
                {
                    name: 'custrecord_hb_ssql_label',
                },
                {
                    name: 'custrecord_hb_ssql_order',
                    sort: search.Sort.ASC,
                },
                {
                    name: 'custrecord_hb_ssql_source_fld',
                },
            ],
        };
    };

    reportingEnums.getSuiteQLFilterByQueryId = (id) => {
        return {
            type: 'customrecord_hb_ssql_filter',
            filters: [['custrecord_hb_ssql_parent_2', 'anyof', id]],
            columns: [
                { name: 'custrecord_hb_ssql_filter_id' },
                {
                    name: 'custrecord_hb_ssql_filter_by',
                },
                {
                    name: 'custrecord_hb_ssql_filter_type',
                },
                {
                    name: 'custrecord_hb_ssql_source',
                },
                {
                    name: 'custrecord_hb_ssql_default_value',
                },
                {
                    name: 'custrecord_hb_ssql_filter_order',
                    sort: search.Sort.ASC,
                },
                {
                    name: 'custrecord_hb_ssql_dynm_default',
                },
            ],
        };
    };

    return reportingEnums;
});
