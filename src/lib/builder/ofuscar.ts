import JavaScriptObfuscator from "javascript-obfuscator";

/**
 * Embaralha o "porteiro" do bot (index.js) e o selo, com uma semente nova a cada download:
 * cada cliente recebe um código diferente e ilegível. Se o pacote faltar, vai sem embaralhar.
 */
export function ofuscarPorteiro(codigo: string, leve = false): string {
  try {
    return JavaScriptObfuscator.obfuscate(codigo, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: leve ? 0.5 : 1,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: leve ? 0.3 : 0.5,
      identifierNamesGenerator: "hexadecimal",
      numbersToExpressions: true,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 5,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ["rc4"],
      stringArrayThreshold: 1,
      stringArrayWrappersCount: 3,
      stringArrayWrappersType: "function",
      stringArrayWrappersChainedCalls: true,
      transformObjectKeys: true,
      target: "node",
      sourceType: "module",
      seed: Math.floor(Math.random() * 2 ** 31),
    }).getObfuscatedCode();
  } catch (e) {
    console.error("[loja] não consegui embaralhar o porteiro do bot", e);
    return codigo;
  }
}
