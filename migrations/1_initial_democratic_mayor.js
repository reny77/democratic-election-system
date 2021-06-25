const DemocraticMayor = artifacts.require("DemocraticMayor");

module.exports = function(deployer, network, accounts) {

    console.log("------------------------------ deployer ------------------------------");
    /*let quorum = 5;
    let numberOfCandidates = 5;*/

    let quorum = 2;
    let numberOfCandidates = 2;

    let escrow = accounts[1];

    let candidates = [];
    for (let i = 0; i < numberOfCandidates; i++) {        
        console.log(accounts[i + 2]);
        candidates.push(accounts[i + 2]); // first 2 account are reseved for smart contract deployer and for escrow
    }
    
    deployer.deploy(DemocraticMayor, candidates, escrow, quorum);

    console.log("------------------------------ end deployer ------------------------------\n");    
};

