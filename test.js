const assert = require('assert');
const ethers = require('ethers');
const delay = require('delay');

const GANACHE_PATH = 'http://localhost:8545';
const localProvider = new ethers.providers.JsonRpcProvider(GANACHE_PATH);
const PUBLIC_KEY_ONE = "0x7357589f8e367c2C31F51242fB77B350A11830F3";
const PUBLIC_KEY_TWO = "0x39F9532E0db51A8c79e7e896B092Ac6C2d13979d";
const PRIVATE_KEY_ONE = "0x3141592653589793238462643383279502884197169399375105820974944592";
const PRIVATE_KEY_TWO = "0x4141592653589793238462643383279502884197169399375105820974944593";

// Will contain the addresses associated with the blocks being queried
const ledger = {};
// Total amount of ether involved in transactions in the block range
let totalEther = 0;
// Total number of contracts created in the range
let contractsCreated = 0;

// converts a transaction value into Ether
const convertValueToEther = (value) => {
  const wei = ethers.utils.bigNumberify(value).toString();
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'));
}

// Updates the shared ledger with a single transaction
const updateLedger = async (transaction) => {
  if (convertValueToEther(transaction.value) === 0) {
    return null;
  }

  if (!ledger.hasOwnProperty(transaction.to)) {
    ledger[transaction.to] = { sent: 0, received: 0, isContract: false }
  }

  if (!ledger.hasOwnProperty(transaction.from)) {
    ledger[transaction.from] = { sent: 0, received: 0, isContract: false }
  }


  ledger[transaction.to].received += convertValueToEther(transaction.value);
  ledger[transaction.from].sent += convertValueToEther(transaction.value);

  const to = await localProvider.getCode(transaction.to);
  const from = await localProvider.getCode(transaction.from);

  if (to.toString().length > 42) {
    ledger[transaction.to].isContract = true;
  }
  if (from.toString().length > 42) {
    ledger[transaction.from].isContract = true;
  }
}

// Extracts data from an array of blocks provided
// The values it updates are variables shared throughout the file
const constructLedger = async (blocks) => {
  for (const blockNumber of blocks) {
    await localProvider.getBlock(blockNumber).then((block) => {
      block.transactions.forEach(async (tx) => {
        await localProvider.getTransaction(tx).then((transaction) => {
          updateLedger(transaction);
          totalEther += transaction.value ? convertValueToEther(transaction.value) : 0;
        });
        // await localProvider.getTransactionReceipt(tx).then((transaction) => {
          // if (transaction && transaction.contractAddress) {
            // contractsCreated++;
          // }
        // });
      });
    });
  }
}

// Renders data to the DOM
const getDataFromLedger = async (blocks) => {
  let senders = 0;
  let receivers = 0;
  let contractTransactions = 0;

  for (const address in ledger) {
    if (ledger[address].received > 0) {
      receivers++;
    }
    if (ledger[address].sent > 0) {
      senders++;
    }
    if(ledger[address].isContract) {
      contractTransactions++;
    }
  }

  const contractPercentage = ((contractTransactions / (senders + receivers)) * 100).toFixed(2);
  const start = blocks[blocks.length - 1];
  const end = blocks[0];
  const filter = {
    fromBlock: start,
    toBlock: end,
  }
  const events = await localProvider.getLogs(filter);

  return {
    contractPercentage,
    contractsCreated,
    events: events.length,
    receivers,
    senders,
    totalEther,
  };
}

// code copying it is
// break code down into individual functions I can test
// test the object

describe('Functional tests', function() {
  describe('Report data', function() {
    it('should calculate correct report data', async () => {
      const blockNumber = await localProvider.getBlockNumber();
      const blockDetails = await localProvider.getBlock(blockNumber);

      console.log('BLOCK DETAILS: ', blockDetails);

      const nonce = blockDetails.transactions.length;

      const transaction = {
        chainId: ethers.utils.getNetwork('homestead').chainId,
        data: "0x",
        gasLimit: 21000,
        gasPrice: ethers.utils.bigNumberify("20000000000"),
        nonce,
        // This ensures the transaction cannot be replayed on different networks
        value: ethers.utils.parseEther("0.2"),
        to: PUBLIC_KEY_TWO,
      };

      const wallet = new ethers.Wallet(PRIVATE_KEY_ONE);

      const signPromise = await wallet.sign(transaction);
      const sentTransaction = await localProvider.sendTransaction(signPromise);

      const blocks = [blockNumber];
      const data = await constructLedger(blocks);
      
      await delay(1500);

      const result = await getDataFromLedger(blocks);
      assert.equal(ledger[PUBLIC_KEY_ONE].sent, 0.2);
      assert.equal(ledger[PUBLIC_KEY_ONE].isContract, false);
      assert.equal(ledger[PUBLIC_KEY_TWO].received, 0.2);
      assert.equal(ledger[PUBLIC_KEY_TWO].isContract, false);


    });
  });
  describe('Balances', function() {
    it('should return correct balances for both public keys', async () => {
      // const balanceOne = await localProvider.getBalance(PUBLIC_KEY_ONE);
      // const balanceTwo = await localProvider.getBalance(PUBLIC_KEY_TWO);

      // assert.equal(convertValueToEther(balanceOne), 99.79958);
      // assert.equal(convertValueToEther(balanceTwo), 100.2);

    });
  });
});
