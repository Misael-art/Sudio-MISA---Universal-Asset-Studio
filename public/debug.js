// Arquivo de debug simples para testar sintaxe JavaScript
console.log('Debug script carregado');

// Teste de função simples
function testFunction() {
    console.log('Função de teste executada');
    return true;
}

// Teste de arrow function
const testArrow = () => {
    console.log('Arrow function executada');
};

// Teste de objeto
const testObject = {
    name: 'test',
    value: 42,
    method: function() {
        console.log('Método do objeto executado');
    }
};

// Executar testes
testFunction();
testArrow();
testObject.method();

console.log('Todos os testes de sintaxe passaram');