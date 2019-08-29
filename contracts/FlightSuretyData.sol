pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping (address => bool) private registeredAirlines;
    mapping (address => uint) private fundedAirlines;
    mapping (bytes32 => address) private passengerInsurance;
    mapping(address => uint256) private authorizedContracts;

    mapping(address =>uint) supportFor; //Votes for an airline

    address[] public ArrayOfAirlines;
    bytes32[] private flightList;
    bytes32[] private passengerInsureList;

    struct Passenger {
        address passenger;
        bytes32 flightHash;
        address airline;
        uint256 departureDate;
        uint balance;
        bool isInsured;
    }

    struct Flight {
        string code;
        bool isRegistered;
        bool isInsured;
        uint8 statusCode;
        uint256 departureDate;
        address airline;
    }
    //Flight[] private flightList;

    mapping(bytes32 => Flight) private flights;
    mapping (bytes32 => Passenger) private Insuredpassengers;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirline) public
    {
        contractOwner = msg.sender;
        registeredAirlines[firstAirline] = true;
        fundedAirlines[firstAirline] += 10;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    /**


    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()public view returns(bool)
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external requireContractOwner
    {
        operational = mode;
    }

    function isAirlineRegistered(address airline) external view returns (bool) {
        return registeredAirlines[airline];
    }

    function isAirlineFunded(address airline) external view returns (uint) {

        return fundedAirlines[airline];
    }

    function numberOfAirlines() external view returns (uint) {
        return ArrayOfAirlines.length;
    }

    function registerAirlineVote(address airline) external payable {
        supportFor[airline] = supportFor[airline] + 1;
    }

    function numberOfAirlineVotes(address airline) external view returns (uint) {
        return supportFor[airline];
    }

    function numberOfFlights() external view returns (uint) {
        return flightList.length;
    }

    function numberOfInsuredPassengers() public view returns (uint) {
       return passengerInsureList.length;
    }

    function showInsuredPassenger(address passenger, string _flightCode, uint256 _departureDate)
        external view returns (address, bytes32, address, uint256, uint, bool) {

        bytes32 passengerHash = getFlightKey(passenger, _flightCode, _departureDate);

        return (Insuredpassengers[passengerHash].passenger, //0
                Insuredpassengers[passengerHash].flightHash, //1
                Insuredpassengers[passengerHash].airline, //2
                Insuredpassengers[passengerHash].departureDate, //3
                Insuredpassengers[passengerHash].balance, //4
                Insuredpassengers[passengerHash].isInsured); //5
    }

    function showInsuranceBalance(address passenger, string _flightCode, uint256 _departureDate) external view returns (uint) {
        bytes32 passengerHash = getFlightKey(passenger, _flightCode, _departureDate);

        return Insuredpassengers[passengerHash].balance;
    }

    function showFlightDetails(bytes32 _flightHash) external view returns (string, uint256, address, bool, uint8) {
        return ( flights[_flightHash].code,
                flights[_flightHash].departureDate,
                flights[_flightHash].airline,
                flights[_flightHash].isInsured,
                flights[_flightHash].statusCode);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

     function authorizeCaller(address contractAddress)external requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeCaller(address contractAddress)external requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }


   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address airline) external requireIsOperational returns (bool)
    {
        //Adds a new airline to the mapping
        registeredAirlines[airline] = true;
        ArrayOfAirlines.push(airline); //To monitor number of airlines.
        return registeredAirlines[airline];
    }

    function fundAirline(address airline, uint amount) external payable requireIsOperational returns (uint) {
        fundedAirlines[airline] += amount;
        return fundedAirlines[airline];
    }

    function registerFlight(string _flightCode, uint256 _departureDate) external payable requireIsOperational {
        bytes32 flightHash = getFlightKey(msg.sender, _flightCode, _departureDate);

        flights[flightHash].code = _flightCode;
        flights[flightHash].isRegistered = true;
        flights[flightHash].isInsured = false;
        flights[flightHash].statusCode = 0;
        flights[flightHash].departureDate = _departureDate;
        flights[flightHash].airline = msg.sender;

        flightList.push(flightHash);
    }

    function insureFlight(bytes32 _flightHash) public payable requireIsOperational  {
        flights[_flightHash].isInsured = true;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */
    function passengerBuyInsurance(address _airline, string _flightCode, uint _departureDate) external payable requireIsOperational {
        bytes32 flightHash = getFlightKey(_airline, _flightCode, _departureDate);
        bytes32 passengerHash = getFlightKey(msg.sender, _flightCode, _departureDate);

        Insuredpassengers[passengerHash].passenger = msg.sender;
        Insuredpassengers[passengerHash].flightHash = flightHash;
        Insuredpassengers[passengerHash].airline = _airline;
        Insuredpassengers[passengerHash].departureDate = _departureDate;
        Insuredpassengers[passengerHash].balance = msg.value;
        Insuredpassengers[passengerHash].isInsured = true;

        passengerInsureList.push(passengerHash);
    }

    function updateFlightStatus(bytes32 _flightHash, uint8 newStatus) external requireIsOperational {
        flights[_flightHash].statusCode = newStatus;
    }

    function updateBalance(address _passenger, string _flightCode, uint _departureDate) external payable requireIsOperational {
        bytes32 passengerHash = getFlightKey(_passenger, _flightCode, _departureDate);
    
        Insuredpassengers[passengerHash].balance = Insuredpassengers[passengerHash].balance.mul(15);
        Insuredpassengers[passengerHash].balance = Insuredpassengers[passengerHash].balance.div(10);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees() external requireIsOperational
    {
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payPassenger(bytes32 _flightHash, uint amount, string _flightCode, uint _departureDate) external requireIsOperational
    {
        bytes32 passengerHash = getFlightKey(msg.sender, _flightCode, _departureDate);
        Insuredpassengers[passengerHash].balance = Insuredpassengers[passengerHash].balance.sub(amount);
        msg.sender.transfer(amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund() public payable requireIsOperational
    {
    }

    function getFlightKey(address airline, string flight,uint256 timestamp) public view requireIsOperational returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable requireIsOperational
    {
        fund();
    }


}

