const apiKey = "310b0bb0eed34e52a0533fc945ef7d01";
const ethersProvider = new ethers.providers.InfuraProvider('homestead', apiKey);

// Will contain the addresses associated with the blocks being queried
const ledger = {};
// Total amount of ether involved in transactions in the block range
let totalEther = 0;
let contractsCreated = 0;

const convertValueToEther = (value) => {
  const wei = ethers.utils.bigNumberify(value).toString();
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'));
}

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

const parseBlocks = async (blocks) => {
  $('#range').text('Loading...');
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

const populateData = async (blocks) => {
  let senders = 0;
  let receivers = 0;
  let contractTransactions = 0;

  for (const address in ledger) {
    $('tbody').append("<tr><td>" + address + "</td><td>" + ledger[address].received + "</td><td>" + ledger[address].sent + "</td><td>" + ledger[address].isContract + "</tr>");

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
  $('#total').text(totalEther);
  $('#senders').text(senders);
  $('#receivers').text(receivers);
  $('#contractPercent').text(`${contractPercentage}%`);
  $('#contractsCreated').text(contractsCreated);

  const start = blocks[blocks.length - 1];
  const end = blocks[0];
  $('#range').text(`Showing data from blocks #${start} to #${end}`);

  const filter = {
    fromBlock: start,
    toBlock: end,
  }
  const events = await ethersProvider.getLogs(filter);
  $('#events').text(events.length);

}

// Queries blocks based on a range starting from the most recent
const handleBlockQuery = async (e) => {
  e.preventDefault();

  const blocksBack = parseInt(document.getElementById('numBlocks').value);
  const blockNumber = await ethersProvider.getBlockNumber();
  const blocks = [];
  for (let i = 0; i < (blocksBack + 1); i++) {
    blocks.push(blockNumber - i);
  }

  await parseBlocks(blocks);
  populateData(blocks);
}

// Queries blocks based on a range starting from the most recent
const handleRangeQuery = async (e) => {
  e.preventDefault();

  const start = parseInt(document.getElementById('start').value);
  const end = parseInt(document.getElementById('end').value);

  const blocks = [];
  const range = end - start + 1;
  for (let i = 0; i < range; i++) {
    blocks.push(start + i);
  }
  blocks.reverse();

  await parseBlocks(blocks);
  populateData(blocks);
}


const form = document.getElementById('blockQuery')
form.addEventListener('submit', handleBlockQuery, false);

const otherForm = document.getElementById('rangeQuery')
otherForm.addEventListener('submit', handleRangeQuery, false);
