const apiKey = "310b0bb0eed34e52a0533fc945ef7d01";
const ethersProvider = new ethers.providers.InfuraProvider('homestead', apiKey);

const convertValueToEther = (value) => {
  const wei = ethers.utils.bigNumberify(value).toString();
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'));
}

const transactions = {};

const addTransaction = (transaction) => {
  if (convertValueToEther(transaction.value) === 0) {
    return null;
  }
  if (!transaction.from && !transaction.to) {
    return null
  }
  if (!transactions.hasOwnProperty(transaction.to)) {
    transactions[transaction.to] = { sent: 0, received: 0, isContract: false }
  }

  if (!transactions.hasOwnProperty(transaction.from)) {
    transactions[transaction.from] = { sent: 0, received: 0, isContract: false }
  }

  if (!transaction.to) {
    transactions[transaction.from].isContract = true;
  }

  transactions[transaction.to].received += convertValueToEther(transaction.value);
  transactions[transaction.from].sent += convertValueToEther(transaction.value);
}

// calculate total amount of ether - done
// assemble an object containg addresses, their from, kjjj
let totalEther = 0;
// List blocks in table
ethersProvider.getBlockNumber().then(async (blockNumber) => {
  for(let i = 0; i < 30; i++) {
    const details = await ethersProvider.getBlock(blockNumber - i).then((block) => {
      block.transactions.forEach((tx) => {
        ethersProvider.getTransaction(tx).then((transaction) => {
          addTransaction(transaction);
          totalEther += transaction.value ? convertValueToEther(transaction.value) : 0;
        });
      });
    });
  }

  for (let tx in transactions) {
    $('#total').text(totalEther);
    $('tbody').append("<tr><td>" + tx + "</td><td>" + transactions[tx].received + "</td><td>" + transactions[tx].sent + "</td><td>" + transactions[tx].isContract + "</tr>");
  }

});
