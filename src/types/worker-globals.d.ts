// Tipos globais para workers

declare const self: DedicatedWorkerGlobalScope;
declare function importScripts(...urls: string[]): void;

// Extensão do escopo global do worker
interface DedicatedWorkerGlobalScope {
  EJS?: any;
  EJS_pathtodata?: string;
}