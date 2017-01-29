# Ethereum contract event listener
[![Build Status](http://ec2-54-194-144-141.eu-west-1.compute.amazonaws.com/api/badges/cp2017/monitoring-event-listener/status.svg)](http://ec2-54-194-144-141.eu-west-1.compute.amazonaws.com/cp2017/monitoring-event-listener)
This NPM module can subscribe to events that are fired by contracts in the Ethereum blockchain. At this
time the module can only be used as a CLI tool.

## Installation
At the moment there are two possibilities to run the CLI tool.

https://www.npmjs.com/package/ethereum-listener

### 1. Run the script locally
First download the project from Github and navigate to the project directory. 
Then simply run:

`$ node index.js`

### 2. Install as global NPM package
Install the CLI tool as a global NPM packe by running:

`$ npm install ethereum-listener -g`

Now you can easily start the script by typing:

`$ ethereum-listener`

## Getting started
### 1. Start ethereum client
To talk to an ethereum node from inside the Ethereum Listener we use the web3.js library, which gives an convenient
interface for the RPC methods. In order to make it work, you need to follow the following instructions.

Start your client with the --rpc flag. Because we are accessing the RPC interface from the Ethereum Listener, 
CORS will need to be enabled like:
`geth --rpc --rpcapi db,eth,net,web3,personal,shh --shh --rpccorsdomain "http://localhost:4200"`

If you don't want to use the default port (8545), you can change the default HTTP-RPC port with:
`geth --rpc --rpcapi db,eth,net,web3,personal,shh --shh --rpccorsdomain "http://localhost:4200" --rpcport <portnumber>`

### 2. Use the script
#### 2.a Provide parameters
Here is an example how you can provide the information as arguments when starting the script:

`$ ethereum-listener  --ethereumProvider="http://localhost:8545" --password="pw0" --contractAddress="7596bcd41d32d170c572349c47d6c3f78004dbd6" --eventName="newMonitorRecord" --contractAbi=contract-abi`

Be aware that the `--contractAbi` parameter needs to get the address to a file in your file system (which contains the abi) instead of the ABI itself. 

#### 2.a Use interactive CLI
The usage of this script is self explaining. Start the script by `$ ethereum-listener`. It will ask you for the address of your ethereum client and the
password for the first user (the one at eth.accounts[0]). Then it asks for the contract address as well as
for the contract abi. The last thing you need to provide is the name of the event that you want to subscribe to.

```
  _____   _     _                                                  _   _         _                                
 | ____| | |_  | |__     ___   _ __    ___   _   _   _ __ ___     | | (_)  ___  | |_    ___   _ __     ___   _ __ 
 |  _|   | __| | '_ \   / _ \ | '__|  / _ \ | | | | | '_ ` _ \    | | | | / __| | __|  / _ \ | '_ \   / _ \ | '__|
 | |___  | |_  | | | | |  __/ | |    |  __/ | |_| | | | | | | |   | | | | \__ \ | |_  |  __/ | | | | |  __/ | |   
 |_____|  \__| |_| |_|  \___| |_|     \___|  \__,_| |_| |_| |_|   |_| |_| |___/  \__|  \___| |_| |_|  \___| |_|   
                                                                                                                                                                                                                       
? Enter your ethereum client address: http://localhost:8545
? Enter your ethereum user password: ***
? Enter the address of the contract that you want to listen to: 0x593d12e2676e50b0254346f1bac6ff1257323706
? Enter the ABI of the contract that you want to listen to: Received
? Enter the name of the event that you want to subscribe to: newMonitorRecord
```