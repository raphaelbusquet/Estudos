// O setTimeout vai rodar uma função depois de x milissegundos.
const timeOut = 3000
const finished = () => {
    console.log('Fim!')  
}

setTimeout(finished, timeOut)