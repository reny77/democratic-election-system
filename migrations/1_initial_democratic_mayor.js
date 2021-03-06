const DemocraticMayor = artifacts.require("DemocraticMayor");

module.exports = function(deployer, network, accounts) {

    let quorum = 3;
    let numberOfCandidates = 5;

    let escrow = accounts[1];

    let candidates = [];
    for (let i = 0; i < numberOfCandidates; i++) {     
        candidates.push(accounts[i + 2]); // first 2 account are reseved for smart contract deployer and for escrow
    }
    
    deployer.deploy(DemocraticMayor, candidates, escrow, quorum);
};

