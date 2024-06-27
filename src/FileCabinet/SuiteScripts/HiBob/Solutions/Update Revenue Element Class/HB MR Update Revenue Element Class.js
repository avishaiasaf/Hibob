/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/record',
    'N/search',
    'N/file',
    '../../Utilities/HB CM Server Utilities',
], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, file, serverUt) => {
    const functions = {};

    const chunkIdFilter = (ids, chunk = 100) => {
        const idFilter = [];
        for (let i = 0; i < ids.length; i += chunk) {
            idFilter.push([
                'revenueelement.internalid',
                'anyof',
                ...ids.slice(i, i + chunk),
            ]);
            if (i < ids.length - chunk) idFilter.push('OR');
        }
        return idFilter;
    };

    const deleteRevenueRecords = (revDetailId, revElmId, revPlanIds) => {
        log.debug(
            'Now deleting',
            `Revenue Detail: ${revDetailId}, Revenue Element: ${revElmId}, Revenue Plan: ${revPlanIds}`
        );
        revPlanIds.forEach((revPlan) => {
            record.delete({
                type: 'revenueplan',
                id: revPlan,
            });
        });

        record.delete({
            type: 'revenueelement',
            id: revElmId,
        });
        record.delete({
            type: 'customrecordzab_revenue_detail',
            revDetailId,
        });
        log.debug('Finished Deleting');
    };

    /**
     * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
     * @param {Object} inputContext
     * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Object} inputContext.ObjectRef - Object that references the input data
     * @typedef {Object} ObjectRef
     * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
     * @property {string} ObjectRef.type - Type of the record instance that contains the input data
     * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
     * @since 2015.2
     */

    functions.getInputData = (inputContext) => {
        const searchMap = {};
        let elementBatches = [];
        const revenueDetailSearch = search
            .load({
                id: 'customsearch_hb_rev_detail_no_class',
                type: 'customrecordzab_revenue_detail',
            })
            .runPaged({ pageSize: 1000 });

        revenueDetailSearch.pageRanges.forEach((pageRange) => {
            const currentPage = revenueDetailSearch.fetch({
                index: pageRange.index,
            });

            currentPage.data.forEach((result) => {
                const revenueDetail = result.getValue(result.columns[0]);
                const revenueElement = result.getValue(result.columns[1]);
                searchMap[revenueElement] = { revenueDetail, plans: [] };
            });
        });
        log.debug('Search Object 1st step', JSON.stringify(searchMap));

        const idFilter = chunkIdFilter(Object.keys(searchMap));

        const planSearch = search
            .create({
                type: 'revenueplan',
                filters: [idFilter],
                columns: [
                    { name: 'internalid', label: 'Plan ID' },
                    {
                        name: 'internalid',
                        join: 'revenueElement',
                        label: 'Element ID',
                    },
                ],
            })
            .runPaged({ pageSize: 1000 });

        planSearch.pageRanges.forEach((pageRange) => {
            const currentPage = planSearch.fetch({
                index: pageRange.index,
            });

            currentPage.data.forEach((result) => {
                const planId = result.getValue(result.columns[0]);
                const elementId = result.getValue(result.columns[1]);
                searchMap[elementId].plans.push(planId);
            });
        });

        log.debug('Search Object', JSON.stringify(searchMap));
        // return searchMap;

        const fileId = file
            .create({
                name: 'Deleting Revenue Details.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(searchMap),
                folder: 1173769,
            })
            .save();
        log.debug('JSON file', fileId);
        return {
            type: 'file',
            id: fileId,
        };
    };

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} mapContext.key - Key to be processed during the map stage
     * @param {string} mapContext.value - Value to be processed during the map stage
     * @since 2015.2
     */

    // functions.map = (mapContext) => {
    //     const searchResult = JSON.parse(mapContext.value);
    //     log.debug('Executing Map Function', searchResult);
    //     const elementId = searchResult.id;
    //     const classId = Object.values(searchResult.values)[3];
    //
    //     performFix(elementId, classId);
    //
    //     mapContext.write({
    //         key: elementId,
    //         value: classId,
    //     });
    // };

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    functions.reduce = (reduceContext) => {
        log.debug('reduceContext', reduceContext);
        const searchResult = JSON.parse(reduceContext.values);
        log.debug('Executing Reduce Function', searchResult);
        const revenueDetailId = searchResult.id;
        // log.debug('revenueDetailId', revenueDetailId);

        // performFix(elementId, classId);
        deleteRevenueRecords();

        // reduceContext.write({
        //     key: revenueDetailId,
        //     value: '1',
        // });
    };

    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    // functions.summarize = (summaryContext) => {};

    return functions;
});
