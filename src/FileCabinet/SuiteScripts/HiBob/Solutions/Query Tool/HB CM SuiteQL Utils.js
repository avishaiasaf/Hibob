/**
 * @NApiVersion 2.1
 */
define([
    'N/query',
    'N/record',
    'N/search',
    'N/file',
    'N/task',
    'N/runtime',
    '../../Utilities/HB CM Server Utilities',
], /**
 * @param{query} query
 * @param{record} record
 * @param{search} search
 */ (query, record, search, file, task, runtime, serverUt) => {
    const savedSuiteQL = {};
    const FOLDER_ID = '1581167';
    const { reportingEnums } = serverUt;

    savedSuiteQL.getQueryFromSavedQueryObject = (savedQuerySelected) => {
        return search.lookupFields({
            type: 'customrecord_hb_saved_suiteql',
            id: savedQuerySelected,
            columns: ['custrecord_hb_ssql_sql_query', 'name'],
        });
    };

    savedSuiteQL.createTargetFile = (name) => {
        let folder = FOLDER_ID;
        const fileObj = file.create({
            name: `${name}.csv`,
            fileType: file.Type.CSV,
            contents: 'temp...',
            folder,
        });
        return fileObj.save();
    };

    savedSuiteQL.createSavedQueryResultsRecord = (
        fileId,
        savedQuery,
        filters = false
    ) => {
        const savedResults = record.create({
            type: 'customrecord_hb_saved_query_results',
        });
        savedResults.setValue({
            fieldId: 'custrecord_hb_ssql_results_file',
            value: fileId,
        });
        savedResults.setValue({
            fieldId: 'custrecord_hb_ssql_parent_query',
            value: savedQuery,
        });
        if (filters) {
            savedResults.setValue({
                fieldId: 'custrecord_hb_ssql_query_filters',
                value: filters,
            });
        }
        return savedResults.save();
    };

    savedSuiteQL.getQueryDefaultParams = (savedQuerySelected) => {
        const defaultParams = [];

        search
            .create(
                reportingEnums.getSuiteQLFilterByQueryId(savedQuerySelected)
            )
            .run()
            .each((filter) => {
                let defaultValue = filter.getValue(filter.columns[4]);
                let dynamicDefaultId = filter.getValue(filter.columns[6]);
                let dynamicDefault = null;
                if (dynamicDefaultId) {
                    dynamicDefault = search.lookupFields({
                        type: 'customrecord_hb_ssql_formula',
                        id: dynamicDefaultId,
                        columns: ['custrecord_hb_ssql_formula'],
                    })['custrecord_hb_ssql_formula'];
                }
                defaultParams.push(dynamicDefault || defaultValue);
            });
        return defaultParams;
    };

    savedSuiteQL.runSearchAndExport = (
        savedQuery,
        fileName,
        fileId,
        resultRecordId,
        params,
        recipients = false,
        lastRunDate
    ) => {
        const queryTask = task.create({ taskType: task.TaskType.SUITE_QL });
        queryTask.fileId = fileId;
        queryTask.query =
            savedSuiteQL.getQueryFromSavedQueryObject(savedQuery)[
                'custrecord_hb_ssql_sql_query'
            ];
        if (params) {
            queryTask.params = params;
        }

        log.debug('Running Query', queryTask.query);
        log.debug('Query Params', queryTask.params);
        log.debug('Recipients', recipients);

        const compressTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
        });
        compressTask.scriptId = 'customscript_hb_ssql_file_handler';
        compressTask.deploymentId = 'customdeploy_hb_ssql_file_handler';
        const compressTaskParams = {
            action: 'COMPRESS_RESULTS',
            fileName,
            fileId,
            recordId: resultRecordId,
            folderId: FOLDER_ID,
            userId: !recipients ? runtime.getCurrentUser().id : recipients[0],
            cc: !recipients ? null : recipients.splice(1, 9),
            savedQueryId: savedQuery,
            lastRunDate,
        };

        compressTask.params = {
            custscript_hb_ssql_file_data: compressTaskParams,
        };
        queryTask.addInboundDependency(compressTask);
        log.debug('queryTask', `${queryTask} ${queryTask.params}`);

        const queryTaskId = queryTask.submit();
        record.submitFields({
            type: 'customrecord_hb_saved_query_results',
            id: resultRecordId,
            values: { custrecord_hb_ssql_task_id: queryTaskId },
        });
        return queryTaskId;
    };

    return savedSuiteQL;
});
