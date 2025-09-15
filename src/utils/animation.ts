import { gsap } from 'gsap';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';
import { blockIdx, isOnAnimation, modelMeta } from '~/store';
import { get } from 'svelte/store';
const { theme } = resolveConfig(tailwindConfig);

const getGradientStops = (className: string, stopIdx = 1) => {
	return Array.from(document.querySelectorAll(className)).map(
		(el) => el?.querySelectorAll('stop')[stopIdx]
	);
};
const generateGradientAnimation = (
	tl,
	gradStop: undefined | SVGStopElement | (SVGStopElement | undefined)[],
	options: GSAPTweenVars = {}
) => {
	const {
		color = 'rgba(255,255,255,0)',
		duration = 0.2,
		ease = 'power1.in',
		offset = { from: '0%', to: '100%' },
		position = '+=0',
		...restOptions
	} = options;

	const { from = '0%', to = '100%' } = offset;

	const initialColor = Array.isArray(gradStop)
		? gradStop.map((d) => d.getAttribute('stop-color'))
		: gradStop.getAttribute('stop-color');

	tl.fromTo(
		gradStop,
		{ attr: { offset: from, ['stop-color']: color } },
		{
			attr: {
				offset: to,
				['stop-color']: color
			},
			duration,
			ease,
			...restOptions
		},
		position
	).to(
		gradStop,
		{
			attr: {
				offset: to,
				['stop-color']: (i) => (Array.isArray(gradStop) ? initialColor[i] : initialColor)
			},
			duration,
			ease,
			...restOptions
		},
		'-=50%'
	);
};

const fadeOutColor = theme.colors.gray[100];
const nodeFadeOutOpacity = 0.2;

export const showFlowAnimation = async (tokenLength: number, isNextTokenOnly = true) => {
	const isFirstBlock = get(blockIdx) === 0;
	const isLastBlock = get(blockIdx) === get(modelMeta)?.layer_num - 1;

	return new Promise((resolve) => {
		const tl = gsap.timeline({
			onStart: () => {
				isOnAnimation.set(true);
			},
			onComplete: () => {
				isOnAnimation.set(false);
				resolve();
			}
		});
		const duration = 0.02;

		// ============================
		// Add token vector to embedding
		// ============================
		const tokenEmbedding = document.querySelectorAll(
			isNextTokenOnly ? '.embedding .content .last' : '.embedding .content'
		);

		tl.fromTo(
			tokenEmbedding,
			{ opacity: 0 },
			{
				opacity: 1,
				duration: isNextTokenOnly ? duration : 0.2
			}
		);

		if (!isFirstBlock) {
			// ============================
			// draw embedding to start block path
			// ============================
			const [embeddingToStartStop1, embeddingToStartStop1Last] =
				getGradientStops('.gray-white-blue');
			const [embeddingToStartStop2, embeddingToStartStop2Last] = getGradientStops(
				'.gray-white-blue',
				3
			);

			const startBlockTl = gsap.timeline();

			generateGradientAnimation(startBlockTl, [embeddingToStartStop1, embeddingToStartStop1Last], {
				duration: duration * 5,
				offset: { to: '50%' },
				ease: 'sine.inOut'
			});
			generateGradientAnimation(startBlockTl, [embeddingToStartStop2, embeddingToStartStop2Last], {
				duration: duration * 5,
				offset: { from: '50%' },
				ease: 'sine.inOut'
			});

			tl.add(startBlockTl);

			const tokenEmbedding2 = document.querySelectorAll('.rkv .block-start-column');

			tl.fromTo(
				tokenEmbedding2,
				{
					opacity: (i, d) => {
						if (isNextTokenOnly) {
							return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
						}
						return 0;
					}
				},
				{
					opacity: 1,
					duration: isNextTokenOnly ? duration : 0.2
				}
			);
		}

		// ============================
		// Draw embedding to rkv weight multiplication path
		// ============================
		const [embeddingToRKVGrad, embeddingToRKVGradLast] = getGradientStops(
			isFirstBlock ? '.gray-blue' : '.transparent-blue'
		);

		if (isNextTokenOnly) {
			generateGradientAnimation(tl, embeddingToRKVGrad, {
				color: fadeOutColor,
				duration: duration * 10
			});
			generateGradientAnimation(tl, embeddingToRKVGradLast, {
				position: '<',
				duration: duration * 10
			});
		} else {
			generateGradientAnimation(tl, [embeddingToRKVGrad, embeddingToRKVGradLast], {
				duration: duration * 10
			});
		}

		// ============================
		// Add rkv vector to timemix
		// ============================
		const rkvVectors = document.querySelectorAll('.rkv .rkv-weighted');
		tl.fromTo(
			rkvVectors,
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{
				opacity: 1,
				duration: isNextTokenOnly ? duration : 0.2
			}
		);

		// ============================
		// Draw multi-head divided path
		// ============================
		const [receptanceH1Grad, receptanceH1GradLast] = getGradientStops('.blue-blue');
		const [keyH1Grad, keyH1GradLast] = getGradientStops('.red-red');
		const [valueH1Grad, valueH1GradLast] = getGradientStops('.green-green');

		const [receptanceGrad, receptanceGradLast] = getGradientStops('.blue-blue2');
		const [keyGrad, keyGradLast] = getGradientStops('.red-red2');
		const [valueGrad, valueGradLast] = getGradientStops('.green-green2');

		if (isNextTokenOnly) {
			generateGradientAnimation(
				tl,
				[receptanceH1Grad, keyH1Grad, valueH1Grad, receptanceGrad, keyGrad, valueGrad],
				{
					color: fadeOutColor,
					duration: duration * 10
				}
			);

			generateGradientAnimation(tl, [receptanceH1GradLast, keyH1GradLast, valueH1GradLast], {
				// stagger: 0.2
				position: '<',
				duration: duration * 10
			});
			generateGradientAnimation(tl, [receptanceGradLast, keyGradLast, valueGradLast], {
				// stagger: 0.2,
				position: '<',
				duration: duration * 10
			});
		} else {
			generateGradientAnimation(
				tl,
				[receptanceH1Grad, keyH1Grad, valueH1Grad, receptanceH1GradLast, keyH1GradLast, valueH1GradLast],
				{
					// stagger: 0.2
					duration: duration * 10
				}
			);
			generateGradientAnimation(
				tl,
				[receptanceGrad, keyGrad, valueGrad, receptanceGradLast, keyGradLast, valueGradLast],
				{
					// stagger: 0.2,
					duration: duration * 10
				}
			);
		}

		// ============================
		// Add h1 rkv vector
		// ============================
		const rkvHead1 = document.querySelectorAll('.timemix .head-block .rkv .column .head1');
		tl.fromTo(
			rkvHead1,
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{ opacity: 1, duration }
		);

		// ============================
		// Draw timemix matrix multiplication path
		// Add timemix values
		// ============================
		const keyPaths = document.querySelectorAll(
			'.sankey-top g.timemix path.key-to-timemix'
		);
		const receptancePaths = document.querySelectorAll(
			'.sankey-top g.timemix path.query-to-timemix'
		);
		// TimeMixMatrix component is commented out in the latest code, .timemix-result may not exist
		// Directly select the circle list and skip animation if empty to avoid calling querySelectorAll on null
		const timemixCircles = document.querySelectorAll(
			'.timemix .timemix-result svg circle'
		);

		[...keyPaths, ...receptancePaths].forEach((path) => {
			const length = path.getTotalLength();
			path.style.strokeDasharray = `${length}`;
			path.style.strokeDashoffset = `${length}`;
		});

		const RKDuration = 0.4;
		const stagger = Number((RKDuration / tokenLength).toFixed(2));

		tl.to(keyPaths, {
			strokeDashoffset: 0,
			stagger,
			duration: RKDuration,
			ease: 'power2.out'
		}).to(
			receptancePaths,
			{
				strokeDashoffset: 0,
				stagger,
				duration: RKDuration,
				// ease: 'back.out(1.7)'
				ease: 'power2.out'
			},
			'<'
		);

		// Only add this animation if timemix circles exist
		if (timemixCircles.length > 0) {
			tl.from(
				timemixCircles,
				{
					scale: 0,
					transformOrigin: '50% 50%',
					opacity: 0,
					delay: RKDuration / tokenLength,
					stagger: Number((RKDuration / Math.pow(tokenLength, 2)).toFixed(2)),
					ease: 'power2.out',
					// ease: 'back.out(1.7)',
					duration: RKDuration
				},
				'<'
			);
		}

		// ============================
		// Draw value and timemix multiplication path
		// ============================
		const valueMulGrad = getGradientStops('.green-purple');
		const timemixMulrad = getGradientStops('.transparent-purple2');

		generateGradientAnimation(tl, [timemixMulrad, valueMulGrad].flat(), {
			color: isNextTokenOnly ? fadeOutColor : undefined,
			position: '<50%'
		});

		// ============================
		// Add output vector
		// ============================
		const outputHead1 = document.querySelectorAll('.timemix .head-block .head-out .column .cell');
		const outputTitle = document.querySelector('.timemix .head-block .head-out .title');

		tl.fromTo(
			[outputHead1, outputTitle],
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{ opacity: 1, duration }
		);

		// ============================
		// draw concat path
		// ============================
		const [outputH1Grad, outputH1GradLast] = getGradientStops('.purple-purple');
		const [outputGrad, outputGradLast] = getGradientStops('.transparent-purple');

		if (isNextTokenOnly) {
			generateGradientAnimation(tl, [outputH1Grad, outputGrad], {
				color: fadeOutColor
			});
			generateGradientAnimation(tl, [outputH1GradLast, outputGradLast], { position: '<' });
		} else {
			generateGradientAnimation(tl, [outputH1Grad, outputGrad, outputH1GradLast, outputGradLast]);
		}

		// ============================
		// add CMix input vector
		// ============================
		const cmixInputs = document.querySelectorAll('.cmix .first-layer .cell');

		tl.fromTo(
			cmixInputs,
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{ opacity: 1, duration }
		);

		// ============================
		// draw CMix first layer path
		// ============================

		const [cmixInputPath, cmixInputPathLast] = getGradientStops('.purple-indigo');

		if (isNextTokenOnly) {
			generateGradientAnimation(tl, cmixInputPath, {
				color: fadeOutColor
			});
			generateGradientAnimation(tl, cmixInputPathLast, { position: '<' });
		} else {
			generateGradientAnimation(tl, [cmixInputPath, cmixInputPathLast]);
		}

		// ============================
		// add CMix first layer output vector
		// ============================
		const cmixProjections = document.querySelectorAll('.cmix .second-layer .cell');
		const cmixActivations = document.querySelectorAll('.cmix #cmix-activation .cell');

		tl.fromTo(
			[cmixProjections, cmixActivations],
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{ opacity: 1, duration }
		);

		// ============================
		// draw CMix output layer
		// ============================
		const [cmixSecondPath, cmixSecondPathLast] = getGradientStops('.indigo-blue');

		if (isNextTokenOnly) {
			generateGradientAnimation(tl, cmixSecondPath, {
				color: fadeOutColor
			});
			generateGradientAnimation(tl, cmixSecondPathLast, { position: '<' });
		} else {
			generateGradientAnimation(tl, [cmixSecondPath, cmixSecondPathLast]);
		}

		// ===========================
		// add CMix output vector
		// ============================
		const cmixOutputs = document.querySelectorAll('.cmix .ouputs .cell');
		tl.fromTo(
			cmixOutputs,
			{
				opacity: (i, d) => {
					if (isNextTokenOnly) {
						return d.classList.contains('last') ? 0 : nodeFadeOutOpacity;
					}
					return 0;
				}
			},
			{ opacity: 1, duration }
		);

		if (isLastBlock) {
			const [lastBlockPath, lastBlockPathLast] = getGradientStops('.blue');

			if (isNextTokenOnly) {
				generateGradientAnimation(tl, lastBlockPath, {
					color: fadeOutColor
				});
				generateGradientAnimation(tl, lastBlockPathLast, { position: '<' });
			} else {
				generateGradientAnimation(tl, [lastBlockPath, lastBlockPathLast]);
			}
		} else {
			// ============================
			// show repetition of blocks
			// ============================
			const [transformerBlocksStop1, transformerBlocksStop1Last] =
				getGradientStops('.blue-white-blue');
			const [transformerBlocksStop2, transformerBlocksStop2Last] = getGradientStops(
				'.blue-white-blue',
				3
			);

			const blockTl = gsap.timeline({
				// repeat: 2
			});

			// if (isNextTokenOnly) {
			// 	generateGradientAnimation(blockTl, transformerBlocksStop1, {
			// 		color: fadeOutColor,
			// 		duration: duration * 5,
			// 		offset: { to: '50%' },
			// 		ease: 'sine.inOut'
			// 	});

			// 	generateGradientAnimation(blockTl, transformerBlocksStop1Last, {
			// 		duration: duration * 5,
			// 		offset: { to: '50%' },
			// 		ease: 'sine.inOut',
			// 		position: '<'
			// 	});

			// 	generateGradientAnimation(blockTl, transformerBlocksStop2, {
			// 		duration: duration * 5,
			// 		color: fadeOutColor,
			// 		offset: { from: '50%' },
			// 		ease: 'sine.inOut'
			// 	});
			// 	generateGradientAnimation(blockTl, transformerBlocksStop2Last, {
			// 		duration: duration * 5,
			// 		offset: { from: '50%' },
			// 		ease: 'sine.inOut',
			// 		position: '<'
			// 	});
			// } else {
			generateGradientAnimation(blockTl, [transformerBlocksStop1, transformerBlocksStop1Last], {
				duration: duration * 5,
				offset: { to: '50%' },
				ease: 'sine.inOut'
			});
			generateGradientAnimation(blockTl, [transformerBlocksStop2, transformerBlocksStop2Last], {
				duration: duration * 5,
				offset: { from: '50%' },
				ease: 'sine.inOut'
			});
			// }

			tl.add(blockTl);
		}

		// ============================
		// add final output vector
		// ============================
		const finalOutput = document.querySelectorAll('.transformer-blocks .cell');
		tl.fromTo(
			finalOutput,
			{
				opacity: 0
			},
			{ opacity: 1, duration }
		);

		// ============================
		// draw logit path
		// ============================

		const logitPath = getGradientStops('.blue-gray');

		generateGradientAnimation(tl, logitPath, { offset: { to: `50%` } });

		// ============================
		// show top k tokens and probabilities
		// ============================
		const probabilities = document.querySelectorAll('.softmax .content');
		tl.fromTo(probabilities, { opacity: 0 }, { opacity: 1, duration });

		// ============================
		// sampling animation
		// ============================
		// showSamplingAnimation();
	});
};
