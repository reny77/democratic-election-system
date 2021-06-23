App = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://0.0.0.0:8545',   // Url for web3
    account: '0x0',                 // current ethereum account

    init: function() {

        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        
        // console.log(web3);
        
        if(typeof web3 != 'undefined') {
//            App.web3Provider = web3.currentProvider;
//            web3 = new Web3(web3.currentProvider);
            App.web3Provider = window.ethereum; // !! new standard for modern eth browsers (2/11/18)
            web3 = new Web3(App.web3Provider);
            try {
                    ethereum.enable().then(async() => {
                        console.log("DApp connected to Metamask");
                    });
            }
            catch(error) {
                console.log(error);
            }
        } else {
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }

        return App.initContract();
    },

    /* Upload the contract's abstractions */
    initContract: function() {

        // Get current account
        web3.eth.getCoinbase(function(err, account) {
            if(err == null) {
                App.account = account;
                $("#accountId").html("Your address: " + account);
            }
        });

        // Load content's abstractions
        $.getJSON("DemocraticMayor.json").done(function(c) {        
            App.contracts["Contract"] = TruffleContract(c);
            App.contracts["Contract"].setProvider(App.web3Provider);
            return App.listenForEvents();
        });
    },

    // Write an event listener
    listenForEvents: function() {
        return App.render();
    },

    // Get a value from the smart contract
    render: function() {
        var candidatesRow = $('#candidatesRow');
        var candidateTemplate = $('#candidateTemplate');
        App.contracts["Contract"].deployed().then(async (instance) => {
            const candidates = await  instance.get_candidates();
            for (let i = 0; i < candidates.length; i++) {
                const result_get_candidate_soul = await instance.get_candidate_soul(candidates[i]);

                candidateTemplate.find('img').attr('src', 'https://avatars.dicebear.com/api/human/' + candidates[i] + '.svg');
                candidateTemplate.find('.panel-title').text('Candidate ' + i);
                candidateTemplate.find('.candidate-symbol').text(candidates[i]);
                candidateTemplate.find('.candidate-deposit').text(result_get_candidate_soul.toString(10));
                candidateTemplate.find('.btn-adopt').attr('data-id', candidates[i]);
        
                candidatesRow.append(candidateTemplate.html());
            }
        });
    },

    // Call a function from a smart contract
    // The function send an event that triggers a transaction:: Metamask opens to confirm the transaction by the user
    pressClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            await instance.pressClick({from: App.account});
        });
    } 
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {

        App.init();
    });
});