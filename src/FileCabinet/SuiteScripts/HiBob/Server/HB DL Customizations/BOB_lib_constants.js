define([],

		function() {

	// CashApp status

	var cashAppStatus = {
			"PendingCashApp":1,
			"FailedNoMatch":2,
			"SucessMatched":3,
			"MatchedOverPayment":4,
			"MatchedUnderPayment":5,
			"PendingConfirmationGuess":6,
			"DoNotProcess":7,
      "CreateUnappliedPayment":8,
      "UnappliedPaymentCreated":9,
            "PaymentCreationFailed":10
	};

	var paymentMethod = {
			"wire":7
	};
	var boomi_user = 26435

	var integrationStatus = {
			"Ready":1,
			"Success":2,
			"Error":3
	};
	
	//currency list
  var nscurrency ={
    "USD":1
  };
	
	//Update Key as Subsidiary and Value as Form other than IL
	var subsidiaryCustomForm = {
			10	:	160,  //HB AU - AU HB Product Invoice
			2	:	150, //HB Holding -  Custom Service Invoice
			9	:	150, //HB NL - Custom Service Invoice
			3	:	150, //HB UK - Custom Service Invoice
			8	:	150 //HB US - Custom Service Invoice
      		
	};
	return {
		cashAppStatus:cashAppStatus,
		paymentMethod:paymentMethod,
		integrationStatus:integrationStatus,
		subsidiaryCustomForm:subsidiaryCustomForm,
      boomi_user:boomi_user,
      nscurrency:nscurrency
	};

});
