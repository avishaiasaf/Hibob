/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/record', 'N/ui/serverWidget', 'N/search'], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, ui, search) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = ({ request, response }) => {
        const { method } = request;

        const fieldTypes = {
            1: ui.FieldType.TEXT,
            6: ui.FieldType.CURRENCY,
            'Check Box': ui.FieldType.CHECKBOX,
        };
        if (method === 'GET') {
            const list = ui.createList({
                title: 'Saved SuiteQL',
                hideNavBar: false,
            });
            list.style = ui.ListStyle.NORMAL;
            list.addButton({
                id: 'export',
                label: 'Export to CSV',
                functionName: '',
            });
            const savedQuery = search.lookupFields({
                type: 'customrecord_hb_saved_suiteql',
                id: 1,
                columns: ['custrecord1'],
            })['custrecord1'];
            log.debug('saved query', savedQuery);
            search
                .create({
                    type: 'customrecord_hb_saved_suiteql_field',
                    filters: [['custrecord_hb_ssql_parent', 'anyof', '1']],
                    columns: [
                        {
                            name: 'custrecord_hb_ssql_id',
                            label: 'ID',
                        },
                        {
                            name: 'custrecord_hb_ssql_type',
                            label: 'type',
                        },
                        {
                            name: 'custrecord_hb_ssql_label',
                            label: 'Label',
                        },
                        {
                            name: 'custrecord_hb_ssql_order',
                            sort: search.Sort.ASC,
                            label: 'Order',
                        },
                    ],
                })
                .run()
                .each((field) => {
                    let fieldId = field.getValue(field.columns[0]);
                    let fieldType = field.getValue(field.columns[1]);
                    let fieldLabel = field.getValue(field.columns[2]);
                    list.addColumn({
                        id: fieldId,
                        type: fieldTypes[fieldType] || ui.FieldType.TEXT,
                        label: fieldLabel,
                    });
                    return true;
                });

            search
                .create({
                    type: 'customrecord_hb_saved_suiteql_edit',
                    filters: [['custrecord_hb_ssql_parent_1', 'anyof', '1']],
                    columns: [
                        { name: 'custrecord_hb_ssql_column', label: 'Column' },
                        {
                            name: 'custrecord_hb_ssql_clickable',
                            label: 'Is Clickable',
                        },
                        { name: 'custrecord_hb_ssql_view', label: 'Show View' },
                        { name: 'custrecord_hb_ssql_link', label: 'LInk' },
                        {
                            name: 'custrecord_hb_ssql_link_param',
                            label: 'Link Param',
                        },
                        {
                            name: 'custrecord_hb_ssql_link_p_name',
                            label: 'Link Param Name',
                        },
                    ],
                })
                .run()
                .each((field) => {
                    let column = field.getValue(field.columns[0]);
                    let clickable = field.getValue(field.columns[1]);
                    let showView = field.getValue(field.columns[2]);
                    let link = field.getValue(field.columns[3]);
                    let linkParam = field.getValue(field.columns[4]);
                    let linkParamName = field.getValue(field.columns[5]);
                    list.addEditColumn({
                        column,
                        showHrefCol: clickable,
                        showView,
                        link,
                        linkParam,
                        linkParamName,
                    });
                    return true;
                });
            const queryResults = query
                .runSuiteQL({
                    query: savedQuery,
                    params: ['268'],
                })
                .asMappedResults();
            list.addRows({
                rows: queryResults,
            });

            response.writePage(list);
        } else {
        }
    };

    return { onRequest };
});
