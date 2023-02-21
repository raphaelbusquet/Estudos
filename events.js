const {EventEmitter} = require('events');
const ev = new EventEmitter();

ev.on('saySomething', (message) => { //Também pode ser usado com o Once, mas este só lerá o primeiro emit. 
    console.log('Eu ouvi você ' + message)})

ev.emit('saySomething', 'João');
ev.emit('saySomething', 'Carla');

