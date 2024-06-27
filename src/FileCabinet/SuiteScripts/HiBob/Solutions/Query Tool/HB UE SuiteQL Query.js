/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/record', 'N/search'], /**
 * @param{query} query
 * @param{record} record
 * @param{search} search
 */ (query, record, search) => {
    const EntryPoints = {};

    const getSummaryTypes = (id) => {
        const aggregationTypes = [];
        search
            .create({
                type: 'customrecord_hb_saved_suiteql_field',
                filters: [['custrecord_hb_ssql_parent', 'anyof', id]],
                columns: [
                    {
                        name: 'custrecord_hb_ssql_summary_type',
                    },
                    {
                        name: 'custrecord_hb_ssql_id',
                    },
                    {
                        name: 'custrecord_hb_ssql_order',
                        sort: search.Sort.ASC,
                    },
                ],
            })
            .run()
            .each((field) => {
                aggregationTypes.push(field.getText(field.columns[0]));
                return true;
            });
        return aggregationTypes;
    };

    const getFilterDefaultValues = (id) => {
        const filterDefaults = [];
        search
            .create({
                type: 'customrecord_hb_ssql_filter',
                filters: [['custrecord_hb_ssql_parent_2', 'anyof', id]],
                columns: [
                    { name: 'custrecord_hb_ssql_filter_id' },
                    {
                        name: 'custrecord_hb_ssql_default_value',
                    },
                    {
                        name: 'custrecord_hb_ssql_filter_order',
                        sort: search.Sort.ASC,
                    },
                ],
            })
            .run()
            .each((filter) => {
                filterDefaults.push(filter.getValue(filter.columns[1]));
                return true;
            });
        return filterDefaults;
    };

    const getPivotByValues = (id) => {
        const pivotBy = {};
        search
            .create({
                type: 'customrecord_hb_ssql_pivot_by',
                filters: [['custrecord_hb_ssql_saved_query', 'anyof', id]],
                columns: [
                    {
                        name: 'custrecord_hb_ssql_field_id',
                    },
                    {
                        name: 'custrecord_hb_ssql_pivot_by',
                    },
                    { name: 'custrecord_hb_ssql_summary_type_1' },
                    { name: 'custrecord_hb_ssql_summary_field' },
                ],
            })
            .run()
            .each((pivot) => {
                const fieldId = pivot.getValue(pivot.columns[0]);
                const pivotVal = pivot.getValue(pivot.columns[1]);
                const summaryType = pivot.getValue(pivot.columns[2]);
                const summaryField = pivot.getValue(pivot.columns[3]);
                if (pivotBy.hasOwnProperty(fieldId)) {
                    pivotBy[fieldId].push({
                        pivotVal,
                        summaryField,
                        summaryType,
                    });
                } else {
                    pivotBy[fieldId] = [
                        { pivotVal, summaryField, summaryType },
                    ];
                }
                return true;
            });
        return pivotBy;
    };

    const aggregateQuery = (newRecord) => {
        const queryValue = newRecord.getValue({
            fieldId: 'custrecord_hb_ssql_sql_query',
        });
        const filters = getFilterDefaultValues(newRecord.id);
        log.debug('Query', `Query: ${queryValue}, params: ${filters}`);
        const queryResults = query
            .runSuiteQL({
                query: queryValue,
                params: filters,
            })
            .asMappedResults();
        const fields = Object.keys(queryResults[0]);
        const aggregationTypes = getSummaryTypes(newRecord.id);
        log.debug('Aggregation Types', JSON.stringify(aggregationTypes));
        let newQuery = 'SELECT ';
        const groupBy = [];
        fields.forEach((field, i) => {
            const aggregationType = aggregationTypes[i];
            if (aggregationType.toUpperCase() === 'GROUP') {
                groupBy.push(field);
                newQuery += `${field}${i < fields.length - 1 ? ', ' : ' '}`;
            } else {
                newQuery += `${aggregationType}(${field}) AS ${field}${
                    i < fields.length - 1 ? ', ' : ' '
                }`;
            }
        });
        newQuery += ` FROM (${queryValue}) GROUP BY (${groupBy.join(',')})`;
        log.debug('New Query', newQuery);
        record.submitFields({
            type: newRecord.type,
            id: newRecord.id,
            values: { custrecord_hb_ssql_new_query: newQuery },
        });
    };

    const pivotQuery = (newRecord) => {
        const pivotBy = getPivotByValues(newRecord.id);
        log.debug('Pivot By', pivotBy);
        const pivotFields = Object.entries(pivotBy);
        let pivotQuery = 'SELECT ';
        pivotFields.forEach((field) => {
            field[1].forEach((value) => {
                pivotQuery += `CASE WHEN ${field[0]} = ${
                    value.pivotVal
                } THEN ${value.summaryType.toUpperCase()}(${
                    value.summaryField
                })`;
            });
        });
        log.debug('pivotQuery', pivotQuery);
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
        const queryType = newRecord.getText({
            fieldId: 'custrecord_hb_ssql_query_type',
        });
        log.debug('query Type', queryType);
        switch (queryType) {
            case 'Aggregate':
                aggregateQuery(newRecord);
                break;
            case 'Pivot':
                pivotQuery(newRecord);
                break;
        }
    };

    return EntryPoints;
});
