/*
 Libraries
 */
var chalk = require('chalk');
var figlet = require('figlet');
var inquirer = require('inquirer');
var Web3 = require('web3');

/*
 Variables
 */
var ethereumProvider;
var accountPassword;
var web3;
var contractAddress;
var abi;
var eventFunctionName;
var contract;
var event;
var parametersProvided = false;


module.exports = {

    startCli: () => {
        console.log("You did not provide the arguments (ethereumProvider, password, contractAddress, contractAbi, eventName).");
        initEthereum();
    },
    processArguments: (provider, password, contractAdd, contractAbi, eventName) => {
        console.log('Everything provided as arguments');
        accountPassword = password;
        ethereumProvider = provider;
        contractAddress = "0x" + contractAdd;
        abi = JSON.parse(contractAbi);
        eventFunctionName = eventName;
        parametersProvided = true;
        initEthereum();
    },
    printHeadline: function () {
        console.log(
            chalk.blue(
                figlet.textSync('Ethereum listener', {horizontalLayout: 'full'})
            )
        );
    }

};

function initEthereum() {
    if (!parametersProvided) {
        getEthereumProviderFromCli(getWeb3);
    } else {
        getWeb3();
    }
}

function getWeb3() {
    if (!parametersProvided) {
        accountPassword = arguments[0].password;
        ethereumProvider = arguments[0].ethereumProvider;
    }

    web3 = new Web3(new Web3.providers.HttpProvider(ethereumProvider));
    web3.eth.getBlock('latest', (error, result) => {
        if (!error) {
            web3.eth.defaultAccount = web3.eth.accounts[0];
            // check if password is ok by unlocking the account
            unlockDefaultAccount();
        }
        else {
            console.error(chalk.red("Wrong ethereum client address!"));
            if (!parametersProvided) {
                initEthereum();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    });
}

function unlockDefaultAccount() {
    web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 999, ((error, result) => {
        if (!error) {
            initContract();
        }
        else {
            console.error(chalk.red("Wrong ethereum password!"));
            if (!parametersProvided) {
                initEthereum();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    }));
}

/********************************************************************
 2. Ask for the contract address, abi and for the name of the event that we want to subscribe to
 *******************************************************************/
function initContract() {
    if (!parametersProvided) {
        getContractArgumentsFromCli(getContract);
    } else {
        getContract();
    }

}

function getContract() {
    if (!parametersProvided) {
        try {
            contractAddress = arguments[0].contractAddress;
            abi = JSON.parse(arguments[0].contractAbi);
            eventFunctionName = arguments[0].eventName;
            web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 9999, eventListener);
        } catch (err) {
            console.error(chalk.red("Couldn't process the arguments. Please check contract address, abi and event name!"));
            if (!parametersProvided) {
                initContract();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    } else {
        web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 9999, eventListener);
    }
}

/********************************************************************
 3. Listen to the event of the contract
 *******************************************************************/
function eventListener(error, result) {
    if (!error) {
        contract = web3.eth.contract(abi).at(contractAddress);
        // console.log(contract);
        try {
            event = contract[eventFunctionName]();
            console.log(event);
            event.watch((error, eventResult) => {
                // This is the actual event listener
                if (error) {
                    console.error("event error:");
                    console.error(error);
                } else {
                    console.log(eventResult);
                }
            });
        }
        catch (err) {
            console.error(chalk.red("Couldn't process the arguments. Please check contract address, abi and event name!"));
            if (!parametersProvided) {
                initContract();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    }
    else {
        console.error(error);
    }
}


/**********************************************************************
 * CLI functions
 **********************************************************************/

function getEthereumProviderFromCli(callback) {
    var questions = [
        {
            name: 'ethereumProvider',
            type: 'input',
            message: 'Enter your ethereum client address:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your username or e-mail address';
                }
            }
        },
        {
            name: 'password',
            type: 'password',
            message: 'Enter your ethereum user password:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your password';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}


function getContractArgumentsFromCli(callback) {
    var questions = [
        {
            name: 'contractAddress',
            type: 'input',
            message: 'Enter the address of the contract that you want to listen to:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter the address of the contract that you want to listen to';
                }
            }
        },
        {
            name: 'contractAbi',
            type: 'editor',
            message: 'Enter the ABI of the contract that you want to listen to:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter the ABI of the contract that you want to listen to:';
                }
            }
        },
        {
            name: 'eventName',
            type: 'input',
            message: 'Enter the name of the event that you want to subscribe to:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter the ABI of the contract that you want to listen to:';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}