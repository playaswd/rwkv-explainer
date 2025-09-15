import { writable, derived, readable } from 'svelte/store';
import * as ort from 'onnxruntime-web';
import tailwindConfig from '../../tailwind.config';
import resolveConfig from 'tailwindcss/resolveConfig';
import { ex0 } from '~/constants/examples/rwkv';

const { theme } = resolveConfig(tailwindConfig);

export const timemixHeadIdxTemp = writable(0);
export const timemixHeadIdx = writable(0);
export const blockIdxTemp = writable(0);
export const blockIdx = writable(0);
export const isOnBlockTransition = writable(false);

export const isOnAnimation = writable(false);

// is rwkv running?
export const isModelRunning = writable(false);
export const isFetchingModel = writable(true);
export const isLoaded = writable(false);

export const inputTextExample = [
	'Data visualization empowers users to',
	'Artificial Intelligence is transforming the',
	'As the spaceship was approaching the',
	'On the deserted planet they discovered a',
	'IEEE VIS conference highlights the'
];

const initialExIdx = 0;
export const selectedExampleIdx = writable<number>(initialExIdx);

export const modelSession = writable<ort.InferenceSession>();

// rwkv model output
export const modelData = writable<ModelData>(ex0);
export const predictedToken = writable<Probability>();
export const tokens = writable<string[]>(ex0?.tokens);
export const tokenIds = writable<number[]>(ex0?.tokenIds);

export const modelMetaMap: Record<string, ModelMetaData> = {
	'rwkv4-small': {
		layer_num: 12,
		timemix_head_num: 1,
		dimension: 768,
		chunkNum: 14,
		vocabSize: 50277,
		hfName: 'RWKV/rwkv-4-169m-pile'
	},
	'rwkv4-medium': {
		layer_num: 24,
		timemix_head_num: 1,
		dimension: 1024,
		chunkNum: 42,
		vocabSize: 50277,
		hfName: 'RWKV/rwkv-4-430m-pile'
	},
	'rwkv4-large': {
		layer_num: 24,
		timemix_head_num: 1,
		dimension: 2048,
		chunkNum: 106,
		vocabSize: 50277,
		hfName: 'RWKV/rwkv-4-1b5-pile'
	}
};

// selected token vector
export const highlightedToken = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

export const highlightedHead = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

// expanded block
export const expandedBlock = writable<ExpandedBlock>({ id: null });

// user input text
export const inputText = writable(inputTextExample[initialExIdx]);
// export const tokens = derived(inputText, ($inputText) => $inputText.trim().split(' '));

// selected model and meta data
const initialSelectedModel = 'rwkv4-small';
// const initialSelectedModel = 'rwkv4-medium';
// const initialSelectedModel = 'rwkv4-large';

export const selectedModel = writable(initialSelectedModel);
export const modelMeta = derived(selectedModel, ($selectedModel) => modelMetaMap[$selectedModel]);

// Temperature setting
export const initialTemperature = 0.8;
export const temperature = writable(initialTemperature);

// Sampling
export const sampling = writable<Sampling>({ type: 'top-k', value: 5 });

// Prediction visual
export const highlightedIndex = writable(null);
export const finalTokenIndex = writable(null);

// Visual element style
export const rootRem = 16;
export const minVectorHeight = 12;
export const maxVectorHeight = 48;
export const maxVectorScale = 3.4;

export const vectorHeight = writable(0);
export const headContentHeight = writable(0);
export const headGap = { x: 5, y: 8, scale: 0 };

export const isBoundingBoxActive = writable(false);

export const predictedColor = theme.colors.purple[600];

// Interactivity
export const hoveredPath = writable();
export const hoveredMatrixCell = writable({ row: null, col: null });
export const weightPopover = writable();
export const tooltip = writable();

export const isMobile = readable(detectDevice());

function detectDevice() {
	const userAgent = navigator.userAgent.toLowerCase();
	return /android|iphone|ipad|ipod/i.test(userAgent);
}
