App = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://0.0.0.0:8545',     // Url for web3
    account: '0x0',                 // current ethereum account

    init: function() {

        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        
        // console.log(web3);
        
        if(typeof web3 != 'undefined') {
            App.web3Provider = window.ethereum;
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

    initContract: function() {
        // Get current account
        web3.eth.getCoinbase(function(err, account) {
            if (err == null) {
                App.account = account;
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
        // Get current account
        web3.eth.getCoinbase(function(err, account) {
            if (err == null) {
                App.account = account;
                $("#accountId").html(account);
            }
        });

        var candidatesRow = $('#candidatesRow');
        var candidateTemplate = $('#candidateTemplate');
        App.contracts["Contract"].deployed().then(async (instance) => {
            const candidates = await  instance.get_candidates();

            //
            var is_owner = await instance.is_owner({from: App.account});
            var is_candidate = false;
            if (is_owner) {
                $("#roleId").html("Owner");
            } else {
                is_candidate = await instance.is_candidate({from: App.account});
                if (is_candidate) {
                    $("#roleId").html("Candidate " + candidates.indexOf(App.account));
                } else {
                    $("#roleId").html("Citizen");
                }
            }

            // retrive vote conditions and status
            const result_get_condition = await instance.get_condition();
            const {0: cond_quorum, 1: cond_envelopes_casted, 2: cond_envelopes_opened} = result_get_condition;
            $("#quorumId").html(cond_quorum.toString());
            $("#envelopCastedId").html(cond_envelopes_casted.toString());
            $("#envelopOpenedId").html(cond_envelopes_opened.toString());

            // empty candidates list
            candidatesRow.empty();
            for (let i = 0; i < candidates.length; i++) {
                const result_get_candidate_soul = await instance.get_candidate_soul(candidates[i]);

                candidateTemplate.find('img').attr('src', 'https://avatars.dicebear.com/api/micah/' + candidates[i] + '.svg');
                candidateTemplate.find('.panel-title').text('Candidate ' + i);
                candidateTemplate.find('.candidate-symbol').text(candidates[i]);
                candidateTemplate.find('.candidate-deposit').text(result_get_candidate_soul.toString(10));
                
                candidateTemplate.find('.btn-vote-modal').attr('data-address', candidates[i]);

                if (is_candidate && candidates[i] == App.account) {
                    candidateTemplate.find('.btn-deposit-modal').show().attr('data-address', candidates[i]);
                } else {
                    candidateTemplate.find('.btn-deposit-modal').hide();
                }

                candidatesRow.append(candidateTemplate.html());
                
            }
        });
    },
    voteClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const envelop = await instance.compute_envelope($('#voter-sigil').val(), $('#candidate-address').val(), $('#voter-soul').val());
            const result = await instance.cast_envelope(envelop, { from: App.account });
        });
    } ,
    depositClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            await instance.add_deposit.sendTransaction({from: App.account, value: $('#deposit-soul').val()})
            .then(function(receipt){
                location.reload();
            });
        });
    } 
}

// handle change account on MetaMask
ethereum.on('accountsChanged', function (accounts) {
	const account = accounts[0];
    App.account = account;
    App.render();
});

$('#depositModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var address = button.data('address') // Extract info from data-* attributes
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    var modal = $(this)
    modal.find('.modal-title').text('New deposit to ' + address)
});

$('#voteModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var address = button.data('address') // Extract info from data-* attributes
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    var modal = $(this)
    modal.find('.modal-title').text('Vote: ' + address)
});

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});