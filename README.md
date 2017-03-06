# Ethereum contract event listener
[![Build Status](http://ec2-54-194-144-141.eu-west-1.compute.amazonaws.com/api/badges/cp2017/monitoring-event-listener/status.svg)](http://ec2-54-194-144-141.eu-west-1.compute.amazonaws.com/cp2017/monitoring-event-listener)
This little node script is part of the Cloud Prototyping Project at TU Berlin (ISE). It represents a monitor that
randomly gets jobs from the Monitoring-Contract of the service marketplace. As soon as the monitor receives a job it
starts monitoring the availability of a provided endpoint URL. After a certain time period has passed, the script
writes back the result as percentage of of availability over the time period.

The project is based on this generic ethereum event listener: 
https://www.npmjs.com/package/ethereum-listener

## Installation
At the moment there are two possibilities to run the CLI tool.

https://www.npmjs.com/package/cp2017-service-monitor

### 1. Run the script locally
First download the project from Github and navigate to the project directory. 
Then simply run:

`$ node index.js`

### 2. Install as global NPM package
Install the CLI tool as a global NPM packe by running:

`$ npm install cp2017-service-monitor -g`

Now you can easily start the script by typing:

`$ cp2017-service-monitor`

## Getting started
### 1. Start ethereum client
To talk to an ethereum node from inside this monitoring script we use the web3.js library, which gives an convenient
interface for the RPC methods. In order to make it work, you need to follow the following instructions.

Start your ethereum client with the --rpc flag. Because we are accessing the RPC interface from the monitoring-script, 
CORS will need to be enabled like:
`geth --rpc --rpcapi db,eth,net,web3,personal,shh --shh --rpccorsdomain "http://localhost:4200"`

If you don't want to use the default port (8545), you can change the default HTTP-RPC port with:
`geth --rpc --rpcapi db,eth,net,web3,personal,shh --shh --rpccorsdomain "http://localhost:4200" --rpcport <portnumber>`

### 2. Use the script
#### 2.a Provide parameters
Here is an example how you can provide the information as arguments when starting the script:

`$ cp2017-service-monitor --ethereumProvider="http://localhost:8545" --password="pw0" --contractAddress="7596bcd41d32d170c572349c47d6c3f78004dbd6" --contractAbi=contract-abi`

Be aware that the `--contractAbi` parameter needs to get the address to a file in your file system (which contains the abi) instead of the ABI itself. 
Also make sure that you remove the prefix 0x of the contract address. 

#### 2.a Use interactive CLI
If you don't provide the parameters when starting the monitor, it will start an interactive CLI where you can pass all
the parameters one after another. Start the script by `$ cp2017-service-monitor`. It will ask you for the address
of your ethereum client and the password for the first user (the one at eth.accounts[0]). Then it asks for the contract
address as well as for the contract abi.

Here is an example how to use the script with the CLI interface:

```
  ____                          _                   __  __                   _   _
 / ___|    ___   _ __  __   __ (_)   ___    ___    |  \/  |   ___    _ __   (_) | |_    ___    _ __
 \___ \   / _ \ | '__| \ \ / / | |  / __|  / _ \   | |\/| |  / _ \  | '_ \  | | | __|  / _ \  | '__|
  ___) | |  __/ | |     \ V /  | | | (__  |  __/   | |  | | | (_) | | | | | | | | |_  | (_) | | |
 |____/   \___| |_|      \_/   |_|  \___|  \___|   |_|  |_|  \___/  |_| |_| |_|  \__|  \___/  |_|

You did not provide the arguments (ethereumProvider, password, contractAddress, contractAbi).
? Enter your ethereum client address: http://localhost:8545
? Enter your ethereum user password: ***
? Enter the address of the contract that you want to listen to: 0xd6e3763357a75e106f84a8125c91f53aeced28e2
? Enter the ABI of the contract that you want to listen to: Received
Subscribing to newMonitorRecord
Subscribing to jobMonitorEvent
New monitoring jobs available
Asking the contract for a job: Get monitor request called
Transaction hash: 0x11b6f4270584fa0120b891d5dafdc6de37111ede21b9b1b534940c40c2a9a186
New job recieved. Index: 9
Start monitoring: http://localhost:3000/api/monitor
```