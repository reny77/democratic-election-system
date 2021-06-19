// SPDX-License-Identifier: GPL3
pragma solidity 0.8.1;

contract Mayor {
    
    // Structs, events, and modifiers
    
    // Store refund data
    struct Refund {
        uint soul;
        bool doblon;
        bool opened; // for remember if this vote has already been opened
    }
    
    // Data to manage the confirmation
    struct Conditions {
        uint32 quorum;
        uint32 envelopes_casted;
        uint32 envelopes_opened;
        bool winner_checked; // for test if the winner has already been checked
    }
    
    event NewMayor(address _candidate);
    event Sayonara(address _escrow);
    event EnvelopeCast(address _voter);
    event EnvelopeOpen(address _voter, uint _soul, bool _doblon);
    
    // Someone can vote as long as the quorum is not reached
    modifier canVote() {
        require(voting_condition.envelopes_casted < voting_condition.quorum, "Cannot vote now, voting quorum has been reached");
        _;   
    }
    
    // Envelopes can be opened only after receiving the quorum
    modifier canOpen() {
        require(voting_condition.envelopes_casted == voting_condition.quorum, "Cannot open an envelope, voting quorum not reached yet");
        _;
    }
    
    // The outcome of the confirmation can be computed as soon as:
    // if the winner hasn't been checked
    // OR
    // all the casted envelopes have been opened
    modifier canCheckOutcome() {
        require(voting_condition.winner_checked == false, "The winner has already been checked");
        require(voting_condition.envelopes_opened == voting_condition.quorum, "Cannot check the winner, need to open all the sent envelopes");
        _;
    }
    
    // State attributes
    
    // Initialization variables
    address payable public candidate;
    address payable public escrow;
    
    // Voting phase variables
    mapping(address => bytes32) envelopes;

    Conditions voting_condition;

    uint public naySoul;
    uint public yaySoul;

    // Refund phase variables
    mapping(address => Refund) souls;
    address[] voters;

    /// @notice The constructor only initializes internal variables
    /// @param _candidate (address) The address of the mayor candidate
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(address payable _candidate, address payable _escrow, uint32 _quorum) {
        candidate = _candidate;
        escrow = _escrow;
        voting_condition = Conditions({quorum: _quorum, envelopes_casted: 0, envelopes_opened: 0, winner_checked: false});
    }


    /// @notice Store a received voting envelope
    /// @param _envelope The envelope represented as the keccak256 hash of (sigil, doblon, soul) 
    function cast_envelope(bytes32 _envelope) canVote public {
        
        if(envelopes[msg.sender] == 0x0) // => NEW, update on 17/05/2021
            voting_condition.envelopes_casted++;

        envelopes[msg.sender] = _envelope;
        emit EnvelopeCast(msg.sender);
    }
    
    
    /// @notice Open an envelope and store the vote information
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _doblon (bool) The voting preference
    /// @dev The soul is sent as crypto
    /// @dev Need to recompute the hash to validate the envelope previously casted
    function open_envelope(uint _sigil, bool _doblon) canOpen public payable {
        
        // Check if already open
        require(souls[msg.sender].opened == false, "The sender has already opened the envelope");

        // Check if there is a casted vote
        require(envelopes[msg.sender] != 0x0, "The sender has not casted any votes");

        bytes32 _casted_envelope = envelopes[msg.sender];
        
        // compute sent envelop with _sigil, _doblon and soul as crypto in msg.value 
        bytes32 _sent_envelope = compute_envelope(_sigil, _doblon, msg.value);
        
        // check if the casted envelop is equals to the sent enveloper
        require(_casted_envelope == _sent_envelope, "Sent envelope does not correspond to the one casted");

        // add a Refund struct to souls mapping
        souls[msg.sender] = Refund(msg.value, _doblon, true);

        // add this address in msg.sender to voters array
        voters.push(payable(msg.sender));

        if (_doblon) // true: confirm mayor, so increase yaySoul by msg.value wei
            yaySoul += msg.value;
        else // false: kick out mayor, so increase naySoul by msg.value wei
            naySoul += msg.value;

        voting_condition.envelopes_opened++; // count votes

        emit EnvelopeOpen(msg.sender, msg.value, _doblon);
    }
    
    /// @notice Either confirm or kick out the candidate. Refund the electors who voted for the losing outcome
    function mayor_or_sayonara() canCheckOutcome public {
        
        // The winner has now checked
        voting_condition.winner_checked = true;
        
        // the mayor gets confirmed if the yay votes are strictly greater (>) than the nay votes
        bool confirmed = yaySoul > naySoul;

        // first, transfer soul to loosers
        for (uint i = 0; i < voters.length; i++) {          
            if (souls[payable(voters[i])].doblon != confirmed) {  // if this                      
                payable(voters[i]).transfer(souls[payable(voters[i])].soul);  // returns soul to users
            }
        }

        if (confirmed) { 
            candidate.transfer(yaySoul); // transfer yaySoul fund to candidate
            emit NewMayor(candidate); // event if the candidate is confirmed as mayor
        } else {
            escrow.transfer(naySoul); // transfer naySoul fund to escrow
            emit Sayonara(escrow); // event if the candidate is NOT confirmed as mayor  
        }

    }
 
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _doblon (bool) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, bool _doblon, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _doblon, _soul));
    }
    
}