const assert = require('assert');
const ethers = require('ethers');

const ganachePath = 'http://localhost:8545';
const localProvider = new ethers.providers.JsonRpcProvider(ganachePath);

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

  const to = await ethersProvider.getCode(transaction.to);
  const from = await ethersProvider.getCode(transaction.from);

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
    await ethersProvider.getBlock(blockNumber).then((block) => {
      block.transactions.forEach((tx) => {
        ethersProvider.getTransaction(tx).then((transaction) => {
          updateLedger(transaction);
          totalEther += transaction.value ? convertValueToEther(transaction.value) : 0;
        });
        ethersProvider.getTransactionReceipt(tx).then((transaction) => {
          if (transaction && transaction.contractAddress) {
            contractsCreated++;
          }
        });
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
  const events = await ethersProvider.getLogs(filter);

  return {
    contractPercentage,
    contractsCreated,
    events: events.length,
    receivers,
    senders,
    totalEther,
  };
}

// console.log(localProvider);

// code copying it is
// break code down into individual functions I can test
// test the object

describe('Functional tests', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', async () => {
      const blockNumber = await localProvider.getBlockNumber();
      const blocks = [blockNumber];
      console.log('hiiii', blocks);
      assert.equal([1,2,3].indexOf(4), -1);
    });
  });
});
