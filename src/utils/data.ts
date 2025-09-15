// import { PreTrainedTokenizer } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';
import {
	modelData,
	tokens,
	tokenIds,
	isModelRunning,
	predictedToken,
	modelSession,
	modelMeta,
} from '~/store';
import { get } from 'svelte/store';
import { showFlowAnimation } from './animation';
import { padLeftWithZeros, textToTokens, tokensToText } from '~/utils/rwkv/code';
import { greedySampling, npsample } from '~/utils/rwkv/sample';
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export const fakeRunWithCachedData = async ({
	cachedData,
	tokenizer,
	temperature,
	sampling
}: {
	cachedData;
	tokenizer;
	temperature: number;
	sampling: Sampling;
}) => {
	isModelRunning.set(true);

	modelData.set(cachedData);
	tokens.set(cachedData.tokens);
	tokenIds.set(cachedData.tokenIds);

	await showFlowAnimation(cachedData.tokens.length, false);
	adjustTemperature({
		tokenizer,
		logits: cachedData.logits,
		temperature,
		sampling
	});
	isModelRunning.set(false);
};

export const runModel_rwkv4 = async ({
	tokenizer,
	input,
	temperature,
	sampling
}: {
	tokenizer;
	input: string;
	temperature: number;
	sampling: Sampling;
}) => {
	isModelRunning.set(true);
	const { token_ids, input_tokens } = await getTokenization(tokenizer, input === '' ? ' ' : input);

	let isOneTokenAdded: boolean;
	tokens.set(input_tokens);
	// Print tokens
	// console.log('tokens:', tokens);
	// console.log('tokenIds:', tokenIds);
	tokenIds.update((prev) => {
		isOneTokenAdded =
			prev.length === token_ids.length - 1 && prev.every((id, idx) => id === token_ids[idx]);
		return token_ids;
	});

	// log isOneTokenAdded
	// console.log('isOneTokenAdded:', isOneTokenAdded);

	const {
		logits, 
		// outputs 
	} = await getData_rwkv4(input);

	const { probabilities, sampled } = getProbabilities({ tokenizer, logits, sampling, temperature });

	modelData.set({
		logits,
		// outputs,
		probabilities,
		sampled
	});

	// To ensure the animation starts after all elements have been rendered
	setTimeout(async () => {
		await showFlowAnimation(input_tokens.length, isOneTokenAdded);
		predictedToken.set(sampled);
		// setPredictedTokenForAnimation(probabilities, sampled, sampling);

		isModelRunning.set(false);
	}, 0);
};

const setPredictedTokenForAnimation = (probabilities, sampled, sampling) => {
	let delay = 10;
	let topK = probabilities.slice(0, sampling.value);
	let animationTokens = [...topK, ...topK.slice(sampled.rank).reverse()];

	for (let i = 0; i < animationTokens.length; i++) {
		setTimeout(() => {
			predictedToken.set(animationTokens[i]);
		}, i * delay);
	}
};

export const adjustTemperature = async ({
	tokenizer,
	logits,
	temperature,
	sampling
}: {
	tokenizer;//: PreTrainedTokenizer;
	logits: number[];
	temperature: number;
	sampling: Sampling;
}) => {
	const { probabilities, sampled } = getProbabilities({ tokenizer, logits, sampling, temperature });

	modelData.update((d) => ({ ...d, probabilities, sampled }));

	predictedToken.set(sampled);
	// setPredictedTokenForAnimation(probabilities, sampled, sampling);
};

export const getTokenization = async (
	tokenizer,//: PreTrainedTokenizer,
	input: string) => {
	const token_ids = tokenizer.encode(input);
	const input_tokens = token_ids.map((id) => tokenizer.decode([id])).flat();
	// console.log('Input:', input);
	// console.log('Token IDs:', token_ids);
	// console.log('Input Tokens:', input_tokens);
	return {
		token_ids,
		input_tokens
	};
};

export const getData = async (token_ids: number[]) => {
	try {
		// Convert token_ids to tensor
		const inputTensor = new ort.Tensor('int64', token_ids, [1, token_ids.length]);
		// console.log('inputTensor:', inputTensor);

		// Get the session from the store
		const session = get(modelSession);
		if (!session) {
			throw new Error('Model session is not initialized.');
		}

		// Prepare the feeds (inputs)
		const feeds = { inputs: inputTensor };

		// Run inference
		const results = await session.run(feeds);
		// console.log('Inference results:', results);

		// Extract the logits
		const logits = results['head_output'].data;
		// console.log('logits:', logits);

		// Print logits information
		// console.log('Logits shape:', logits && typeof logits.length === 'number' ? [logits.length] : typeof logits);

		// Extract the dictionary values
		// const outputs = targetTensors.reduce(
		// 	(obj, key) => {
		// 		const out = results[key];
		// 		const processedData = {
		// 			// ...out,
		// 			data: reshapeArray([...out.cpuData], out.dims)
		// 		};
		// 		obj[key] = processedData;
		// 		return obj;
		// 	},
		// 	{} as ModelData['outputs']
		// );

		return {
			logits,
			// outputs
		};
	} catch (error) {
		console.error('Error during inference:', error.message);
		throw error;
	}
};

export const getData_rwkv4 = async (promptText) => {
	try {
		// Get the session from the store
		const session = get(modelSession);
		if (!session) {
			throw new Error('Model session is not initialized.');
		}

		// 
		const n_layer = get(modelMeta).layer_num;
		const n_embd = get(modelMeta).dimension;
		const samplingMethod = 'multinomial';
		const temperature = 1.0;
		const topP = 0.8;
		const repetitivePenality = 0;
		const streamingCallback = null;
		const show_other_tokens = false;
		
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

		// const multinomialSampling = samplingMethod === 'multinomial';
		const multinomialSampling = samplingMethod === 'greedy';

		// if (multinomialSampling) {
		// console.log('[predictText] multinomial sampling, temperature:', temperature, 'topP:', topP, 'repetitivePenality:', repetitivePenality);
		// } else {
		// console.log('[predictText] greedy sampling, repetitivePenality:', repetitivePenality);
		// }

        let lastLogits = null;

		const numTokensToGenerate = origPromptTokensLength;
		// feed inputs and run
		for (let i = 0; i < numTokensToGenerate; i++) {
			// if(abortSignal && abortSignal.cancelled) {
			// 	console.log(`[predictText] Aborted at step ${i}`);
			// 	break;
			// }
			let idx_d = Int32Array.from( padLeftWithZeros(ctx, 1024) );
			// console.log(`[predictText] Step ${i}, idx_d:`, idx_d);
			let idx = new ort.Tensor('int32', idx_d, [1024]);
			// console.log(`[predictText] Step ${i}, ctx:`, ctx);

			feeds.idx = idx;
			let results = await session.run(feeds);
      		// console.log(`[predictText] Step ${i}, session.run results:`, results);
			let token;

			

			if (promptTokens.length == 0) {
				let other_tokens;
				if (multinomialSampling) {
					const data = Object.values(results.x.data);
					console.log(`[predictText] Step ${i}, logits:`, data);
					console.log(`[predictText] Step ${i}, logits shape:`, Array.isArray(data) ? [data.length] : typeof data);
					console.log(`[predictText] Step ${i}, logits type:`, typeof data);
					if (streamingCallback && show_other_tokens) {
						const logitsWithPenalty = applyRepetitionPenalty(data, ctx, repetitivePenality);
						console.log(`[predictText] Step ${i}, logits after repetition penalty:`, logitsWithPenalty);
						const probs = getMultinomialProbs(logitsWithPenalty, temperature, topP);
						console.log(`[predictText] Step ${i}, multinomial probs:`, probs);
						token = choiceIndex(probs);
						other_tokens = [];
						for (let j = 0; j < probs.length; j++) {
						if(j != token && probs[j] > 0) other_tokens.push(j);
						}
						console.log(`[predictText] Step ${i}, chosen token:`, token, 'other_tokens:', other_tokens);
					} else {
						token = npsample(data, temperature, topP, ctx, repetitivePenality);
						console.log(`[predictText] Step ${i}, chosen token (npsample):`, token);
						console.log(`[predictText] Step ${i}, token to text:`, tokensToText([token]));
						

					}
				} else {
					token = greedySampling(results.x.data, ctx, repetitivePenality);
					// console.log(`[predictText] Step ${i}, chosen token (greedy):`, token);
					// console.log(`[predictText] Step ${i}, token to text:`, tokensToText([token]));
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

			if (i === numTokensToGenerate - 1) {
				// console.log(`[predictText] Step ${i}, this is the last step of the loop.`);
				const logits = Object.values(results.x.data);
				// console.log('logits:', logits);
				lastLogits = logits;
			}
        }



			
		// Extract the logits
		// const logits = results['head_output'].data;

		// Print logits information
		// console.log('Logits shape:', logits && typeof logits.length === 'number' ? [logits.length] : typeof logits);

		// Extract the dictionary values
		// const outputs = targetTensors.reduce(
		// 	(obj, key) => {
		// 		const out = results[key];
		// 		const processedData = {
		// 			// ...out,
		// 			data: reshapeArray([...out.cpuData], out.dims)
		// 		};
		// 		obj[key] = processedData;
		// 		return obj;
		// 	},
		// 	{} as ModelData['outputs']
		// );

		return {
			logits: lastLogits, // <--- return last logits
			// outputs
		};
	} catch (error) {
		console.error('Error during inference:', error.message);
		throw error;
	}
};

export const getProbabilities = ({
	tokenizer,
	logits,
	sampling = { type: 'top-k', value: 10 },
	temperature = 1
}: {
	tokenizer;//: PreTrainedTokenizer;
	logits: number[];
	sampling: Sampling;
	temperature: number;
}): { probabilities: Probabilities; sampled: Probability } => {
	if (sampling.type === 'top-p') {
		return topPSampling(tokenizer, logits, sampling.value, temperature);
	} else {
		// console.log('topKSampling: logits.length =', logits.length, 'k =', sampling.value, 'temperature =', temperature);
		return topKSampling(tokenizer, logits, sampling.value, temperature);
	}
};

function topKSampling(
	tokenizer,//: PreTrainedTokenizer,
	logits: number[],
	k: number,
	temperature: number
): { probabilities: Probabilities; sampled: Probability } {
	// Trim the list to a reasonable number that can be displayed on the screen
	const max = 50;
	const sortedLogits = Array.from(logits)
		.map((logit, index) => ({
			tokenId: index,
			logit
		}))
		.sort((a, b) => b.logit - a.logit)
		.slice(0, max);

	// Temperature Scaling
	const scaledLogits = sortedLogits.map((item) => ({
		...item,
		scaledLogit: item.logit / temperature
	}));

	// Apply Top-k: Keep topK logits and set others to -Infinity
	const filteredLogits = scaledLogits.map((item, index) => ({
		...item,
		topKLogit: index < k ? item.scaledLogit : -Infinity
	}));

	// Softmax Normalization
	const topKLogits = filteredLogits.map((item) => item.topKLogit);
	const { expLogits, probabilities } = softmax(topKLogits);

	const output = filteredLogits.map((item, i) => ({
		...item,
		rank: i,
		token: tokenizer.decode([item.tokenId]),
		expLogit: expLogits[i],
		probability: probabilities[i]
	}));

	// Sample from the top-k tokens
	const sampled = randomChoice(output);

	return { probabilities: output, sampled };
}

function topPSampling(
	tokenizer,//: PreTrainedTokenizer,
	logits: number[],
	p: number,
	temperature: number
): { probabilities: Probabilities; sampled: Probability } {
	// Trim the list to a reasonable number that can be displayed on the screen
	const max = 50;
	const sortedLogits = Array.from(logits)
		.map((logit, index) => ({
			tokenId: index,
			logit
		}))
		.sort((a, b) => b.logit - a.logit)
		.slice(0, max);

	// Temperature Scaling
	const scaledLogits = sortedLogits.map((item) => ({
		...item,
		scaledLogit: item.logit / temperature
	}));

	// Softmax Normalization
	const { expLogits, probabilities } = softmax(scaledLogits.map((item) => item.scaledLogit));

	// Compute cumulative probabilities
	const cumulativeProbabilities: number[] = [];
	probabilities.reduce((acc, prob, idx) => {
		cumulativeProbabilities[idx] = acc + prob;
		return cumulativeProbabilities[idx];
	}, 0);

	let cutoffIndex = cumulativeProbabilities.findIndex((cumProb) => cumProb >= p);
	cutoffIndex = cutoffIndex === -1 ? cumulativeProbabilities.length - 1 : cutoffIndex;

	const topIndices = scaledLogits.slice(0, cutoffIndex + 1);
	const topProbabilities = topIndices.map((d, i) => probabilities[i]);

	// Renormalize probabilities for top-p tokens
	const sumTopProbabilities = topProbabilities.reduce((sum, val) => sum + val, 0);
	const newProbabilities = topProbabilities.map((val) => val / sumTopProbabilities);

	// Sample from the top-p tokens
	const output = scaledLogits.map((item, i) => ({
		...item,
		rank: i,
		token: tokenizer.decode([item.tokenId]),
		expLogit: expLogits[i],
		probability: newProbabilities[i] || 0,
		topPProbability: probabilities[i], //original
		cumulativeProbability: cumulativeProbabilities[i],
		cutoffIndex
	}));

	const nextToken = randomChoice(output);
	return { probabilities: output, sampled: nextToken };
}

function softmax(logits: number[]): { expLogits: number[]; probabilities: number[] } {
	const maxLogit = Math.max(...logits);
	const expLogits = logits.map((logit) => (logit === -Infinity ? 0 : Math.exp(logit - maxLogit)));
	const sumExpLogits = expLogits.reduce((sum, val) => sum + val, 0);
	const probabilities = expLogits.map((val) => val / sumExpLogits);

	return { expLogits, probabilities };
}

// Simulates the np.random.choice function in Python.
function randomChoice(items: Probabilities): Probability {
	const probabilities = items.map((d) => d.probability);

	// Ensure probabilities sum to 1
	// const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
	// if (Math.abs(totalProb - 1.0) > 1e-6) {
	// 	throw new Error('Probabilities must sum to 1.');
	// }

	// Generate a random number between 0 and 1
	const random = Math.random();

	// Accumulate probabilities and find the corresponding item
	let cumulativeProbability = 0;
	for (let i = 0; i < probabilities.length; i++) {
		cumulativeProbability += probabilities[i];
		if (random < cumulativeProbability) {
			return items[i];
		}
	}

	// Fallback in case of numerical issues
	return items[items.length - 1];
}

// const timemixTensors = Array(get(modelMeta).layer_num)
// 	.fill(0)
// 	.flatMap((_, i) => {
// 		return Array(get(modelMeta).timemix_head_num)
// 			.fill(0)
// 			.flatMap((_, j) => [
// 				`block_${i}_tmix_head_${j}_attn`,
// 				// `block_${i}_attn_head_${j}_attn`,
// 				// `block_${i}_attn_head_${j}_attn_scaled`,
// 				// `block_${i}_attn_head_${j}_attn_masked`,
// 				// `block_${i}_attn_head_${j}_attn_softmax`,
// 				// `block_${i}_attn_head_${j}_attn_dropout`
// 			]);
// 	});

// const targetTensors = [...timemixTensors];