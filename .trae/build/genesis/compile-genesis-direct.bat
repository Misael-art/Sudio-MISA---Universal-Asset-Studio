@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Modelo de link do core Genesis Plus GX (EmulatorJS) via Docker (container genesis-build)
REM Requisitos:
REM  - Container 'genesis-build' com Emscripten instalado (emcc/emar)
REM  - Objetos ou fontes do core já preparados
REM  - Executar a partir da raiz do repositório

set "CONTAINER_NAME=%CONTAINER_NAME%"
if "%CONTAINER_NAME%"=="" set "CONTAINER_NAME=genesis-build"
set "WORKDIR=/work"
for /f "delims=" %%a in ('cd') do set "ROOT_DIR=%%a"
set "OUT_DIR=%OUT_DIR%"
if "%OUT_DIR%"=="" set "OUT_DIR=public/emulatorjs-data/cores"
set "EXPORTS_FILE=.trae/build/genesis/ejs_exports.c"
set "OUT_JS=%OUT_JS%"
if "%OUT_JS%"=="" set "OUT_JS=genesis_plus_gx.js"

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

set "EXPORTED_FUNCS=['_malloc','_free','_get_frame_buffer_ref','_get_vram_ptr','_get_cram_ptr','_get_vsram_ptr','_get_vdp_regs_ptr','_get_sat_ptr']"
set "EXPORTED_RUNTIME=['cwrap']"
set "INITIAL_MEMORY=%INITIAL_MEMORY%"
if "%INITIAL_MEMORY%"=="" set INITIAL_MEMORY=67108864
set "MAXIMUM_MEMORY=%MAXIMUM_MEMORY%"
if "%MAXIMUM_MEMORY%"=="" set MAXIMUM_MEMORY=134217728
set "ENVIRONMENT=%ENVIRONMENT%"
if "%ENVIRONMENT%"=="" set ENVIRONMENT=web

if not "%CORE_OBJS_DIR%"=="" if exist "%CORE_OBJS_DIR%" (
  docker run --rm -v "%ROOT_DIR%":"%WORKDIR%" -w "%WORKDIR%" "%CONTAINER_NAME%" ^
    emcc "%CORE_OBJS_DIR%"/*.o "%EXPORTS_FILE%" ^
    -O3 ^
    -s EXPORTED_FUNCTIONS="%EXPORTED_FUNCS%" ^
    -s EXPORTED_RUNTIME_METHODS="%EXPORTED_RUNTIME%" ^
    -s ENVIRONMENT="%ENVIRONMENT%" ^
    -s ALLOW_MEMORY_GROWTH=1 ^
    -s INITIAL_MEMORY=%INITIAL_MEMORY% ^
    -s MAXIMUM_MEMORY=%MAXIMUM_MEMORY% ^
    -o "%OUT_DIR%/%OUT_JS%"
) else if not "%SOURCES_RSP%"=="" if exist "%SOURCES_RSP%" (
  docker run --rm -v "%ROOT_DIR%":"%WORKDIR%" -w "%WORKDIR%" "%CONTAINER_NAME%" ^
    bash -lc "emcc -O3 $(tr '\n' ' ' < '%SOURCES_RSP%') '%EXPORTS_FILE%' ^
      -s EXPORTED_FUNCTIONS='%EXPORTED_FUNCS%' ^
      -s EXPORTED_RUNTIME_METHODS='%EXPORTED_RUNTIME%' ^
      -s ENVIRONMENT='%ENVIRONMENT%' ^
      -s ALLOW_MEMORY_GROWTH=1 ^
      -s INITIAL_MEMORY='%INITIAL_MEMORY%' ^
      -s MAXIMUM_MEMORY='%MAXIMUM_MEMORY%' ^
      -o '%OUT_DIR%/%OUT_JS%'"
) else (
  echo [ERRO] Defina CORE_OBJS_DIR (com .o do core) ou SOURCES_RSP (lista de fontes).
  exit /b 1
)

echo.
echo [OK] Core linkado em %OUT_DIR%/%OUT_JS%
endlocal