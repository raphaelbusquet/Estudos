// clearInterval irá parar a execução do intervalo.

let timeOut = 1000;
const checking = () => {
    console.log('checking...');
    }

let interval = setInterval(checking, timeOut);
clearInterval(interval)