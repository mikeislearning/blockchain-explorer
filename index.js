const apiKey = "310b0bb0eed34e52a0533fc945ef7d01";
const ethersProvider = new ethers.providers.InfuraProvider('homestead', apiKey);

const transactions = {};
let totalEther = 0;

const convertValueToEther = (value) => {
  const wei = ethers.utils.bigNumberify(value).toString();
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'));
}


const addTransaction = async (transaction) => {
  if (convertValueToEther(transaction.value) === 0) {
    return null;
  }

  if (!transactions.hasOwnProperty(transaction.to)) {
    transactions[transaction.to] = { sent: 0, received: 0, isContract: false }
  }

  if (!transactions.hasOwnProperty(transaction.from)) {
    transactions[transaction.from] = { sent: 0, received: 0, isContract: false }
  }


  transactions[transaction.to].received += convertValueToEther(transaction.value);
  transactions[transaction.from].sent += convertValueToEther(transaction.value);

  const to = await ethersProvider.getCode(transaction.to);
  const from = await ethersProvider.getCode(transaction.from);

  if (to.toString().length > 42) {
    transactions[transaction.to].isContract = true;
  }
  if (from.toString().length > 42) {
    transactions[transaction.from].isContract = true;
  }
}

const getTableData = async (blocks) => {
  for (const blockNumber of blocks) {
    await ethersProvider.getBlock(blockNumber).then((block) => {
      block.transactions.forEach(async (tx) => {
        await ethersProvider.getTransaction(tx).then((transaction) => {
          addTransaction(transaction);
          totalEther += transaction.value ? convertValueToEther(transaction.value) : 0;
        });
      });
    });
  }
  console.log('asdf', blocks);
  const start = blocks[blocks.length - 1];
  const end = blocks[0];
  console.log('done!', start, end);
  $('#range').text(`Showing data from blocks #${start} to #${end}`);

  const filter = {
    fromBlock: start,
    toBlock: end,
  }
  const events = await ethersProvider.getLogs(filter);
  console.log('hiiiii', events);
  $('#events').text(events.length);
}

const populateData = () => {
  console.log('populate!');
  let senders = 0;
  let receivers = 0;
  let contractTransactions = 0;

  for (const tx in transactions) {
    $('tbody').append("<tr><td>" + tx + "</td><td>" + transactions[tx].received + "</td><td>" + transactions[tx].sent + "</td><td>" + transactions[tx].isContract + "</tr>");

    if (transactions[tx].received > 0) {
      receivers++;
    }
    if (transactions[tx].sent > 0) {
      senders++;
    }
    if(transactions[tx].isContract) {
      contractTransactions++;
    }
  }

  console.log('senders --->', senders)
  console.log('receivers --->', receivers)
  // console.log('onctrac --->', contractTransactions);
  const contractPercentage = ((contractTransactions / (senders + receivers)) * 100).toFixed(2);
  console.log('mmooo', contractPercentage);
  $('#total').text(totalEther);
  $('#senders').text(senders);
  $('#receivers').text(receivers);
  $('#contractPercent').text(`${contractPercentage}%`);


}
// calculate total amount of ether - done
// assemble an object containg addresses, their from, kjjj
// List blocks in table
const handleBlockSearch = async (e) => {
  e.preventDefault();

  const blocksBack = parseInt(document.getElementById('numBlocks').value);
  const blockNumber = await ethersProvider.getBlockNumber();
  const values = [];
  for (let i = 0; i < (blocksBack + 1); i++) {
    values.push(blockNumber - i);
  }

  await getTableData(values);
  populateData();
}


const handleRangeSearch = async (e) => {
  e.preventDefault();

  const start = parseInt(document.getElementById('start').value);
  const end = parseInt(document.getElementById('end').value);

  const values = [];
  const range = end - start + 1;
  for (let i = 0; i < range; i++) {
    values.push(start + i);
  }

  await getTableData(values);
  populateData();

}


const form = document.getElementById('blockSearch')
form.addEventListener('submit', handleBlockSearch, false);

const otherForm = document.getElementById('rangeSearch')
otherForm.addEventListener('submit', handleRangeSearch, false);
