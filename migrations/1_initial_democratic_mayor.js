const DemocraticMayor = artifacts.require("DemocraticMayor");

module.exports = function(deployer, network, accounts) {

    console.log("------------------------------ migrate ------------------------------");
    let quorum = 5;
    let numberOfCandidates = 5;
    let soul_candidates = [100, 50, 120, 70, 40]; // TODO: randomize...

    let escrow = accounts[1];

    let candidates = [];
    for (let i = 0; i < numberOfCandidates; i++) {        
        console.log(accounts[i + 2]);
        candidates.push(accounts[i + 2]); // first 2 account are reseved for smart contract deployer and for escrow
    }
    
    deployer.deploy(DemocraticMayor, candidates, soul_candidates, escrow, quorum);

    console.log("------------------------------ end migrate ------------------------------\n");    
};

