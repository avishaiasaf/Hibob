    /**
 * @NApiVersion 2.x
 * @NScriptType fiParserPlugin
 */
define(['N/query', 'N/url'],
function (query, url)
{
    // internal function used to load configuration for this plugin from a custom record
    function loadConfiguration(configurationId)
    {
        var queryObj = query.create({
            type: 'customrecord_sampleconfig',
            columns: [{ fieldId: 'custrecord_memoprefix' }],
            condition: {
                fieldId: 'custrecord_configurationid',
                operator: query.Operator.IS,
                values: [configurationId]
            }
        });

        return queryObj.run().results[0];
    }

    function getConfigurationPageUrl(context)
    {
        var configurationId = context.pluginConfiguration.getConfigurationFieldValue({fieldName: "configuration_id"});
        context.configurationPageUrl = url.resolveScript({
            scriptId: 'customscript_configuration_suitelet',
            deploymentId: 'customdeploy_configuration_deployment',
            params: {
                configurationId: configurationId
            }
        });
    }

    function parseData(context)
    {
        var configurationId = context.pluginConfiguration.getConfigurationFieldValue({fieldName: "configuration_id"});
        var configuration = loadConfiguration(configurationId)
        var data = JSON.parse(context.inputData.getContents());

        /*
            Sample data:

            {
                "accounts": [
                    {
                        "accountId": "ACCOUNT1",
                        "employeeId": "EMPLOYEE1",
                        "cardHolder": "Card Holder",
                        "dataAsOfDate": "2020-07-01",
                        "openingBalance": 0.0,
                        "closingBalance": 100.0,
                        "currentBalance": 100.0,
                        "dueBalance": 100.0,
                        "transactions": [
                            {
                                "date": "2020-07-01",
                                "amount": 100.0,
                                "transactionTypeCode": "CHARGE",
                                "uniqueId": "TRN001",
                                "id": "CHK001",
                                "payee": "A Customer",
                                "currency": "US",
                                "memo": "Customer Credit",
                                "transactionStatus": "Posted",
                                "customerReferenceId": "CUST01",
                                "invoiceReferenceIds": ["101", "102"],
                                "billedTaxAmount": 10.0,
                                "localChargeAmount": 100.0,
                                "currencyExchangeRate": 1.0,
                                "expenseCode": "CC"
                            }
                        ]
                    }
                ]
            }
         */

        for (var accountIndex = 0; accountIndex < data.accounts.length; accountIndex++) {
            var account = data.accounts[accountIndex];

            var accountData = context.createAccountData({
                accountId: account.accountId,
                employeeId:  account.employeeId,
                cardHolder: account.cardHolder,
                dataAsOfDate: account.dataAsOfDate,
                openingBalance: account.openingBalance,
                closingBalance: account.closingBalance,
                currentBalance: account.currentBalance,
                dueBalance: account.dueBalance
            });

            for (var transactionIndex = 0; transactionIndex < account.transactions.length; transactionIndex++) {
                var transaction = account.transactions[transactionIndex];
                accountData.createNewTransaction({
                    date: transaction.date,
                    amount: transaction.amount,
                    transactionTypeCode: transaction.transactionTypeCode,
                    uniqueId: transaction.uniqueId,
                    id: transaction.id,
                    payee: transaction.payee,
                    currency: transaction.currency,
                    memo: configuration.custrecord_memoprefix + transaction.memo,
                    transactionStatus: transaction.transactionStatus,
                    customerReferenceId: transaction.customerReferenceId,
                    invoiceReferenceIds: transaction.invoiceReferenceIds,
                    billedTaxAmount: transaction.billedTaxAmount,
                    localChargeAmount: transaction.localChargeAmount,
                    currencyExchangeRate: transaction.currencyExchangeRate,
                    expenseCode: transaction.expenseCode
                });
            }
        }
    }

    function getStandardTransactionCodes(context)
    {
        context.createNewStandardTransactionCode({
            transactionCode: 'CHARGE',
            transactionType: 'PAYMENT'
        });
    }

    function getExpenseCodes(context)
    {
        context.createNewExpenseCode({
            code: 'CC',
            description: 'Customer Credit'
        });
    }

    return {
        getConfigurationPageUrl: getConfigurationPageUrl,
        parseData: parseData,
        getStandardTransactionCodes: getStandardTransactionCodes,
        getExpenseCodes: getExpenseCodes
    }
});