var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {
        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try
        {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try
        {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try
        {
            await config.flightSurety.setTestingMode(true);
        }
        catch(e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");
        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) Can Register an Airline only if funded and caller is registerd.', async () => {
        // ARRANGE
        let newAirline = accounts[2];
        // ACT 1
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(newAirline, {from: config.firstAirline});
        }
        catch(e) {
        }
        let result0 = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        let result2 = await config.flightSuretyData.isAirlineFunded.call(newAirline);
        let result3 = await config.flightSuretyData.numberOfAirlines.call();

        // ASSERT
        assert.equal(result0, true, "Owner Airline not Registered.");
        assert.equal(result, true, "New Airline not Registered.");
        assert.equal(result2, 0, "Airline should not be able to register another airline if it hasn't provided funding.");
        assert.equal(result3, 1, "Number of airlines does not reflect correct number.");
    });



    it('(airline) Unknown airlines cannot register new airlines.', async () => {
        // ARRANGE
        let unknownNewAirline = accounts[3];
        // ACT
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(unknownNewAirline, {from: unknownNewAirline});
        }
        catch(e) {
        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(unknownNewAirline);

        // ASSERT
        assert.equal(result, false, "Unknown Airline should not register new airlines.");

    });

    it('(airline) Cannot register more than 4 airlines without consensus.', async () => {
        // ARRANGE
        let newAirline = accounts[2];
        let newAirline2 = accounts[4];
        let newAirline3 = accounts[5];
        let newAirline4 = accounts[6];
        let newAirline5 = accounts[7];

        // ACT 1
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(newAirline2, {from: config.firstAirline});
        }
        catch(e) {
        }
        // ACT 2
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(newAirline3, {from: config.firstAirline});
        }
        catch(e) {
        }
        // ACT 3
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(newAirline4, {from: config.firstAirline});
        }
        catch(e) {
        }
        // ACT 4
        try {
            await config.flightSuretyApp.registerAirlineUnitTest(newAirline5, {from: config.firstAirline});
        }
        catch(e) {
        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        let result2 = await config.flightSuretyData.isAirlineRegistered.call(newAirline2);
        let result3 = await config.flightSuretyData.isAirlineRegistered.call(newAirline3);
        let result4 = await config.flightSuretyData.isAirlineRegistered.call(newAirline4);
        let result5 = await config.flightSuretyData.isAirlineRegistered.call(newAirline5);
        let result6 = await config.flightSuretyData.numberOfAirlines.call();

        // ASSERT
        assert.equal(result, true, "New Airline not Registered.");
        assert.equal(result2, true, "New Airline2 not Registered.");
        assert.equal(result3, true, "New Airline3 not Registered.");
        assert.equal(result4, true, "New Airline4 not Registered.");
        assert.equal(result5, false, "New Airline5 should not be registered without consensys.");
        assert.equal(result6, 4, "New Airline5 should not be registered.");
    });

    it('(airline) More than four airlines uses consensys.', async () => {
        // ARRANGE
        let newAirline = accounts[2];
        let newAirline2 = accounts[8];
        let result, result1, result2, result3;



        // ACT 1
        try {
            result = await config.flightSuretyData.numberOfAirlines.call(); //Get number of airlines (should be four)
            await config.flightSuretyApp.registerAirlineVote.sendTransaction(newAirline2, {from: config.firstAirline});
            result1 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
        } catch(e) {
           // console.log(e)
        }

        // ACT 2
        try {
            await config.flightSuretyApp.registerAirlineUnitTest.sendTransaction(newAirline2, {from: config.firstAirline});
            result2 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
        } catch(e) {
           // console.log(e)
        }

        // ACT 3
        try {
            await config.flightSuretyApp.registerAirlineUnitTest.sendTransaction(newAirline2, {from: config.firstAirline});
            result3 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
        } catch(e) {
            //console.log(e)
        }

                // ACT 3
        try {
            await config.flightSuretyApp.registerAirlineUnitTest.sendTransaction(newAirline2, {from: config.firstAirline});
            result4 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
        } catch(e) {
            //console.log(e)
        }

                // ACT 3
        try {
            await config.flightSuretyApp.registerAirlineUnitTest.sendTransaction(newAirline2, {from: config.firstAirline});
            result5 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
        } catch(e) {
            //console.log(e)
        }    
        
        // ACT 4
        try {
            await config.flightSuretyApp.registerAirlineUnitTest.sendTransaction(newAirline2, {from: config.firstAirline});
            result6 = await config.flightSuretyData.numberOfAirlineVotes.call(newAirline2);
            result7 = await config.flightSuretyData.numberOfAirlines.call(); //Get number of airlines (should be 5)
        } catch(e) {
            //console.log(e)
        }  

        // Test

       // console.log(result);
       // console.log(result1);
       //  console.log(result2);
       // console.log(result3);

        assert.equal(result.toNumber(), 4, "Only 4 airliens should be registered at this point.");
        assert.equal(result1.toNumber(), 0, "Vote should be 0");
        assert.equal(result2.toNumber(), 1, "Vote should be 1");
        assert.equal(result3.toNumber(), 2, "Vote should be 2");
        assert.equal(result4.toNumber(), 3, "Vote should be 3");
        assert.equal(result5.toNumber(), 4, "Vote should be 4");
        assert.equal(result6.toNumber(), 5, "Vote should be 5");
        assert.equal(result7.toNumber(), 9, "9 airliens should be registered at this point.");
    });

    it('(airline) Airline must be fundable', async () => {
        // ARRANGE
        let FirstAirline = accounts[1];
        let SecondtAirline = accounts[2];
        // ACT
        let result1 = await config.flightSuretyData.isAirlineFunded.call(FirstAirline);
        let result2 = await config.flightSuretyData.isAirlineFunded.call(SecondtAirline);
        let result3 = await config.flightSuretyData.isAirlineRegistered.call(SecondtAirline);

        // ASSERT
        assert.equal(result1, 10, "test1 : First Airline should be funded.");
        assert.equal(result2, 0, "Second Airline should not be funded.");
        assert.equal(result3, true, "Second Airline should be registered.");
        //ACT 2 - Fund an airline

        let Fee = await web3.utils.toWei("10", "ether")

        try {
            await config.flightSuretyApp.AirlineFunding({from: SecondtAirline, value:Fee});
        } catch(e) {
            console.log(e)
        }
        let result4 = await config.flightSuretyData.isAirlineFunded.call(FirstAirline);
        let result5 = await config.flightSuretyData.isAirlineFunded.call(SecondtAirline);
        // ASSERT
        assert.equal(Number(result4), 10, "Test 2 : First Airline should still be funded.");
        assert.equal(Number(result5), Fee, "Second Airline should be funded.");

    });

    it('(airline) Allows a funded airline to register a flight', async () => {
        // ARRANGE
        let FirstAirline = accounts[1];

        // ACT 1 - Airline should already be funded
        let result1 = await config.flightSuretyData.isAirlineFunded.call(FirstAirline);
        //Asset - Airline should already be funded
        assert.equal(result1, 10, "Act 1 : First Airline should be prefunded.");

        // ACT 2 - Airline can register a new flight
        let dateString = "2019-08-27T14:45:00Z";
        let departureDate = new Date(dateString).getTime();
        await config.flightSuretyData.registerFlight.sendTransaction("ABC109", departureDate, {from: config.firstAirline}); 
        let result2 = await config.flightSuretyData.numberOfFlights.call();
        let flightHash = await config.flightSuretyData.getFlightKey.call(FirstAirline, "ABC109", departureDate); 
        let result3 = await config.flightSuretyData.showFlightDetails.call(flightHash);

        //Asset - Number of airlines should now be 1
        assert.equal(result2, 1, "Act 2 : Number of flights should now be 1.");
        assert.equal(result3[0], "ABC109", "Act 2 : Flight Code should be ABC109.");
        assert.equal(result3[1], departureDate, "Act 2 : Flight departureDate should match.");
        assert.equal(result3[2], FirstAirline, "Act 2 : Flight Airline should match.");


    });

    it('(airline) Allows a funded airline to insure the flight', async () => {
        // ARRANGE
        let FirstAirline = accounts[1];

        // ACT 1 - Airline should already be funded
        let result1 = await config.flightSuretyData.isAirlineFunded.call(FirstAirline);
        //Asset - Airline should already be funded
        assert.equal(result1, 10, "Act 1 : First Airline should be prefunded.");

        // ACT 2 - Airline can register a new flight
        let dateString = "2019-08-27T14:45:00Z";
        let departureDate = new Date(dateString).getTime();
        await config.flightSuretyData.registerFlight.sendTransaction("ABC109", departureDate, {from: config.firstAirline}); 
        let result2 = await config.flightSuretyData.numberOfFlights.call();
        let flightHash = await config.flightSuretyData.getFlightKey.call(FirstAirline, "ABC109", departureDate); 
        //Insure Flight
       // await config.flightSuretyData.insureFlight.sendTransaction(flightHash, {from: config.firstAirline});
        let result3 = await config.flightSuretyData.showFlightDetails.call(flightHash);

        //Asset - Number of airlines should now be 1
        assert.equal(result2, 2, "Act 2 : Number of flights should now be 1.");
        assert.equal(result3[0], "ABC109", "Act 2 : Flight Code should be ABC109.");
        assert.equal(result3[1], departureDate, "Act 2 : Flight departureDate should match.");
        assert.equal(result3[2], FirstAirline, "Act 2 : Flight Airline should match.");
        //assert.equal(result3[3], true, "Act 2 : Flight should be insured by airline.");
    });

    it('(Passenger) Allows a passenger to insure a flight', async () => {
        // ARRANGE
        let FirstAirline = accounts[1];
        let passenger = accounts[9];

        let dateString = "2019-08-27T14:45:00Z";
        let departureDate = new Date(dateString).getTime();
        let flightHash = await config.flightSuretyData.getFlightKey.call(FirstAirline, "ABC109", departureDate);
        let flightDetails = await config.flightSuretyData.showFlightDetails.call(flightHash);
        let insuranceFee = await web3.utils.toWei("1", "ether")
        //Act 1 : Passenger buy insurance
        await config.flightSuretyData.passengerBuyInsurance.sendTransaction(FirstAirline,"ABC109", departureDate, {from: passenger, value: insuranceFee});
        let numberOfInsuredPassengers = await config.flightSuretyData.numberOfInsuredPassengers.call();
        assert.equal(numberOfInsuredPassengers, 1, "Act 1 : Number of insured passengers should be 1.");

        //Act 2: Check passenger details
        let passengerDetails = await config.flightSuretyData.showInsuredPassenger.call(passenger,"ABC109",departureDate);
        assert.equal(passengerDetails[0], passenger, "Act 2 : Should Match Passenger address.");
        assert.equal(passengerDetails[1], flightHash, "Act 2 : Should Match flight hash.");
        assert.equal(passengerDetails[2], FirstAirline, "Act 2 : Should Match flight airline.");
        assert.equal(passengerDetails[3], departureDate, "Act 2 : Should Match flight airline departureDate.");
        assert.equal(passengerDetails[4], insuranceFee, "Act 2 : Should Match insurance fee.");
        assert.equal(passengerDetails[5], true, "Act 2 : Should be true.");

    });

    it('(Passenger) checks that if the oracles decision is LATE_AIRLINE balance is mult by 1.5', async () => {
        // ARRANGE
        let FirstAirline = accounts[1];
        let passenger = accounts[9];

        let dateString = "2019-08-27T14:45:00Z";
        let departureDate = new Date(dateString).getTime();
        let flightHash = await config.flightSuretyData.getFlightKey.call(FirstAirline, "ABC109", departureDate);
        //let flightDetails = await config.flightSuretyData.showFlightDetails.call(flightHash);
        let insuranceFee = await web3.utils.toWei("1", "ether")
        let refundfee = insuranceFee * 1.5;
        //Act 1 : Passenger buy insurance
        //await config.flightSuretyData.passengerBuyInsurance.sendTransaction(FirstAirline,"ABC109", departureDate, {from: passenger, value: insuranceFee});
        let numberOfInsuredPassengers = await config.flightSuretyData.numberOfInsuredPassengers.call();
        assert.equal(numberOfInsuredPassengers, 1, "Act 1 : Number of insured passengers should be 1.");

        //Act 2: Check passenger details
        let passengerDetails = await config.flightSuretyData.showInsuredPassenger.call(passenger,"ABC109",departureDate);

        assert.equal(passengerDetails[0], passenger, "Act 2 : Should Match Passenger address.");
        assert.equal(passengerDetails[1], flightHash, "Act 2 : Should Match flight hash.");
        assert.equal(passengerDetails[2], FirstAirline, "Act 2 : Should Match flight airline.");
        assert.equal(passengerDetails[3], departureDate, "Act 2 : Should Match flight airline departureDate.");
        assert.equal(passengerDetails[4], insuranceFee, "Act 2 : Should Match insurance fee.");
        assert.equal(passengerDetails[5], true, "Act 2 : Should be true.");

        //Act 3:  send and process the oracles' decision
        await config.flightSuretyApp.processFlightStatus.sendTransaction(FirstAirline, "ABC109", departureDate, 20, {from: config.firstAirline});
        await config.flightSuretyApp.updateInsuredBalance.sendTransaction(passenger, "ABC109", departureDate, {from: config.firstAirline});

        let flightNewDetails = await config.flightSuretyData.showFlightDetails.call(flightHash);
        let passengerNewDetails = await config.flightSuretyData.showInsuredPassenger.call(passenger,"ABC109",departureDate);

        //Act 4: Check new passenger insurance details
        assert.equal(Number(passengerNewDetails[4]), Number(passengerDetails[4] * 1.5), "Act 4 : Passenger Account should have 1.5 insurance fee");
        assert.equal(flightNewDetails[4], 20, "Act 4 : Flight details should now have status of 20.");
    });

    it("checks that a user can withdraw their balance", async() => {
        let FirstAirline = accounts[1];
        let passenger = accounts[9];
        let dateString = "2019-08-27T14:45:00Z";
        let departureDate = new Date(dateString).getTime();
        let flightHash = await config.flightSuretyData.getFlightKey.call(FirstAirline, "ABC109", departureDate);
        let passengerBalanceBefore = await web3.eth.getBalance(passenger);
        let passengerDetails = await config.flightSuretyData.showInsuredPassenger.call(passenger,"ABC109",departureDate);
        let amountToWithdraw = passengerDetails[4]
        await config.flightSuretyData.payPassenger.sendTransaction(flightHash, amountToWithdraw, "ABC109", departureDate, {from: passenger});
        let passengerBalanceAfter = await web3.eth.getBalance(passenger);
        assert.isAbove(Number(passengerBalanceAfter - passengerBalanceBefore), Number(web3.utils.toWei("1", "ether")));
    });

});