/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/query',
    'N/record',
    'N/search',
    'N/url',
    'N/ui/serverWidget',
    'N/runtime',
    '../../Utilities/HB CM Server Utilities',
], /**
 * @param{query} query
 * @param{record} record
 * @param{search} search
 */ (query, record, search, url, ui, runtime, serverUt) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */

    const { CLEARING_FOREIGN_PAYMENTS_SUITELET } = serverUt.enums;
    const getSearchInternalId = (id, type) => {
        return search.load({
            id,
            type,
        }).searchId;
    };

    const onGet = ({ request, response }) => {
        const accountId = runtime
            .getCurrentScript()
            .getParameter({ name: 'custscript_hb_clearing_acc' });
        const accountName = search.lookupFields({
            type: 'account',
            id: accountId,
            columns: ['name'],
        })['name'];
        const accountNameNoHierarchi =
            accountName.split(':')[accountName.split(':').length - 1];
        const accountBalance = query
            .runSuiteQL({
                query: 'SELECT SUM(amount) as balance FROM transactionaccountingline where account = 331 AND accountingbook = 1 GROUP BY account',
            })
            .asMappedResults()[0]['balance'];
        const form = ui.createForm({
            title: 'Clearing Foreign Payments',
            hideNavBar: false,
        });

        form.addButton({
            id: 'custscript_create_transfer',
            label: 'Create Transfer Funds',
            functionName: `createTransferFunds()`,
        });

        // form.addButton({
        //     id: 'custscript_estimate_amount',
        //     label: 'Estimate Amount',
        //     functionName: `estimate()`,
        // });

        form.addButton({
            id: 'custscript_remove',
            label: 'Remove Selected',
            functionName: `removeSelected()`,
        });

        const accountNameField = form.addField({
            id: 'custpage_account_name',
            label: 'Account Name',
            type: 'text',
        });
        accountNameField.updateDisplayType({
            displayType: ui.FieldDisplayType.INLINE,
        });
        accountNameField.defaultValue = accountNameNoHierarchi;

        const accountBalanceField = form.addField({
            id: 'custpage_account_balance',
            label: 'Account Balance',
            type: 'currency',
        });
        accountBalanceField.updateDisplayType({
            displayType: ui.FieldDisplayType.INLINE,
        });
        accountBalanceField.defaultValue = accountBalance;

        const selectedAmount = form.addField({
            id: 'custpage_transfer_balance',
            label: 'Selected Amount',
            type: 'currency',
        });
        selectedAmount.updateDisplayType({
            displayType: ui.FieldDisplayType.INLINE,
        });
        selectedAmount.defaultValue = 0;

        const sublist = form.addSublist({
            id: 'custscript_payment_for_clearing',
            label: 'Payments for Clearing',
            type: ui.SublistType.LIST,
        });

        // sublist.addMarkAllButtons();
        sublist.addButton({
            id: 'custpage_mark_all',
            label: 'Mark All',
            functionName: 'markAll()',
        });

        sublist.addButton({
            id: 'custpage_unmark_all',
            label: 'Unmark All',
            functionName: 'unMarkAll()',
        });

        CLEARING_FOREIGN_PAYMENTS_SUITELET.SUBLIST_FIELDS.forEach(
            (sublistField) => {
                log.debug('sublistField', sublistField);
                let newField = sublist.addField({
                    id: sublistField.ID,
                    label: sublistField.LABEL,
                    type: sublistField.TYPE,
                    source: sublistField.SOURCE || '',
                });
                if (sublistField.DISPLAY_TYPE) {
                    newField.updateDisplayType({
                        displayType: sublistField.DISPLAY_TYPE,
                    });
                }
            }
        );

        let i = 0;
        const sublistFieldsToUpdate =
            CLEARING_FOREIGN_PAYMENTS_SUITELET.SUBLIST_FIELDS.splice(1);
        // log.debug('sublistFieldsToUpdate', sublistFieldsToUpdate);
        search
            .load({
                type: 'transaction',
                id: 'customsearch_hb_payment_clearing',
            })
            .run()
            .each((result) => {
                sublistFieldsToUpdate.forEach((field, j) => {
                    log.debug('field ' + j, field);
                    log.debug(
                        'Value',
                        serverUt.getSearchResultValue(result, j)
                    );
                    sublist.setSublistValue({
                        id: field.ID,
                        line: i,
                        value: serverUt.getSearchResultValue(result, j) || 0,
                    });
                });
                i++;
                return true;
            });

        const searchUrl = `https://${runtime.accountId.replace(
            '_',
            '-'
        )}.app.netsuite.com/app/common/search/searchresults.nl?searchid=${getSearchInternalId(
            'customsearch_hb_cleared_payments',
            'transaction'
        )}&saverun=T&whence=`;

        form.addPageLink({
            type: ui.FormPageLinkType.BREADCRUMB,
            title: 'Transferred Payments',
            url: searchUrl,
        });

        sublist.label = `${sublist.label} (${i})`;

        form.clientScriptModulePath = './HB CS Clearing Foreign Payments.js';

        response.writePage(form);
    };
    const onPost = ({ request, response }) => {
        log.debug('Parameters', request.parameters);
        // log.debug('Remove Lines', request.parameters['0']);
        try {
            const payments = request.parameters.payments.split(',');
            payments.forEach((payment) => {
                log.debug('Removing Payment', payment);
                record.submitFields({
                    type: record.Type.CUSTOMER_PAYMENT,
                    id: payment,
                    values: { custbody_hb_exclude_tans_automation: true },
                });
            });
        } catch (e) {
            log.error('Error OCcurred', e);
        }
    };
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            onGet(context);
        } else {
            onPost(context);
        }
    };

    return { onRequest };
});
