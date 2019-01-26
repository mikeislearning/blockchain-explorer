const assert = require('assert');
const ethers = require('ethers');
const ganache = require('ganache-cli');

const PUBLIC_KEY_ONE = '0x7357589f8e367c2C31F51242fB77B350A11830F3';
const PUBLIC_KEY_TWO = '0x39F9532E0db51A8c79e7e896B092Ac6C2d13979d';
const PRIVATE_KEY_ONE = '0x3141592653589793238462643383279502884197169399375105820974944592';
const PRIVATE_KEY_TWO = '0x4141592653589793238462643383279502884197169399375105820974944593';

// Use local ganache module:
const localProvider = new ethers.providers.Web3Provider(ganache.provider({
  accounts: [
    {
      balance: ethers.utils.parseEther('100'),
      secretKey: PRIVATE_KEY_ONE,
    },
    {
      balance: ethers.utils.parseEther('100'),
      secretKey: PRIVATE_KEY_TWO,
    }
  ],
  debug: true,
}));

// Use with global ganache-cli:
// const GANACHE_PATH = 'http://localhost:8545';
// const localProvider = new ethers.providers.JsonRpcProvider(GANACHE_PATH);

// Will contain the addresses associated with the blocks being queried
let ledger = {};
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
  const promises = [];
  for (const blockNumber of blocks) {
    promises.push(localProvider.getBlock(blockNumber));
  }

  const [ result ] = await Promise.all(promises);

  for (transaction of result.transactions) {
    const tx = await localProvider.getTransaction(transaction);
    await updateLedger(tx);
    totalEther += tx.value ? convertValueToEther(tx.value) : 0;
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

// creates a transaction on the ganache blockchain
const createTransaction = async (blockDetails) => {
  const transaction = {
    chainId: ethers.utils.getNetwork('homestead').chainId,
    data: "0x",
    gasLimit: 21000,
    gasPrice: ethers.utils.bigNumberify("20000000000"),
    nonce: blockDetails.transactions.length,
    // This ensures the transaction cannot be replayed on different networks
    value: ethers.utils.parseEther("0.2"),
    to: PUBLIC_KEY_TWO,
  };

  const wallet = new ethers.Wallet(PRIVATE_KEY_ONE);

  const signPromise = await wallet.sign(transaction);
  const sentTransaction = await localProvider.sendTransaction(signPromise);
  return sentTransaction;

}


describe('Functional tests', () => {
  let blockNumber;
  let blocks;
  before(async () => {
    const blockDetails = await localProvider.getBlock(blockNumber);
    await createTransaction(blockDetails);
    blockNumber = await localProvider.getBlockNumber();
    blocks = [blockNumber];
    await constructLedger(blocks);
  })
  describe('Ledger data', () => {
    it('should get correct data from the ledger', async () => {
      assert.equal(ledger[PUBLIC_KEY_ONE].sent, 0.2);
      assert.equal(ledger[PUBLIC_KEY_ONE].isContract, false);
      assert.equal(ledger[PUBLIC_KEY_TWO].received, 0.2);
      assert.equal(ledger[PUBLIC_KEY_TWO].isContract, false);

    });
  });
  describe('Report data', () => {
    it('should return correct report data', async () => {
      const result = await getDataFromLedger(blocks);
      assert.equal(result.contractPercentage, 0.00);
      assert.equal(result.events, 0);
      assert.equal(result.senders, 1);
      assert.equal(result.receivers, 1);
      assert.equal(result.totalEther, 0.2);
    });
  });
});
