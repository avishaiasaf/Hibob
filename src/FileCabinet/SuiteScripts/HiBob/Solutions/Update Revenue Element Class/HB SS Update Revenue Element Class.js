/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', '../../Utilities/HB CM Server Utilities'], (
    search,
    record,
    serverUt
) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */

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
        if (revPlanIds.length) {
            revPlanIds.forEach((revPlan) => {
                record.delete({
                    type: 'revenueplan',
                    id: revPlan,
                });
            });
        }

        // record.delete({
        //     type: 'revenueelement',
        //     id: revElmId,
        // });
        record.delete({
            type: 'customrecordzab_revenue_detail',
            id: revDetailId,
        });
        log.debug('Finished Deleting');
    };
    const execute = (scriptContext) => {
        serverUt.onError('test', 'test', { error: 'test' });
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
        Object.entries(searchMap).forEach((revenueElement) => {
            const revenueElementId = revenueElement[0];
            const { plans, revenueDetail } = revenueElement[1];
            deleteRevenueRecords(revenueDetail, revenueElementId, plans);
        });
    };

    return { execute };
});
