// SPDX-License-Identifier: GPL3
pragma solidity 0.8.1;

contract DemocraticMayor {

     address owner;

    // Structs, events, and modifiers    
    // Store refund data
    struct Refund {
        uint soul;
        address symbol;
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
        address payable symbol;
        uint personal_souls;
        uint voters_souls;
        uint32 nvoters;        
        address payable[] voters;
    }
    
    event NewMayor(address _candidate);
    event DrawMayor(address[] _candidates);
    event Sayonara(address _escrow);
    event EnvelopeCast(address _voter);
    event EnvelopeOpen(address _voter, uint _soul, address _symbol);
    
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
    address payable[] public candidates_list;    
    mapping(address => Candidate) candidates;
    address payable public escrow;
    
    // Voting phase variables
    mapping(address => bytes32) envelopes;

    Conditions voting_condition;

     // Refund phase variables
    mapping(address => Refund) souls;
    address[] voters;

    // contains the candidate winner list by souls, is a list beacuse there is the possibility of a draw
    address[] winner_list_by_souls;
    // contains the candidate winner list by votes, is a list beacuse there is the possibility of a draw
    address[] winner_list_by_votes;


    /// @notice The constructor only initializes internal variables
    /// @param _candidates (address) The addresses of the mayor candidates
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(address payable[] memory _candidates, uint32[] memory soul_candidates, address payable _escrow, uint32 _quorum) {          
        // TODO: check minum number of candidate???

        // init candidates list
        for (uint i = 0; i < _candidates.length; i++) {   
            
            // check soul_candidates is gt 0, proposal #1    
            require(soul_candidates[i] > 0, "Soul must be greater than 0");

            // init candidates  
            candidates[_candidates[i]] = Candidate({ 
                                                    symbol: _candidates[i],
                                                    personal_souls: soul_candidates[i],
                                                    voters_souls: 0,
                                                    nvoters: 0, 
                                                    voters: new address payable[](0)
                                                });
        }
        candidates_list = _candidates;
        escrow = _escrow; // init escrow

        // init vote conditions
        voting_condition = Conditions({
                                        quorum: _quorum, 
                                        envelopes_casted: 0, 
                                        envelopes_opened: 0, 
                                        winner_checked: false
                                    });
       // TODO: emit event?
    }


    /// @notice Store a received voting envelope
    /// @param _envelope The envelope represented as the keccak256 hash of (sigil, symbol, soul) 
    function cast_envelope(bytes32 _envelope) canVote public {        
        if (envelopes[msg.sender] == 0x0) // => NEW, update on 17/05/2021
            voting_condition.envelopes_casted++;

        envelopes[msg.sender] = _envelope;
        emit EnvelopeCast(msg.sender);
    }




   /// @notice Open an envelope and store the vote information
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _symbol (address) The voting preference
    /// @dev The soul is sent as crypto
    /// @dev Need to recompute the hash to validate the envelope previously casted
    function open_envelope(uint _sigil, address _symbol) canOpen public payable {
        
        // Check if already open
        require(souls[msg.sender].opened == false, "The sender has already opened the envelope");

        // Check if there is a casted vote
        require(envelopes[msg.sender] != 0x0, "The sender has not casted any votes");

        bytes32 _casted_envelope = envelopes[msg.sender];
        
        // compute sent envelop with _sigil, _doblon and soul as crypto in msg.value 
        bytes32 _sent_envelope = compute_envelope(_sigil, _symbol, msg.value);
        
        // check if the casted envelop is equals to the sent enveloper
        require(_casted_envelope == _sent_envelope, "Sent envelope does not correspond to the one casted");

        // add a Refund struct to souls mapping
        souls[msg.sender] = Refund(msg.value, _symbol, true);

        // add this address in msg.sender to voters array
        voters.push(payable(msg.sender));


        // register vote...
        candidates[_symbol].nvoters++;
        candidates[_symbol].voters_souls += msg.value;
        candidates[_symbol].voters.push(payable(msg.sender));

        voting_condition.envelopes_opened++; // count votes

        emit EnvelopeOpen(msg.sender, msg.value, _symbol);
    }

    /// @notice Either confirm or kick out the candidate. Refund the electors who voted for the losing outcome
    function mayor_or_sayonara() canCheckOutcome public {
        
        // The winner has now checked
        voting_condition.winner_checked = true;
        

        // CHECK WINNER BY SOUL
        uint max_souls = 0;
        for (uint i = 0; i < candidates_list.length; i++) {  
            Candidate memory tmpCandidate = candidates[candidates_list[i]];
                        
            // check if this candidate "can be" a winner (gt or equal than max counted at this moment...)
            if (tmpCandidate.voters_souls >= max_souls) {                
                // if this candate has the gt max soul counted at this moment: set new max_soul and reset (by delete) winner_list_by_souls array
                if (tmpCandidate.voters_souls > max_souls) {                                                            
                    max_souls = tmpCandidate.voters_souls;
                    delete winner_list_by_souls;
                }
                // now add candidate to winner list
                // if this is the candidate with max soul at this moment, the list was reset in the previous block so now this is the only winner
                winner_list_by_souls.push(tmpCandidate.symbol);
            }
        }

        // IF THE WINNER LIST CONTAINS > 1 CHECK WINNER BY VOTES, CREATE A NEW LIST
        if (winner_list_by_souls.length > 1) {                
            // there is more than one winner by soul so, count by votes
             uint max_votes = 0;
            for (uint i = 0; i < winner_list_by_souls.length; i++) {  
                Candidate memory tmpCandidate = candidates[candidates_list[i]];
                if (tmpCandidate.nvoters >= max_votes) {
                    // if this candate has the gt max_votes counted at this moment: set new max_votes and reset (by delete) winner_list_by_votes array
                    if (tmpCandidate.nvoters > max_votes) {                                        
                        max_votes = tmpCandidate.nvoters;
                        delete winner_list_by_votes;
                    }
                    // now add candidate to winner_list_by_votes
                    // if this is the candidate with max_votes at this moment, the list was reset in the previous block so now this is the only winner
                    winner_list_by_votes.push(tmpCandidate.symbol);                    
                }
            }
        }

        if (winner_list_by_souls.length == 1) {
            pay_electors_and_winner(winner_list_by_souls[0]);
            emit NewMayor(winner_list_by_souls[0]);
        } else if (winner_list_by_votes.length  == 1) {
            pay_electors_and_winner(winner_list_by_votes[0]);
            emit NewMayor(winner_list_by_votes[0]);
        } else {
            no_winners();
            emit DrawMayor(winner_list_by_votes);
        }

        /*
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
        }*/

    }
   
    function pay_electors_and_winner(address winner_symbol) private pure {
        // first, pay electors

        // second, pay the winner

    }
 
    function no_winners() private pure {
        
    }
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _symbol (address) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, address _symbol, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _symbol, _soul));
    }
    



}