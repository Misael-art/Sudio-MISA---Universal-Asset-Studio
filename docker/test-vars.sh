#!/bin/bash
echo "=== Teste de Variáveis ==="
echo "Definindo variável TEST_VAR..."
TEST_VAR="hello world"
echo "Valor de TEST_VAR: '$TEST_VAR'"
if [ -n "$TEST_VAR" ]; then
    echo "SUCESSO: Variável definida corretamente"
else
    echo "ERRO: Variável vazia"
fi

echo "Definindo SOURCE_FILES..."
SOURCE_FILES="file1.c file2.c file3.c"
echo "Valor de SOURCE_FILES: '$SOURCE_FILES'"
if [ -n "$SOURCE_FILES" ]; then
    echo "SUCESSO: SOURCE_FILES definida corretamente"
else
    echo "ERRO: SOURCE_FILES vazia"
fi