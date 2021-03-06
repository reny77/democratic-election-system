// SPDX-License-Identifier: GPL3
pragma solidity 0.8.1;

contract DemocraticMayor {

    // the address of contract deployer
    address election_master;

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
        address symbol;
        uint personal_souls;
        uint voters_souls;
        uint32 nvoters;        
        address[] voters;
    }
    
    event NewMayor(address _candidate); // for the new mayor, contains the addres of winner
    event DrawMayor(address[] _candidates); // contains the list of candidates who tied
    event CandidateDeposit(address _candidate, uint _tot_val); // when candidate send a deposit
    event EnvelopeCast(address _voter); // when an envelop was casted
    event EnvelopeOpen(address _voter, uint _soul, address _symbol); // when an envelop was casted
    
    // Someone can vote as long as the quorum is not reached
    modifier canVote() {
        require(voting_condition.envelopes_casted < voting_condition.quorum, "Cannot vote now, voting quorum has been reached");
        _;   
    }
    
    // Envelopes can be opened only after receiving the quorum
    modifier canOpen() {
        require(voting_condition.envelopes_casted == voting_condition.quorum, "Cannot open an envelope, voting quorum not reached yet");
        // Check if already open
        require(souls[msg.sender].opened == false, "The sender has already opened the envelope");
        // Check if there is a casted vote
        require(envelopes[msg.sender] != 0x0, "The sender has not casted any votes");
        _;
    }
    
    // The outcome of the confirmation can be computed as soon as:
    // if the winner hasn't been checked
    // OR
    // all the casted envelopes have been opened
    modifier canCheckOutcome() {
        require(voting_condition.winner_checked == false, "The winner has already been checked");
        require(voting_condition.envelopes_opened == voting_condition.quorum, "Cannot check the winner, need to open all the sent envelopes");
        require(election_master == msg.sender, "Only the owner can compute results.");
        _;
    }


    // Modifier for check is a candidate
    modifier checkCandidate() {
        require(candidates[msg.sender].symbol != address(0), "The sender is not a candidate");
        _;
    }
    
    // State attributes
    
    // Initialization variables
    address[] public candidates_list;    
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
    constructor(address[] memory _candidates, address payable _escrow, uint32 _quorum) {          
        // check minimum number of candidates
        require(_candidates.length > 2, "The number of candidates must be at least 3");
        // check minimum quorum
        require(_quorum > 2, "The minimum quorum must be at least 3");

        // set address of deployer (the election_master)
        election_master = msg.sender;

        // init candidates list
        for (uint i = 0; i < _candidates.length; i++) {   

            // init candidates  
            candidates[_candidates[i]] = Candidate({ 
                                                    symbol: _candidates[i],
                                                    personal_souls: 0,
                                                    voters_souls: 0,
                                                    nvoters: 0, 
                                                    voters: new address[](0)
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
    }

    /// @notice Add deposit from candidate
    function add_deposit() checkCandidate public payable {
        candidates[msg.sender].personal_souls = msg.value;
        emit CandidateDeposit(msg.sender, candidates[msg.sender].personal_souls);
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

    /// @notice Check the winner
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
    }
   
    /// @notice compute pay electors and winner
    /// @param winner_symbol (address) The address of winner
    function pay_electors_and_winner(address winner_symbol) private  {
        // first: pay electors
        Candidate memory tmpCandidate = candidates[winner_symbol];
        uint soul_for_electors = tmpCandidate.personal_souls / tmpCandidate.nvoters; 
        for (uint32 j = 0; j < tmpCandidate.voters.length; j++) {
            address voter = tmpCandidate.voters[j];            
            payable(voter).transfer(soul_for_electors);
        }

        // second: pay the winner
        for (uint i = 0; i < candidates_list.length; i++) {            
            if (candidates_list[i] != winner_symbol) {
                Candidate memory tmpLooser = candidates[candidates_list[i]];
                payable(winner_symbol).transfer(tmpLooser.personal_souls);
            }
        }   
        // third: refund loosers
        for (uint i = 0; i < voters.length; i++) {          
            if (souls[payable(voters[i])].symbol != winner_symbol) {                     
                payable(voters[i]).transfer(souls[payable(voters[i])].soul);  // returns soul to users
            }
        }
    }
    
    /// @notice compute no winner
    function no_winners() private returns (bool) {
        uint total_souls = 0;
        for (uint i = 0; i < candidates_list.length; i++) {  
            Candidate memory tmpCandidate = candidates[candidates_list[i]];
            for (uint32 j = 0; j < tmpCandidate.voters.length; j++) {
                address voter = tmpCandidate.voters[j];
                total_souls += souls[voter].soul; // voters souls
            }
           total_souls +=  tmpCandidate.personal_souls;  // candidate souls
        }
        return escrow.send(total_souls);        
    }
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _symbol (address) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, address _symbol, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _symbol, _soul));
    }
    
    /// @notice get candidates list
    function get_candidates() public view returns (address[] memory) {
        return candidates_list;
    }

    /// @notice return candidate soul by address
    /// @param _addr (address) The candidate address
    function get_candidate_soul(address _addr) public view returns (uint) {
        return candidates[_addr].personal_souls;
    }

    /// @notice return get conditions and status of this election
    function get_condition() public view returns (uint32, uint32, uint32) {
        return (voting_condition.quorum, voting_condition.envelopes_casted, voting_condition.envelopes_opened);
    }

    /// @notice check if an account, by address, has vote
    /// @param _address (address) The account address
    function check_has_voted(address _address) public view returns(bool) {
        return souls[_address].symbol != address(0);
    }

    /// @notice return if this current account is the owner
    function is_owner() public view returns(bool) {
        return msg.sender == election_master;
    }

    /// @notice return if this current account is a candidate
    function is_candidate() public view returns(bool) {
        return candidates[msg.sender].symbol != address(0);
    }

    /// @notice return if winner was checked
    function is_winner_checked() public view returns(bool) {
        return voting_condition.winner_checked == true;
    }

    /// @notice return results (there is a winner, address of winners)
    function get_result() public view returns(bool, address[] memory) {
        if (winner_list_by_souls.length == 1) {
            return (true, winner_list_by_souls);
        } else if (winner_list_by_votes.length  == 1) {
            return (true, winner_list_by_votes);
        } else {
            return (false, winner_list_by_votes);
        }  
    }

}