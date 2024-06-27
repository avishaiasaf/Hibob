/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/HiBob/Utilities/utils.config.json
 * @Author: Avishai Asaf
 */
define(['N/record', 'N/search', '../../Utilities/HB CM Server Utilities'], /**
 * @param{record} record
 */ (record, search, serverUt) => {
    const { ENTITY_BANK_DETAILS_FI } = serverUt.enums;
    const splitConcatedValues = (value) => {
        const words = value.split(/(?=[A-Z])/);
        return words.join(' ');
    };

    const buildObjValues = (obj) => {
        let stringVal = '';
        for (const [key, value] of Object.entries(obj)) {
            stringVal += `${splitConcatedValues(key)}: ${value}, `;
        }
        return stringVal;
    };

    const splitAction = (newRecord) => {
        try {
            const data = newRecord.getValue({
                fieldId: ENTITY_BANK_DETAILS_FI.PAYMENT_DATA,
            });
            const vendorId = newRecord.getValue({
                fieldId: ENTITY_BANK_DETAILS_FI.VENDOR,
            });
            const vendorDetails = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorId,
                columns: ['address', 'phone'],
            });
            const vendorAddress = vendorDetails['address'];
            const vendorPhone = vendorDetails['phone'];
            log.debug(
                'Splitting Entity Bank Details',
                `id: ${newRecord.id}, Vendor: ${vendorId}, Vendor Address: ${vendorAddress}, Vendor Phone: ${vendorPhone}`
            );
            log.debug('Payment Data', data);

            const tempPayData = {};
            const paymentData = JSON.parse(data);
            const address = paymentData?.address;
            const paymentDefaults = paymentData?.paymentDefaults;

            //Vendor Fields
            tempPayData[ENTITY_BANK_DETAILS_FI.VENDOR_ADDRESS] = vendorAddress;
            tempPayData[ENTITY_BANK_DETAILS_FI.VENDOR_PHONE] = vendorPhone;

            //Level 1 Fields
            tempPayData[ENTITY_BANK_DETAILS_FI.SORT_CODE] =
                paymentData?.localBranchCode;
            tempPayData[ENTITY_BANK_DETAILS_FI.BANK_CODE] =
                paymentData?.bankCode;
            tempPayData[ENTITY_BANK_DETAILS_FI.INSTITUTION_NUMBER] =
                paymentData?.institutionNumber;
            tempPayData[ENTITY_BANK_DETAILS_FI.ROUTING_NUMBER] =
                paymentData?.routingNumber;
            tempPayData[ENTITY_BANK_DETAILS_FI.TRANSIT_NUMBER] =
                paymentData?.transitNumber;
            tempPayData[ENTITY_BANK_DETAILS_FI.BANK_NAME] =
                paymentData?.bankName;
            tempPayData[ENTITY_BANK_DETAILS_FI.IBAN] = paymentData?.iban;
            tempPayData[ENTITY_BANK_DETAILS_FI.ACCOUNT_NUMBER] =
                paymentData?.accountNumber;
            tempPayData[ENTITY_BANK_DETAILS_FI.ACCOUNT_TYPE] =
                paymentData?.accountType;
            tempPayData[ENTITY_BANK_DETAILS_FI.BIC] = paymentData?.bic;

            //Address Fields
            tempPayData[ENTITY_BANK_DETAILS_FI.ADDRESS_LINE_1] = address?.line1;
            tempPayData[ENTITY_BANK_DETAILS_FI.ADDRESS_CITY] = address?.city;
            tempPayData[ENTITY_BANK_DETAILS_FI.ADDRESS_STATE] =
                address?.stateProvince;
            tempPayData[ENTITY_BANK_DETAILS_FI.ADDRESS_POSTAL_CODE] =
                address?.postalCode;

            //Payment Default Fields
            tempPayData[ENTITY_BANK_DETAILS_FI.PURPOSE_MESSAGE] =
                paymentDefaults?.purposeMessage;
            tempPayData[ENTITY_BANK_DETAILS_FI.PURPOSE_CODE] =
                paymentDefaults?.purposeCode;
            tempPayData[ENTITY_BANK_DETAILS_FI.PAYMENT_ISO_CODE] =
                paymentDefaults?.paymentIsoCode;
            tempPayData[ENTITY_BANK_DETAILS_FI.PAYMENT_CODEWORD] =
                paymentDefaults?.paymentCodeword;
            tempPayData[ENTITY_BANK_DETAILS_FI.PAYMENT_PARTY_TYPE] =
                paymentDefaults?.paymentPartyType;
            tempPayData[ENTITY_BANK_DETAILS_FI.PAYMENT_RESULT_PREVIEW] =
                paymentDefaults?.residentialStatus;
            //
            // tempPayData[ENTITY_BANK_DETAILS_FI.BANK_ADDRESS] =
            //     typeof address != 'undefined' ? buildObjValues(address) : '';
            // tempPayData[ENTITY_BANK_DETAILS_FI.PURPOSE] =
            //     typeof paymentDefaults != 'undefined'
            //         ? buildObjValues(paymentDefaults)
            //         : '';

            log.debug('Spliting to fields', tempPayData);
            record.submitFields({
                type: newRecord.type,
                id: newRecord.id,
                values: tempPayData,
            });
        } catch (e) {
            log.error(`Error Occurred for record ${newRecord.id}`, e);
        }
    };

    return { splitAction };
});
