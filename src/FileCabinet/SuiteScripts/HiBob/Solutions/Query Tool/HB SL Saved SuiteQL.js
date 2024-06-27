/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/query',
    'N/record',
    'N/ui/serverWidget',
    'N/search',
    'N/task',
    'N/file',
    'N/runtime',
    '../../Utilities/HB CM Server Utilities',
    './HB CM SuiteQL Utils',
], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, ui, search, task, file, runtime, serverUt, utils) => {
    const { reportingEnums } = serverUt;

    const {
        SAVED_QUERY_SUITELET,
        CUSTOM_RECORDS_TYPES,
        SUITEQL_FORMULA,
        SCRIPTING_DASHBOARD,
    } = serverUt.enums;

    const getQueryResults = (savedQuery, availableFilters, queryPage) => {
        const noOfPages = [];
        const maxResults = serverUt.getUserPreferences('LISTSEGMENTSIZE');
        log.debug('max Results', maxResults);
        const pagedQueryResults = query.runSuiteQLPaged({
            query: savedQuery,
            params: availableFilters,
            pageSize: maxResults,
            customScriptId: 'suiteql_query_paged',
        });
        const getResultsCount = () => {
            const firstPage = pagedQueryResults.fetch(0);
            let noOfResults = 0;
            for (let i = 0; i < pagedQueryResults.pageRanges.length; i++) {
                if (i < pagedQueryResults.pageRanges.length - 1) {
                    noOfResults += firstPage.pageRange.size;
                }
            }
            noOfResults += pagedQueryResults.fetch(
                pagedQueryResults.pageRanges.length - 1
            ).pageRange.size;
            return noOfResults;
        };
        const fetchPage = (pageNo) => {
            try {
                const page = pagedQueryResults.fetch(pageNo);
                return {
                    page,
                    queryResults: page.data.asMappedResults(),
                    pageSize: page.pageRange.size,
                };
            } catch (e) {
                return {
                    page: null,
                    queryResults: [],
                    pageSize: 0,
                };
            }
        };

        // const slPage = pagedQueryResults.fetch(queryPage);

        for (let i = 0; i < pagedQueryResults.pageRanges.length; i++) {
            noOfPages.push(i);
        }

        // log.debug('noOfResults', noOfResults);

        // const queryResults = slPage.data.asMappedResults();
        const { page, queryResults, pageSize } = fetchPage(queryPage);
        if (queryResults.length) {
            const queryFields = Object.keys(queryResults[0]);
            log.debug('queryFields', queryFields);
        }

        return {
            queryResults,
            noOfPages,
            noOfResults: page ? getResultsCount() : 0,
            maxResults,
            thisPageSize: pageSize,
        };
    };

    const updateListByQueryResults = (queryResults, sublist) => {
        log.debug('no of results', queryResults.length);
        // sublist.label = `Results (${queryResults.length})`;
        queryResults.forEach((result, i) => {
            Object.entries(result).forEach((field) => {
                sublist.setSublistValue({
                    id: field[0],
                    line: i,
                    value: field[1],
                });
            });
        });
    };

    const buildForm = (form, savedQuerySelected, noOfPages, queryPage) => {
        SAVED_QUERY_SUITELET.FIELD_GROUPS.forEach((group) => {
            form.addFieldGroup({
                id: group.ID,
                label: group.LABEL,
            });
        });
        SAVED_QUERY_SUITELET.FIELDS.forEach((field) => {
            const fieldObj = form.addField({
                id: field.ID,
                label: field.LABEL,
                type: field.TYPE,
                source: field.SOURCE,
                container: field.CONTAINER,
            });

            if (field.ID === 'query_pages') {
                noOfPages.forEach((page) => {
                    fieldObj.addSelectOption({ value: page, text: page });
                });
                fieldObj.defaultValue = queryPage;
            } else {
                fieldObj.defaultValue = savedQuerySelected;
            }
        });

        SAVED_QUERY_SUITELET.BUTTONS.forEach((button) => {
            let functionParam =
                button.ID === 'filter'
                    ? `filterResults(${savedQuerySelected})`
                    : button.FUNCTION_NAME;
            log.debug(functionParam, button);
            form.addButton({
                id: button.ID,
                label: button.LABEL,
                functionName: functionParam,
            });
        });
    };
    const addSublistFields = (sublist, savedQuerySelected) => {
        search
            .create(reportingEnums.getSuiteQLFieldByQueryId(savedQuerySelected))
            .run()
            .each((field) => {
                let fieldId = serverUt.getSearchResultValue(field, 0);
                let fieldType = serverUt.getSearchResultValue(field, 1);
                let fieldLabel = serverUt.getSearchResultValue(field, 2);
                let source = serverUt.getSearchResultValue(field, 4);
                log.debug('sublist field type', fieldType);
                sublist.addField({
                    id: fieldId.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'),
                    type:
                        serverUt.getFieldTypeByID(fieldType) ||
                        ui.FieldType.TEXT,
                    label: fieldLabel,
                    source: source || '',
                });
                // .updateDisplayType({
                //     displayType: ui.FieldDisplayType.INLINE,
                // });
                return true;
            });
    };
    const getAvailableFilters = (savedQuerySelected, parameters) => {
        let paramDefault = {};
        let filters = [];
        search
            .create(
                reportingEnums.getSuiteQLFilterByQueryId(savedQuerySelected)
            )
            .run()
            .each((filter) => {
                let fieldId = serverUt.getSearchResultValue(filter, 0);
                let defaultValue = serverUt.getSearchResultValue(filter, 4);
                filters.push(fieldId);
                paramDefault[fieldId] = defaultValue;
            });
        const availableFilters = [];
        filters.forEach((filter) => {
            availableFilters.push(parameters[filter] || paramDefault[filter]);
        });
        return availableFilters;
    };

    const addAvailableFilters = (form, savedQuerySelected, parameters) => {
        let paramDefault = {};
        let filters = [];
        search
            .create(
                reportingEnums.getSuiteQLFilterByQueryId(savedQuerySelected)
            )
            .run()
            .each((filter) => {
                let fieldId = serverUt.getSearchResultValue(filter, 0);
                let fieldLabel = serverUt.getSearchResultValue(filter, 1);
                let fieldType = serverUt.getSearchResultValue(filter, 2);
                let source = serverUt.getSearchResultValue(filter, 3);
                let defaultValue = serverUt.getSearchResultValue(filter, 4);
                let dynamicDefaultId = serverUt.getSearchResultValue(filter, 6);
                let dynamicDefault = null;
                if (dynamicDefaultId) {
                    dynamicDefault = search.lookupFields({
                        type: CUSTOM_RECORDS_TYPES.SUITEQL_FORMULA,
                        id: dynamicDefaultId,
                        columns: [SUITEQL_FORMULA.FORMULA],
                    })[SUITEQL_FORMULA.FORMULA];
                }

                log.debug('dynamicDefault', dynamicDefault);
                log.debug('Field Type', fieldType);
                paramDefault[fieldId] = defaultValue;
                filters.push(fieldId);
                log.debug(
                    'Filter ' + fieldLabel,
                    `Value ${
                        parameters[fieldId] ||
                        dynamicDefault ||
                        defaultValue ||
                        ''
                    }`
                );
                form.addField({
                    id: fieldId,
                    label: fieldLabel,
                    type:
                        serverUt.getFieldTypeByID(fieldType) ||
                        ui.FieldType.TEXT,
                    source: source || '',
                    container: 'filters',
                }).defaultValue =
                    parameters[fieldId] || dynamicDefault || defaultValue || '';

                return true;
            });
        log.debug('filters', filters);
        const availableFilters = [];
        filters.forEach((filter) => {
            availableFilters.push(parameters[filter] || paramDefault[filter]);
        });
        log.debug('filters values', availableFilters);
        return availableFilters;
    };

    const createFileDownloadLink = (fileId) => {
        return file.load({ id: fileId }).url;
    };

    const onError = (response, e) => {
        const form = ui.createForm({
            title: 'Saved SuiteQL Error',
            hideNavBar: false,
        });
        const field = form.addField({
            id: 'custpage_error_msg',
            label: 'Error Message',
            type: ui.FieldType.LONGTEXT,
        });
        field.defaultValue = e;
        field.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
        response.writePage(form);
    };
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = ({ request, response }) => {
        const { parameters } = request;
        const { method } = request;

        log.debug('Parameters', parameters);

        if (method === 'GET') {
            try {
                const savedQuerySelected =
                    parameters[SAVED_QUERY_SUITELET.FIELDS[0].ID] || 1;
                const queryPage =
                    parameters[SAVED_QUERY_SUITELET.FIELDS[1].ID] || 0;
                log.debug('savedQuerySelected', savedQuerySelected);
                const form = ui.createForm({
                    title: 'Saved SuiteQL',
                    hideNavBar: false,
                });
                const sublist = form.addSublist({
                    id: 'results',
                    label: 'Results',
                    type: ui.SublistType.LIST,
                });
                const savedQuery =
                    utils.getQueryFromSavedQueryObject(savedQuerySelected)[
                        'custrecord_hb_ssql_sql_query'
                    ];
                const availableFilters = getAvailableFilters(
                    savedQuerySelected,
                    parameters
                );
                const {
                    queryResults,
                    noOfPages,
                    noOfResults,
                    maxResults,
                    thisPageSize,
                } = getQueryResults(savedQuery, availableFilters, queryPage);
                sublist.label = `Results (${queryPage * maxResults} - ${
                    queryPage * maxResults +
                    Math.min(maxResults - 1, thisPageSize)
                } of ${noOfResults})`;
                log.debug('saved query', savedQuery);
                buildForm(form, savedQuerySelected, noOfPages, queryPage);
                addSublistFields(sublist, savedQuerySelected);
                addAvailableFilters(form, savedQuerySelected, parameters);

                updateListByQueryResults(queryResults, sublist);

                form.clientScriptModulePath = './HB CS Saved SuiteQL.js';

                response.writePage(form);
            } catch (e) {
                onError(response, e);
            }
        } else {
            let { savedQuery, filters } = parameters;
            log.debug('current filters', filters);
            log.debug('savedQuery', savedQuery);
            switch (parameters['action']) {
                case 'CREATE_SUITEQL_RESULTS':
                    let fileName = `${
                        utils.getQueryFromSavedQueryObject(savedQuery)['name']
                    } ${String(new Date())}`;
                    let targetFile = utils.createTargetFile(fileName);
                    let savedQueryRecord = utils.createSavedQueryResultsRecord(
                        targetFile,
                        savedQuery,
                        filters
                    );
                    log.debug('Filters', `${filters}, ${Boolean(filters)}`);
                    let params = filters
                        ? JSON.parse(filters)
                        : utils.getQueryDefaultParams(savedQuery);
                    let taskId = utils.runSearchAndExport(
                        savedQuery,
                        fileName,
                        targetFile,
                        savedQueryRecord,
                        params,
                        false,
                        false
                    );

                    let status = task.checkStatus({ taskId: taskId });
                    log.debug('Task Id', `${taskId} - ${status.status}`);

                    let downloadLink = createFileDownloadLink(targetFile);
                    response.write(
                        JSON.stringify({
                            targetFile,
                            taskId,
                            savedQueryRecord,
                            downloadLink,
                        })
                    );
                    break;
                default:
                    log.audit('Unrecognized Action', parameters['action']);
                    break;
            }
        }
    };

    return { onRequest };
});
