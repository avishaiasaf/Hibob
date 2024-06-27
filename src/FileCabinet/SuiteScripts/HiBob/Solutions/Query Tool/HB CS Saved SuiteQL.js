/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/currentRecord',
    'N/search',
    'N/url',
    'N/https',
    '../../Utilities/HB CM Client Utilities',
], /**
 * @param{currentRecord} currentRecord
 */ function (currentRecord, search, url, https, clientUt) {
    const EntryPoints = {};
    const { reportingEnums } = clientUt;
    const { SAVED_QUERY_SUITELET } = clientUt.enums;

    const helpers = () => {
        const helperFunctions = {};
        const rec = currentRecord.get();
        helperFunctions.getSuiteletFilterValues = (savedQuery) => {
            const params = [];
            search
                .create(reportingEnums.getSuiteQLFilterByQueryId(savedQuery))
                .run()
                .each((filter) => {
                    let fieldId = filter.getValue(filter.columns[0]);
                    let fieldType = filter.getValue(filter.columns[2]);
                    let filterValue = rec.getValue({ fieldId });
                    if (fieldType == 11) {
                        filterValue = filterValue ? 'T' : 'F';
                    }
                    params.push(filterValue);
                    return true;
                });
            return params;
        };

        helperFunctions.exportQuery = (filters) => {
            const savedQuery = rec.getValue({ fieldId: 'saved_queries_list' });
            console.log('selected query', savedQuery);
            const params = filters
                ? JSON.stringify(
                      helperFunctions.getSuiteletFilterValues(savedQuery)
                  )
                : null;
            console.log('Params', params);
            const taskUrl = url.resolveScript({
                scriptId: SAVED_QUERY_SUITELET.SCRIPT_ID,
                deploymentId: SAVED_QUERY_SUITELET.DEPLOY_ID,
                returnExternalUrl: false,
                params: {
                    action: 'CREATE_SUITEQL_RESULTS',
                    savedQuery,
                    filters: params,
                },
            });
            console.log('taskUrl', taskUrl);
            const taskResult = https.post({ url: taskUrl, body: {} });
            const { targetFile, taskId, savedQueryRecord, downloadLink } =
                JSON.parse(taskResult.body);
            console.log(targetFile, taskId, savedQueryRecord, downloadLink);
        };
        return helperFunctions;
    };

    EntryPoints.pageInit = (context) => {};

    EntryPoints.export = () => {
        const helperfuncs = helpers();
        helperfuncs.exportQuery(true);
    };

    EntryPoints.searchAndExport = () => {
        const helperfuncs = helpers();
        helperfuncs.exportQuery(false);
    };

    const getStaticPageFieldValues = (currentRecord) => {
        const page = currentRecord.getValue({
            fieldId: SAVED_QUERY_SUITELET.FIELDS[1].ID,
        });
        const queryId = currentRecord.getValue({
            fieldId: SAVED_QUERY_SUITELET.FIELDS[0].ID,
        });
        return { page, queryId };
    };

    EntryPoints.fieldChanged = ({ currentRecord, fieldId }) => {
        if (fieldId === SAVED_QUERY_SUITELET.FIELDS[1].ID) {
            const { page, queryId } = getStaticPageFieldValues(currentRecord);
            console.log('Moving to page', page);
            EntryPoints.filterResults(queryId, page);
        } else if (fieldId !== SAVED_QUERY_SUITELET.FIELDS[0].ID) {
            const { page, queryId } = getStaticPageFieldValues(currentRecord);
            console.log('Applying filters', page);
            EntryPoints.filterResults(queryId, page);
        }
    };

    EntryPoints.filterResults = (queryId, page = 0) => {
        const fields = [];
        search
            .create(reportingEnums.getSuiteQLFilterByQueryId(queryId))
            .run()
            .each((filter) => {
                let fieldId = filter.getValue(filter.columns[0]);
                let fieldType = filter.getValue(filter.columns[2]);
                fields.push({ fieldId, fieldType });
                return true;
            });
        console.log('fields', fields);
        const filters = [];
        const rec = currentRecord.get();
        fields.forEach((field) => {
            let { fieldId, fieldType } = field;
            console.log('field type', fieldType);
            let filterValue = rec.getValue({ fieldId });
            if (fieldType == 11) filterValue = filterValue ? 'T' : 'F';
            filters.push({ fieldId, filterValue });
        });
        const savedQuery = rec.getValue({ fieldId: 'saved_queries_list' });
        filters.push({
            fieldId: 'saved_queries_list',
            filterValue: savedQuery,
        });
        console.log('Filters', filters);
        let filtersParam = {};
        filters.forEach((filter) => {
            filtersParam[filter.fieldId] = filter.filterValue;
        });
        filtersParam[SAVED_QUERY_SUITELET.FIELDS[1].ID] = page;
        console.log('filtersEncoded', filtersParam);
        clientUt.nextPage(
            SAVED_QUERY_SUITELET.SCRIPT_ID,
            SAVED_QUERY_SUITELET.DEPLOY_ID,
            filtersParam,
            true
        );
    };

    return EntryPoints;
});
