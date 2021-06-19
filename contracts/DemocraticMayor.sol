// SPDX-License-Identifier: GPL3
pragma solidity 0.8.1;

contract DemocraticMayor {
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

    // information about a candidate
    struct Candidate {
        address payable id;
        uint personal_soul;
        uint total_soul_from_voters;
        uint32 nvoters;        
        address[] voters;
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
    address payable[] public candidates;
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
    /// @param _candidates (address) The addresses of the mayor candidates
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(address payable[] memory _candidates, address payable _escrow, uint32 _quorum) {           

        // first, transfer soul to loosers
        for (uint i = 0; i < voters.length; i++) {          
            if (souls[payable(voters[i])].doblon != confirmed) {  // if this                      
                payable(voters[i]).transfer(souls[payable(voters[i])].soul);  // returns soul to users
            }
        }

        require(msg.value > 0, "Deposite souls must be greater than 0...");
        candidates[_candidate] = Candidate({ id: payable(_candidate), vote_count: 0, voters: new address payable[](0)});
        voting_condition.candidate_count++;
        candidate_list.push(_candidate);
        souls[_candidate] = Refund(msg.value, _candidate);
        emit CandidateCounts(voting_condition.candidate_count);







        candidates = _candidates;
        escrow = _escrow;
        voting_condition = Conditions({quorum: _quorum, envelopes_casted: 0, envelopes_opened: 0, winner_checked: false});
    }


   
 
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _doblon (bool) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, bool _doblon, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _doblon, _soul));
    }
    
}