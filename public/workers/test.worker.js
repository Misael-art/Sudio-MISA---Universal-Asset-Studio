// Worker de teste simples
self.onmessage = function(e) {
    console.log('Worker de teste recebeu mensagem:', e.data);
    
    self.postMessage({
        status: 'success',
        message: 'Worker de teste funcionando corretamente'
    });
};

console.log('Worker de teste inicializado');