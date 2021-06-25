App = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://0.0.0.0:8545',     // Url for web3
    account: '0x0',                 // current ethereum account
    latestblockNumber: 0,           // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs

    init: function() {
        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
                
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
        // avoid load last event emeted 
        // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
        web3.eth.getBlockNumber(function (error, result) {
            if (!error) {
                latestblockNumber = result;
                console.log("latestBlock=" + latestblockNumber);
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

        App.contracts["Contract"].deployed().then(async (instance) => {
            // click is the Solidity event// If event has parameters: event.returnValues.valueName
            instance.CandidateDeposit(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                    }
                }
            });
            instance.EnvelopeCast(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                    }
                }
            });
            instance.EnvelopeOpen(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                    }
                }
            });
            instance.NewMayor(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                    }
                }
            });
            instance.DrawMayor(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                    }
                }
            });
        });
        console.log("listener installed");
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
        // empty candidates list
        candidatesRow.empty();
        var candidateTemplate = $('#candidateTemplate');
        App.contracts["Contract"].deployed().then(async (instance) => {
            const candidates = await  instance.get_candidates();

            // retrive vote conditions and status
            const result_get_condition = await instance.get_condition();
            const {0: cond_quorum, 1: cond_envelopes_casted, 2: cond_envelopes_opened} = result_get_condition;
            $("#quorumId").html(cond_quorum.toString());
            $("#envelopCastedId").html(cond_envelopes_casted.toString());
            $("#envelopOpenedId").html(cond_envelopes_opened.toString());

            //
            var is_owner = await instance.is_owner({from: App.account});
            var is_candidate = false;
            if (is_owner) {
                $("#roleId").html("Owner");
                if (cond_envelopes_casted.toString() == cond_envelopes_opened.toString()) {
                    $(".btn-mayor-or-sayonara").removeClass('hide'); // show check result button
                }                
            } else {
                $(".btn-mayor-or-sayonara").addClass('hide');
                is_candidate = await instance.is_candidate({from: App.account});
                if (is_candidate) {
                    $("#roleId").html("Candidate " + candidates.indexOf(App.account));
                } else {
                    $("#roleId").html("Citizen");
                }
            }
            if (cond_quorum.toString() == cond_envelopes_casted.toString() && cond_envelopes_casted.toString() != cond_envelopes_opened.toString()) {
                $(".btn-open-envelop").removeClass('hide'); // show check result button
            }
            
            for (let i = 0; i < candidates.length; i++) {
                const result_get_candidate_soul = await instance.get_candidate_soul(candidates[i]);

                const candidate_name = 'Candidate ' + i;

                candidateTemplate.find('img').attr('src', 'https://avatars.dicebear.com/api/micah/' + candidates[i] + '.svg');
                candidateTemplate.find('.panel-title').text(candidate_name);
                candidateTemplate.find('.candidate-symbol').text(candidates[i]);
                candidateTemplate.find('.candidate-deposit').text(result_get_candidate_soul.toString(10));
                
                candidateTemplate.find('.btn-vote-modal').attr('data-address', candidates[i]);
                candidateTemplate.find('.btn-vote-modal').show().attr('data-name', candidate_name);

                if (is_candidate && candidates[i] == App.account) {
                    candidateTemplate.find('.btn-deposit-modal').show().attr('data-address', candidates[i]);
                    candidateTemplate.find('.btn-deposit-modal').show().attr('data-name', candidate_name);
                } else {
                    candidateTemplate.find('.btn-deposit-modal').hide();
                }
                
                candidatesRow.append(candidateTemplate.html());
                
            }
        });
    },
    depositClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.add_deposit.sendTransaction({from: App.account, value: $('#deposit-soul').val()})
            .then(function(receipt) {
                $('#depositModal').modal('hide');
            });
        });
    },
    voteClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const envelop = await instance.compute_envelope($('#voter-sigil').val(), $('#candidate-address').val(), $('#voter-soul').val());
            const result = await instance.cast_envelope.sendTransaction(envelop, { from: App.account })
            .then(function(receipt) {                
                $('#voteModal').modal('hide');
            });
        });
    } ,
    openEvelopeClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.open_envelope($('#openenvelop-sigil').val(), $('#openenvelop-symbol').val(), { from: App.account, value: $('#openenvelop-soul').val() })
            .then(function(receipt){
                $('#openEnvelopModal').modal('hide');
            });;
        });
    },
    mayorOrSayonaraClick: function() {        
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.mayor_or_sayonara({ from: App.account}); 
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
    var button = $(event.relatedTarget);
    var address = button.data('address');
    var name = button.data('name');
    var modal = $(this);
    modal.find('.modal-title').text('New deposit to "' + name + '" at address' + address);
});

$('#voteModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    var address = button.data('address');
    var name = button.data('name');
    var modal = $(this)
    modal.find('#candidate-address').val(address);
    modal.find('#vote-intro').text('Vote for "' + name + '" at address' + address);
});

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});