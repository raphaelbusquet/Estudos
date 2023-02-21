// O clearTimeout vai cancelar um timeOut.
const timeOut = 3000
const finished = () => {
    console.log('Fim!')  
}

let timer =  setTimeout(finished, timeOut)
clearTimeout(timer)