export async function pyodideInit() {
  window.pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");

  // Add tokenizer.json file to Pyodide filesystem:
  let tokenizerJsonText = await fetch("./rwkv/tokenizer.json").then(r => r.text())
  pyodide.FS.writeFile("/tokenizer.json", tokenizerJsonText, { encoding: "utf8" });

  // Install tokenizer:
  console.log(await pyodide.runPythonAsync(`
  import sys
  print(sys.version)
  import os
  os.environ["TOKENIZERS_PARALLELISM"] = "0" # This is needed because threading doesn't work in Pyodide yet: https://github.com/pyodide/pyodide/issues/2816#issue-1290719241
  import micropip
  await micropip.install('./rwkv/tokenizers_python-0.11.0-cp310-cp310-emscripten_3_1_14_wasm32.whl')
  from tokenizers import Tokenizer
  tokenizer = Tokenizer.from_file("/tokenizer.json")
  `));
}

export function textToTokens(text) {
  pyodide.globals.set("input_text", text);
  pyodide.runPython(`
  encoded = tokenizer.encode(input_text)
  ids = encoded.ids
  tokens = encoded.tokens
  `);
  // pyodide.globals.get('tokens').toJs()
  return pyodide.globals.get('ids').toJs();
}

export function tokensToText(tokens) {
  pyodide.globals.set("input_tokens", tokens.join(","));
  pyodide.runPython(`
  input_tokens = [int(x) for x in input_tokens.split(',')]
  decoded = tokenizer.decode(input_tokens)
  `);
  return pyodide.globals.get('decoded');
}

export function padLeftWithZeros(arr, size) {
  arr = arr.slice(0);
  
  while (arr.length < size) {
    arr.unshift(0);
  }
  
  return arr;
}

export async function createOrtSession(onnxModelBlob, isOrtFile, backend, n_layer, n_embd) {
  ort.env.wasm.proxy = true; // <-- When using wasm, proxy inference via a web worker so it doesn't freeze the main/rendering thread.
  
  if(self.crossOriginIsolated) { // needs to be cross-origin-isolated to use wasm threads. you need to serve this html file with these two headers: https://web.dev/coop-coep/
    ort.env.wasm.numThreads = navigator.hardwareConcurrency / 2;
  }
  
  ort.logLevel = "verbose";
  ort.logLevelInternal = "verbose";

  let sessionOptions = {
    executionProviders: [ backend ],
    graphOptimizationLevel: 'all',
  };
  
  if (isOrtFile) {
    // See here for details: github.com/microsoft/onnxruntime/issues/13445#issuecomment-1430153341
    sessionOptions = {
      executionProviders: [ backend ],
      enableMemPattern: false,
      enableCpuMemArena: false,
      extra: {
        session: {
          disable_prepacking: "1",
          use_device_allocator_for_initializers: "0",
          use_ort_model_bytes_directly: "1",
          use_ort_model_bytes_for_initializers: "1",
        },
      },
    };
  }

  let onnxModelBlobUrl = URL.createObjectURL(onnxModelBlob);
  const session = await ort.InferenceSession.create(onnxModelBlobUrl, sessionOptions);
  URL.revokeObjectURL(onnxModelBlobUrl);

  async function predictText(promptText, numTokensToGenerate=32, streamingCallback=null, abortSignal=undefined, samplingMethod='multinomial', temperature=1.0, topP=0.8, repetitivePenality = 0, show_other_tokens = false) {
    let startTime = Date.now();

    const xx_att_d = new Float32Array(n_layer*n_embd);
    const aa_att_d = new Float32Array(n_layer*n_embd);
    const bb_att_d = new Float32Array(n_layer*n_embd);
    const pp_att_d = new Float32Array(n_layer*n_embd);
    const xx_ffn_d = new Float32Array(n_layer*n_embd);

    pp_att_d.fill(-1e30);

    const xx_att = new ort.Tensor('float32', xx_att_d, [n_layer, n_embd]);
    const aa_att = new ort.Tensor('float32', aa_att_d, [n_layer, n_embd]);
    const bb_att = new ort.Tensor('float32', bb_att_d, [n_layer, n_embd]);
    const pp_att = new ort.Tensor('float32', pp_att_d, [n_layer, n_embd]);
    const xx_ffn = new ort.Tensor('float32', xx_ffn_d, [n_layer, n_embd]);

    // prepare feeds. use model input names as keys.
    let feeds = { idx: null, xx_att: xx_att, aa_att: aa_att, bb_att: bb_att, pp_att: pp_att, xx_ffn: xx_ffn };

    let promptTokens = textToTokens(promptText);
    // console.log('[predictText] promptText:', promptText);
    // console.log('[predictText] promptTokens:', promptTokens);
    const origPromptTokensLength = promptTokens.length;
    const ctx = [ promptTokens.shift() ];
    // console.log('[predictText] initial ctx:', ctx);
    if (streamingCallback) streamingCallback({ token: ctx[0], status: 'Reading prompt', i: 1, outOf: origPromptTokensLength});

    const multinomialSampling = samplingMethod === 'multinomial';

    // if (multinomialSampling) {
    //   console.log('[predictText] multinomial sampling, temperature:', temperature, 'topP:', topP, 'repetitivePenality:', repetitivePenality);
    // } else {
    //   console.log('[predictText] greedy sampling, repetitivePenality:', repetitivePenality);
    // }

    // feed inputs and run
    for (var i = 0; i < numTokensToGenerate; i++) {
      if(abortSignal && abortSignal.cancelled) {
        // console.log(`[predictText] Aborted at step ${i}`);
        break;
      }
      let idx_d = Int32Array.from( padLeftWithZeros(ctx, 1024) );
      // console.log(`[predictText] Step ${i}, idx_d:`, idx_d);
      let idx = new ort.Tensor('int32', idx_d, [1024]);
      // console.log(`[predictText] Step ${i}, ctx:`, ctx);

      feeds.idx = idx;

      let results = await session.run(feeds);
      // console.log(`[predictText] Step ${i}, session.run results:`, results);
      if(abortSignal && abortSignal.cancelled) {
        // console.log(`[predictText] Aborted after session.run at step ${i}`);
        break;
      }

      let token;
      if (promptTokens.length == 0) {
        let other_tokens;
        if (multinomialSampling) {
          const data = Object.values(results.x.data);
          // console.log(`[predictText] Step ${i}, logits:`, data);
          if (streamingCallback && show_other_tokens) {
            const logitsWithPenalty = applyRepetitionPenalty(data, ctx, repetitivePenality);
            // console.log(`[predictText] Step ${i}, logits after repetition penalty:`, logitsWithPenalty);
            const probs = getMultinomialProbs(logitsWithPenalty, temperature, topP);
            // console.log(`[predictText] Step ${i}, multinomial probs:`, probs);
            token = choiceIndex(probs);
            other_tokens = [];
            for (let j = 0; j < probs.length; j++) {
              if(j != token && probs[j] > 0) other_tokens.push(j);
            }
            // console.log(`[predictText] Step ${i}, chosen token:`, token, 'other_tokens:', other_tokens);
          } else {
            token = npsample(data, temperature, topP, ctx, repetitivePenality);
            // console.log(`[predictText] Step ${i}, chosen token (npsample):`, token);
          }
        } else {
          token = greedySampling(results.x.data, ctx, repetitivePenality);
          // console.log(`[predictText] Step ${i}, chosen token (greedy):`, token);
        }

        if (streamingCallback) streamingCallback({ token: token, other_tokens: other_tokens, status: 'Output', i: i+1 - origPromptTokensLength, outOf: numTokensToGenerate - origPromptTokensLength});

      } else {
        token = promptTokens.shift();
        // console.log(`[predictText] Step ${i}, using prompt token:`, token);
        if (streamingCallback) streamingCallback({ token: token, status: 'Reading prompt', i: i+1, outOf: origPromptTokensLength});
      }
      ctx.push(token);
      // console.log(`[predictText] Step ${i}, ctx after push:`, ctx);

      feeds.xx_att = results.xx_att_r;
      feeds.aa_att = results.aa_att_r;
      feeds.bb_att = results.bb_att_r;
      feeds.pp_att = results.pp_att_r;
      feeds.xx_ffn = results.xx_ffn_r;
      // console.log(`[predictText] Step ${i}, updated feeds for next step.`);
    }

    let timeTaken = Date.now() - startTime;
    // console.log(`[predictText] Finished. Took ${timeTaken}ms`);
    if (streamingCallback) streamingCallback({ status: 'Finished', tokensPerSec: (i+1)/(timeTaken/1000)});

    const finalText = tokensToText(ctx);
    // console.log('[predictText] Final tokens:', ctx);
    // console.log('[predictText] Final text:', finalText);
    return finalText;
  }
  return {session, predictText};
}
