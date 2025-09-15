<script lang="ts">
	import { modelMeta, tokens, rootRem } from '~/store';
	import * as d3 from 'd3';
	import { gsap } from '~/utils/gsap';
	import Matrix from '~/components/common/Matrix.svelte';
	import { onDestroy, onMount } from 'svelte';
	import resolveConfig from 'tailwindcss/resolveConfig';
	import tailwindConfig from '../../../tailwind.config';
	import HelpPopover from '../common/HelpPopover.svelte';
	import WeightPopoverCard from '../common/WeightPopoverCard.svelte';

	const { theme } = resolveConfig(tailwindConfig);

	const tokenGap = 6;

	// generate data
	const visibleDimension = 18;
	$: tokenLen = $tokens.length;

	// Step 1: time_shift(x)
	$: xData = Array(tokenLen) //shape [tokenLen][visibleDimension]
		.fill(0)
		.map(() => 
			Array(visibleDimension)
				.fill(0)
				.map(() => Math.random())
		);

	$: xxData = Array(tokenLen)
		.fill(0)
		.map((_, i) => i === 0
			? Array(visibleDimension).fill(0)
			: xData[i - 1].slice());

	// Step 2: Mix for r, k, v
	
	const trRow = Array(visibleDimension).fill(0).map(() => Math.random());  // time_mix_r
	$: trData = Array(tokenLen).fill(trRow); // broadcast
	$: tr1Data = trData.map(row => row.map(v => 1 - v)); // 1-time_mix_r

	const tkRow = Array(visibleDimension).fill(0).map(() => Math.random()); // time_mix_k
	$: tkData = Array(tokenLen).fill(tkRow); // broadcast
	$: tk1Data = tkData.map(row => row.map(v => 1 - v)); // 1-time_mix_k

	const tvRow = Array(visibleDimension).fill(0).map(() => Math.random()); // time_mix_v
	$: tvData = Array(tokenLen).fill(tvRow); // broadcast
	$: tv1Data = tvData.map(row => row.map(v => 1 - v)); // 1-time_mix_v

	$: xkData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: xvData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: xrData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));

	// Step 3: Projections
	// r, k, v weights data
	const receptanceWeightData = Array(visibleDimension)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);
	
	const keyWeightData = Array(visibleDimension)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);
		
	const valueWeightData = Array(visibleDimension)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);
	
	// r, k, v data
	$: rData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: kData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: vData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	
	// color scale for embedding
	const embeddingColorScale = (d: number, i: any) => {
		return d3.interpolate(theme.colors['gray'][100], theme.colors['gray'][400])(d);
	};

	// color scales for r, k, v
	const rColorScale = (d: number, i: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};

	const kColorScale = (d: number, i: number) => {
		return d3.interpolate(theme.colors['red'][100], theme.colors['red'][400])(d);
	};

	const vColorScale = (d: number, i: number) => {
		return d3.interpolate(theme.colors['green'][100], theme.colors['green'][400])(d);
	};

	// animation
	let isAnimationActive = false;
	let progress = 0;
	let timeline = gsap.timeline();

	onMount(() => {
		timeline.eventCallback('onUpdate', () => {
			progress = timeline.progress();
			if (progress === 1) isAnimationActive = false;
		});

		setTimeout(() => {
			isAnimationActive = true;
			drawStep1();
		}, 300);
	});

	onDestroy(() => {
		if (timeline) {
			timeline.kill();
			timeline = null;
		}
	});

	// Refactored animation functions, bind tabs and sub-tabs
	const drawStep1 = () => {
		// Step 1: time_shift(x) - Highlight each element in the first row, highlight the rest of the rows as a whole
		const xRows = d3.selectAll('.weight-popover-content .rkv-x g.g-row').nodes(); // .rkv-x Matrix classname
		const xxRows = d3.selectAll('.weight-popover-content .rkv-xx g.g-row').nodes();
		const arrowSymbol = d3.selectAll('.weight-popover-content .operator .symbol').nodes().find(n => n.textContent === '→');
		
		timeline.clear();
		
		const highlight = '#94a3b8';

		// First row animation
		const firstXRowRects = d3.select(xRows[0]).selectAll('rect').nodes();
		const firstXXRowRects = d3.select(xxRows[0]).selectAll('rect').nodes();

		// 1. Dim x row and xx row
		timeline.set(firstXRowRects, { opacity: 0.1 });
		timeline.set(firstXXRowRects, { opacity: 0.1 });
		// 2. Highlight each x row rect and simultaneously highlight the corresponding xx row rect
		firstXRowRects.forEach((rect, i) => {
			timeline
				.fromTo(
					[rect, firstXXRowRects[i]],
					{ opacity: 0.1, strokeWidth: 0 },
					{ opacity: 1, duration: 0.1, strokeWidth: 10, stroke: highlight }
				)
				.to(
					[rect, firstXXRowRects[i]],
					{ strokeWidth: 0, duration: 0.1 },
					'<50%'
				);
		});

		// 3. Highlight the "→" symbol
		if (arrowSymbol) {
			timeline.from(arrowSymbol, { duration: 0.3, opacity: 1 }, '<');
		}

		// 4. Dim xx row
		timeline.set(firstXXRowRects, { opacity: 0.1 });
		// 5. Highlight each xx row rect
		firstXXRowRects.forEach((rect, i) => {
			timeline
				.fromTo(
					rect,
					{ opacity: 0.1, strokeWidth: 0 },
					{ opacity: 1, duration: 0.1, strokeWidth: 10, stroke: highlight },
					'<-50%'
				)
				.to(
					rect,
					{ strokeWidth: 0, duration: 0.1 },
					'<50%'
				);
		});

		// 6. Highlight output rects
		firstXXRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			timeline
				.fromTo(
					outputRect,
					{ opacity: 0, strokeWidth: 0 },
					{ opacity: 1, duration: isFirstOutCell ? 0.4 : 0.002, strokeWidth: 10, stroke: highlight },
					'<-50%'
				)
				.to(
					outputRect,
					{ strokeWidth: 0, duration: isFirstOutCell ? 0.4 : 0.002 },
					'<50%'
				);
		});

		// Animation for the rest of the rows
		let previousRowIdx = 0;
		xxRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;
			const outputCells = d3.select(row).selectAll('rect').nodes();
			const embeddingRowRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();

			// Dim x row
			timeline.set(embeddingRowRects, { opacity: 0.1 });
			// Highlight x row
			embeddingRowRects.forEach((rect, i) => {
				timeline
					.fromTo(rect, { opacity: 0.1, strokeWidth: 0 }, { opacity: 1, duration: 0.01, strokeWidth: 10, stroke: highlight })
					.to(rect, { strokeWidth: 0, duration: 0.01 }, '<50%');
			});
			// Dim xx row
			timeline.set(outputCells, { opacity: 0.1 });
			// Highlight xx row
			outputCells.forEach((rect, i) => {
				timeline
					.fromTo(rect, { opacity: 0.1, strokeWidth: 0 }, { opacity: 1, duration: 0.01, strokeWidth: 10, stroke: highlight }, '<-50%')
					.to(rect, { strokeWidth: 0, duration: 0.01 }, '<50%');
			});
			previousRowIdx = rowIdx;
		});
	};

	const drawStep2r = () => {
		// Step 2 R: Mix for r - x * time_mix_r + xx * (1 - time_mix_r)
		const xRows = d3.selectAll('.weight-popover-content .rkv-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .rkv-xx g.g-row').nodes();
		const trRows = d3.selectAll('.weight-popover-content .rkv-tr g.g-row').nodes();
		const tr1Rows = d3.selectAll('.weight-popover-content .rkv-tr1 g.g-row').nodes();
		const xrRows = d3.selectAll('.weight-popover-content .rkv-xr g.g-row').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		xrRows.forEach((row, rowIdx) => {
			const xRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();
			const xxRects = d3.select(xxRows[rowIdx]).selectAll('rect').nodes();
			const trRects = d3.select(trRows[rowIdx]).selectAll('rect').nodes();
			const tr1Rects = d3.select(tr1Rows[rowIdx]).selectAll('rect').nodes();
			const xrRects = d3.select(xrRows[rowIdx]).selectAll('rect').nodes();

			// Dim all cells first
			timeline.set(xRects, { opacity: 0.1 });
			timeline.set(xxRects, { opacity: 0.1 });
			timeline.set(trRects, { opacity: 0.1 });
			timeline.set(tr1Rects, { opacity: 0.1 });
			timeline.set(xrRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				xRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, xxRects[i], trRects[i], tr1Rects[i], xrRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, xxRects[i], trRects[i], tr1Rects[i], xrRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				
			} else {
				// Highlight the rest of the rows as a whole
				timeline.fromTo(
					[xRects, xxRects, trRects, tr1Rects, xrRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep2k = () => {
		// Step 2 K: Mix for k - x * time_mix_k + xx * (1 - time_mix_k)
		const xRows = d3.selectAll('.weight-popover-content .rkv-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .rkv-xx g.g-row').nodes();
		const tkRows = d3.selectAll('.weight-popover-content .rkv-tk g.g-row').nodes();
		const tk1Rows = d3.selectAll('.weight-popover-content .rkv-tk1 g.g-row').nodes();
		const xkRows = d3.selectAll('.weight-popover-content .rkv-xk g.g-row').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		xkRows.forEach((row, rowIdx) => {
			const xRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();
			const xxRects = d3.select(xxRows[rowIdx]).selectAll('rect').nodes();
			const tkRects = d3.select(tkRows[rowIdx]).selectAll('rect').nodes();
			const tk1Rects = d3.select(tk1Rows[rowIdx]).selectAll('rect').nodes();
			const xkRects = d3.select(xkRows[rowIdx]).selectAll('rect').nodes();

			// Dim all cells first
			timeline.set(xRects, { opacity: 0.1 });
			timeline.set(xxRects, { opacity: 0.1 });
			timeline.set(tkRects, { opacity: 0.1 });
			timeline.set(tk1Rects, { opacity: 0.1 });
			timeline.set(xkRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				xRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, xxRects[i], tkRects[i], tk1Rects[i], xkRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, xxRects[i], tkRects[i], tk1Rects[i], xkRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				
			} else {
				// Highlight the rest of the rows as a whole
				timeline.fromTo(
					[xRects, xxRects, tkRects, tk1Rects, xkRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep2v = () => {
		// Step 2 V: Mix for v - x * time_mix_v + xx * (1 - time_mix_v)
		const xRows = d3.selectAll('.weight-popover-content .rkv-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .rkv-xx g.g-row').nodes();
		const tvRows = d3.selectAll('.weight-popover-content .rkv-tv g.g-row').nodes();
		const tv1Rows = d3.selectAll('.weight-popover-content .rkv-tv1 g.g-row').nodes();
		const xvRows = d3.selectAll('.weight-popover-content .rkv-xv g.g-row').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		xvRows.forEach((row, rowIdx) => {
			const xRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();
			const xxRects = d3.select(xxRows[rowIdx]).selectAll('rect').nodes();
			const tvRects = d3.select(tvRows[rowIdx]).selectAll('rect').nodes();
			const tv1Rects = d3.select(tv1Rows[rowIdx]).selectAll('rect').nodes();
			const xvRects = d3.select(xvRows[rowIdx]).selectAll('rect').nodes();

			// Dim all cells first
			timeline.set(xRects, { opacity: 0.1 });
			timeline.set(xxRects, { opacity: 0.1 });
			timeline.set(tvRects, { opacity: 0.1 });
			timeline.set(tv1Rects, { opacity: 0.1 });
			timeline.set(xvRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				xRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, xxRects[i], tvRects[i], tv1Rects[i], xvRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, xxRects[i], tvRects[i], tv1Rects[i], xvRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});

			} else {
				// Highlight the rest of the rows as a whole
				timeline.fromTo(
					[xRects, xxRects, tvRects, tv1Rects, xvRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep3r = () => {
		// Step 3 R: Projections for r - r = Linear(xr)
		const xrRows = d3.selectAll('.weight-popover-content .rkv-xr g.g-row').nodes();
		const receptanceWeightCols = d3.selectAll('.weight-popover-content .rkv-receptance-weight g.g-col').nodes();
		const rRows = d3.selectAll('.weight-popover-content .rkv-r g.g-row').nodes();
		
		const equalSymbols = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		const firstRRowRects = d3.select(rRows[0]).selectAll('rect').nodes();
		const firstXRRowRects = d3.select(xrRows[0]).selectAll('rect').nodes();

		firstRRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(receptanceWeightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstXRRowRects, { opacity: 0.1 });

			firstXRRowRects.forEach((embeddingRect, i) => {
				//embedding
				timeline
					.fromTo(
						embeddingRect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						embeddingRect,
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);

				//weights
				timeline
					.fromTo(
						firstWeightColRects[i],
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						},
						'<-50%'
					)
					.to(
						firstWeightColRects[i],
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);
			});

			//symbol
			if (isFirstOutCell) {
				timeline.from(
					equalSymbols,
					{
						duration: 0.5,
						opacity: 0.1
					},
					'<'
				);
			}

			//out
			timeline
				.fromTo(
					outputRect,
					{ opacity: 0, strokeWidth: 0 },
					{
						opacity: 1,
						duration: isFirstOutCell ? 0.4 : 0.002,
						strokeWidth: 10,
						stroke: highlight
					},
					'<-50%'
				)
				.to(
					outputRect,
					{
						strokeWidth: 0,
						duration: isFirstOutCell ? 0.4 : 0.002
					},
					'<50%'
				);
		});

		// rest row animation
		let previousRowIdx = 0;

		// out vectors
		rRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const rCells = d3.select(row).selectAll('rect').nodes();
			const xrRowRects = d3.select(xrRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					xrRowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const receptanceWeightColRects = d3
					.selectAll('.weight-popover-content .rkv-receptance-weight g.g-col rect')
					.nodes();
				timeline.set(receptanceWeightColRects, { opacity: 0.1 });
			}

			rCells.forEach((d, colIdx) => {
				const receptanceWeightColRects = d3.select(receptanceWeightCols[colIdx]).selectAll('rect').nodes();

				timeline.fromTo(
					receptanceWeightColRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					`<50%`
				);

				timeline.from(
					d,
					{
						opacity: 0,
						duration: 0.01
					},
					`<50%`
				);
			});
			previousRowIdx = rowIdx;
		});
	};

	const drawStep3k = () => {
		// Step 3 K: Projections for k - k = Linear(xk)
		const xkRows = d3.selectAll('.weight-popover-content .rkv-xk g.g-row').nodes();
		const keyWeightCols = d3.selectAll('.weight-popover-content .rkv-key-weight g.g-col').nodes();
		const kRows = d3.selectAll('.weight-popover-content .rkv-k g.g-row').nodes();
		
		const equalSymbols = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		const firstKRowRects = d3.select(kRows[0]).selectAll('rect').nodes();
		const firstXKRowRects = d3.select(xkRows[0]).selectAll('rect').nodes();

		firstKRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(keyWeightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstXKRowRects, { opacity: 0.1 });

			firstXKRowRects.forEach((embeddingRect, i) => {
				//embedding
				timeline
					.fromTo(
						embeddingRect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						embeddingRect,
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);

				//weights
				timeline
					.fromTo(
						firstWeightColRects[i],
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						},
						'<-50%'
					)
					.to(
						firstWeightColRects[i],
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);
			});

			//symbol
			if (isFirstOutCell) {
				timeline.from(
					equalSymbols,
					{
						duration: 0.5,
						opacity: 0.1
					},
					'<'
				);
			}

			//out
			timeline
				.fromTo(
					outputRect,
					{ opacity: 0, strokeWidth: 0 },
					{
						opacity: 1,
						duration: isFirstOutCell ? 0.4 : 0.002,
						strokeWidth: 10,
						stroke: highlight
					},
					'<-50%'
				)
				.to(
					outputRect,
					{
						strokeWidth: 0,
						duration: isFirstOutCell ? 0.4 : 0.002
					},
					'<50%'
				);
		});

		// rest row animation
		let previousRowIdx = 0;

		// out vectors
		kRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const kCells = d3.select(row).selectAll('rect').nodes();
			const xkRowRects = d3.select(xkRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					xkRowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const keyWeightColRects = d3
					.selectAll('.weight-popover-content .rkv-key-weight g.g-col rect')
					.nodes();
				timeline.set(keyWeightColRects, { opacity: 0.1 });
			}

			kCells.forEach((d, colIdx) => {
				const keyWeightColRects = d3.select(keyWeightCols[colIdx]).selectAll('rect').nodes();

				timeline.fromTo(
					keyWeightColRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					`<50%`
				);

				timeline.from(
					d,
					{
						opacity: 0,
						duration: 0.01
					},
					`<50%`
				);
			});
			previousRowIdx = rowIdx;
		});
	};

	const drawStep3v = () => {
		// Step 3 V: Projections for v - v = Linear(xv)
		const xvRows = d3.selectAll('.weight-popover-content .rkv-xv g.g-row').nodes();
		const valueWeightCols = d3.selectAll('.weight-popover-content .rkv-value-weight g.g-col').nodes();
		const vRows = d3.selectAll('.weight-popover-content .rkv-v g.g-row').nodes();
		
		const equalSymbols = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		const firstXVRowRects = d3.select(xvRows[0]).selectAll('rect').nodes();
		const firstVRowRects = d3.select(vRows[0]).selectAll('rect').nodes();

		firstVRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(valueWeightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstXVRowRects, { opacity: 0.1 });

			firstXVRowRects.forEach((embeddingRect, i) => {
				//embedding
				timeline
					.fromTo(
						embeddingRect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						embeddingRect,
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);

				//weights
				timeline
					.fromTo(
						firstWeightColRects[i],
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						},
						'<-50%'
					)
					.to(
						firstWeightColRects[i],
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);
			});

			//symbol
			if (isFirstOutCell) {
				timeline.from(
					equalSymbols,
					{
						duration: 0.5,
						opacity: 0.1
					},
					'<'
				);
			}

			//out
			timeline
				.fromTo(
					outputRect,
					{ opacity: 0, strokeWidth: 0 },
					{
						opacity: 1,
						duration: isFirstOutCell ? 0.4 : 0.002,
						strokeWidth: 10,
						stroke: highlight
					},
					'<-50%'
				)
				.to(
					outputRect,
					{
						strokeWidth: 0,
						duration: isFirstOutCell ? 0.4 : 0.002
					},
					'<50%'
				);
		});

		// rest row animation
		let previousRowIdx = 0;

		// out vectors
		vRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const vCells = d3.select(row).selectAll('rect').nodes();
			const xvRowRects = d3.select(xvRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					xvRowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const valueWeightColRects = d3
					.selectAll('.weight-popover-content .rkv-value-weight g.g-col rect')
					.nodes();
				timeline.set(valueWeightColRects, { opacity: 0.1 });
			}

			vCells.forEach((d, colIdx) => {
				const valueWeightColRects = d3.select(valueWeightCols[colIdx]).selectAll('rect').nodes();

				timeline.fromTo(
					valueWeightColRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					`<50%`
				);

				timeline.from(
					d,
					{
						opacity: 0,
						duration: 0.01
					},
					`<50%`
				);
			});
			previousRowIdx = rowIdx;
		});
	};

	// event
	let highlightColxr: number | undefined = undefined;
	let highlightRowxr: number | undefined = undefined;
	let highlightColxk: number | undefined = undefined;
	let highlightRowxk: number | undefined = undefined;
	let highlightColxv: number | undefined = undefined;
	let highlightRowxv: number | undefined = undefined;

	let highlightColR: number | undefined = undefined;
	let highlightRowR: number | undefined = undefined;
	let highlightColK: number | undefined = undefined;
	let highlightRowK: number | undefined = undefined;
	let highlightColV: number | undefined = undefined;
	let highlightRowV: number | undefined = undefined;

	const onMouseOverCellxr = (e, d) => {
		if (isAnimationActive) return;
		highlightRowxr = d.rowIndex;
		highlightColxr = d.colIndex;
	};
	const onMouseOutSvgxr = () => {
		highlightColxr = undefined;
		highlightRowxr = undefined;
	};

	const onMouseOverCellxk = (e, d) => {
		if (isAnimationActive) return;
		highlightRowxk = d.rowIndex;
		highlightColxk = d.colIndex;
	};
	const onMouseOutSvgxk = () => {
		highlightColxk = undefined;
		highlightRowxk = undefined;
	};

	const onMouseOverCellxv = (e, d) => {
		if (isAnimationActive) return;
		highlightRowxv = d.rowIndex;
		highlightColxv = d.colIndex;
	};

	const onMouseOutSvgxv = () => {
		highlightColxv = undefined;
		highlightRowxv = undefined;
	};

	const onMouseOverCellR = (e, d) => {
		if (isAnimationActive) return;
		highlightRowR = d.rowIndex;
		highlightColR = d.colIndex;
	};
	const onMouseOutSvgR = () => {
		highlightColR = undefined;
		highlightRowR = undefined;
	};

	const onMouseOverCellK = (e, d) => {
		if (isAnimationActive) return;
		highlightRowK = d.rowIndex;
		highlightColK = d.colIndex;
	};
	const onMouseOutSvgK = () => {
		highlightColK = undefined;
		highlightRowK = undefined;
	};

	const onMouseOverCellV = (e, d) => {
		if (isAnimationActive) return;
		highlightRowV = d.rowIndex;
		highlightColV = d.colIndex;
	};

	const onMouseOutSvgV = () => {
		highlightColV = undefined;
		highlightRowV = undefined;
	};

	// Tab labels for each step of the RKV process
	let tab = 0; // 0: Step1, 1: Step2, 2: Step3
	let subTab2 = 0; // 0: R, 1: K, 2: V for Step 2
	let subTab3 = 0; // 0: R, 1: K, 2: V for Step 3
	const tabLabels = [
		"Step 1: Token Shift",
		"Step 2: Mix for r, k, v",
		"Step 3: Linear Projections"
	];
	const subTabLabels2 = ["R", "K", "V"];
	const subTabLabels3 = ["R", "K", "V"];

	// Trigger animation when switching tabs
	$: if (isAnimationActive) {
		if (tab === 0) {
			drawStep1();
		} else if (tab === 1) {
			if (subTab2 === 0) drawStep2r();
			else if (subTab2 === 1) drawStep2k();
			else drawStep2v();
		} else if (tab === 2) {
			if (subTab3 === 0) drawStep3r();
			else if (subTab3 === 1) drawStep3k();
			else drawStep3v();
		}
	}

	// Trigger animation when switching sub-tabs
	$: if (isAnimationActive && (tab === 1 || tab === 2)) {
		if (tab === 1) {
			if (subTab2 === 0) drawStep2r();
			else if (subTab2 === 1) drawStep2k();
			else drawStep2v();
		} else if (tab === 2) {
			if (subTab3 === 0) drawStep3r();
			else if (subTab3 === 1) drawStep3k();
			else drawStep3v();
		}
	}

	function handleTabClick(idx) {
		tab = idx;
		if (tab === 1) subTab2 = 0; // Reset sub-tab for Step 2
		if (tab === 2) subTab3 = 0; // Reset sub-tab for Step 3
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (tab === 0) {
				drawStep1();
			} else if (tab === 1) {
				if (subTab2 === 0) drawStep2r();
				else if (subTab2 === 1) drawStep2k();
				else drawStep2v();
			} else if (tab === 2) {
				if (subTab3 === 0) drawStep3r();
				else if (subTab3 === 1) drawStep3k();
				else drawStep3v();
			}
		}, 100);
	}

	function handleSubTabClick(mainTab, subIdx) {
		if (mainTab === 2) {
			subTab2 = subIdx;
		} else if (mainTab === 3) {
			subTab3 = subIdx;
		}
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (mainTab === 2) {
				if (subTab2 === 0) drawStep2r();
				else if (subTab2 === 1) drawStep2k();
				else drawStep2v();
			} else if (mainTab === 3) {
				if (subTab3 === 0) drawStep3r();
				else if (subTab3 === 1) drawStep3k();
				else drawStep3v();
			}
		}, 100);
	}
</script>

<WeightPopoverCard id="tmix-rkv" title={'Receptance Key Value'} bind:isAnimationActive {timeline}>
	<div class="rkv-weight-popover weight-popover-content popover-vertical items-start justify-center">
		<!-- tabs and content top-bottom -->
		<div class="tabs tabs-horizontal">
			{#each tabLabels as label, idx}
				{#if idx > 0}
					<div class="arrow">→</div>
				{/if}
				<button
				class="tab-btn"
				class:active={tab === idx}
				on:click={() => handleTabClick(idx)}
				>{label}</button>
			{/each}
		</div>

		<!-- sub tabs for step 2 and 3 -->
		{#if tab === 0}
			<!-- Invisible sub tabs for step 1 to maintain spacing -->
			<div class="sub-tabs tabs-horizontal invisible">
				<button class="sub-tab-btn">R</button>
				<button class="sub-tab-btn">K</button>
				<button class="sub-tab-btn">V</button>
			</div>
		{/if}

		{#if tab === 1}
			<div class="sub-tabs tabs-horizontal">
				{#each subTabLabels2 as label, idx}
					<button
					class="sub-tab-btn"
					class:active={subTab2 === idx}
					class:r-tab={label === 'R'}
					class:k-tab={label === 'K'}
					class:v-tab={label === 'V'}
					on:click={() => handleSubTabClick(2, idx)}
					>{label}</button>
				{/each}
			</div>
		{/if}

		{#if tab === 2}
			<div class="sub-tabs tabs-horizontal">
				{#each subTabLabels3 as label, idx}
					<button
					class="sub-tab-btn"
					class:active={subTab3 === idx}
					class:r-tab={label === 'R'}
					class:k-tab={label === 'K'}
					class:v-tab={label === 'V'}
					on:click={() => handleSubTabClick(3, idx)}
					>{label}</button>
				{/each}
			</div>
		{/if}

		<!-- step content -->
		<div class="step-content step-content-vertical">
			<!-- Step 1: xx -->
			{#if tab === 0}
				<div class="flex flex-row items-center justify-center gap-8">
					<div class="flex flex-row items-center gap-4">
						<!-- Tokens -->
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>

						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Embeddings
								<HelpPopover id="rkv-x" placement="top">
									{`Current token's embedding.`}
								</HelpPopover>
							</div>
							<!-- (tokenLen, 768) -->
							<Matrix
								className="rkv-x"
								data={xData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>

					<div class="operator"><div class="symbol">→</div></div>
					
					<div class="flex flex-row items-center gap-4">
						<!-- Tokens -->
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{index === 0 ? '<pad>' : $tokens[index-1]}</span></div>
								{/each}
							</div>
						</div>

						<!-- Shifted Embeddings -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Shifted Embeddings
								<HelpPopover id="rkv-xx" placement="top">
									{`Previous token's embedding (shifted x).`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xx"
								data={xxData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				</div>
			{/if}
			<!-- Step 2: Mix for r, k, v -->
			{#if tab === 1}
				{#if subTab2 === 0}
					<!-- R Tab -->
					<div class="flex items-center gap-4">
						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								x
								<HelpPopover id="rkv-x" placement="top">
									{`Current token's embedding.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-x"
								data={xData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxr}
								highlightRow={highlightRowxr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- time_mix_r -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								time_mix_r
								<HelpPopover id="rkv-tr" placement="top">
									{`Blends current and previous token information based on learned mixing coefficients.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tr"
								data={trData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={rColorScale}
								highlightCol={highlightColxr}
								highlightRow={highlightRowxr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- xx -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xx
								<HelpPopover id="rkv-xx" placement="top">
									{`Previous token's embedding (shifted x).`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xx"
								data={xxData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxr}
								highlightRow={highlightRowxr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- 1 - time_mix_r -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								1 - time_mix_r
								<HelpPopover id="rkv-tr1" placement="top">
									{`Blends current and previous token information based on learned mixing coefficients.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tr1"
								data={tr1Data}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={rColorScale}
								highlightCol={highlightColxr}
								highlightRow={highlightRowxr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- xr -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xr
								<HelpPopover id="rkv-xr" placement="top">
									{`Linear interpolation: x * time_mix_r + xx * (1 - time_mix_r)`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xr"
								data={xrData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								onMouseOverCell={onMouseOverCellxr}
								onMouseOutSvg={onMouseOutSvgxr}
								highlightCol={highlightColxr}
								highlightRow={highlightRowxr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{:else if subTab2 === 1}
					<!-- K Tab -->
					<div class="flex items-center gap-4">
						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								x
								<HelpPopover id="rkv-x" placement="top">
									{`current token's embedding.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-x"
								data={xData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxk}
								highlightRow={highlightRowxk}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- time_mix_k -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								time_mix_k
								<HelpPopover id="rkv-tk" placement="top">
									{`Blends current and previous token information for key generation.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tk"
								data={tkData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={kColorScale}
								highlightCol={highlightColxk}
								highlightRow={highlightRowxk}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- xx -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xx
								<HelpPopover id="rkv-xx" placement="top">
									{`Previous token's embedding (shifted x).`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xx"
								data={xxData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxk}
								highlightRow={highlightRowxk}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- 1 - time_mix_k -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								1 - time_mix_k
								<HelpPopover id="rkv-tk1" placement="top">
									{`Blends current and previous token information for key generation.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tk1"
								data={tk1Data}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={kColorScale}
								highlightCol={highlightColxk}
								highlightRow={highlightRowxk}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- xk -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xk
								<HelpPopover id="rkv-xk" placement="top">
									{`Linear interpolation: x * time_mix_k + xx * (1 - time_mix_k).`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xk"
								data={xkData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								onMouseOverCell={onMouseOverCellxk}
								onMouseOutSvg={onMouseOutSvgxk}
								highlightCol={highlightColxk}
								highlightRow={highlightRowxk}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{:else}
					<!-- V Tab -->
					<div class="flex items-center gap-4">
						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								x
								<HelpPopover id="rkv-x" placement="top">
									{`Current token's embedding.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-x"
								data={xData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxv}
								highlightRow={highlightRowxv}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- time_mix_v -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								time_mix_v
								<HelpPopover id="rkv-tv" placement="top">
									{`Blends current and previous token information for value generation.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tv"
								data={tvData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={vColorScale}
								highlightCol={highlightColxv}
								highlightRow={highlightRowxv}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- xx -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xx
								<HelpPopover id="rkv-xx" placement="top">
									{`Previous token's embedding (shifted x).`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xx"
								data={xxData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightCol={highlightColxv}
								highlightRow={highlightRowxv}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- 1 - time_mix_v -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								1 - time_mix_v
								<HelpPopover id="rkv-tv1" placement="top">
									{`Blends current and previous token information for value generation.`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-tv1"
								data={tv1Data}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={vColorScale}
								highlightCol={highlightColxv}
								highlightRow={highlightRowxv}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- xv -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xv
								<HelpPopover id="rkv-xv" placement="top">
									{`Linear interpolation: x * time_mix_v + xx * (1 - time_mix_v)`}
								</HelpPopover>
							</div>
							<Matrix
								className="rkv-xv"
								data={xvData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								onMouseOverCell={onMouseOverCellxv}
								onMouseOutSvg={onMouseOutSvgxv}
								highlightCol={highlightColxv}
								highlightRow={highlightRowxv}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{/if}
			{/if}
			<!-- Step 3: Projections for r, k, v -->
			{#if tab === 2}
				{#if subTab3 === 0}
					<!-- R Tab -->
					<div class="flex items-center gap-4">
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xr<HelpPopover id="rkv-xr" placement="top">
									{`Mixed embedding input for receptance projection`}</HelpPopover>
							</div>
							<Matrix
								className="rkv-xr"
								data={xrData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightRow={highlightRowR}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol mul">&times;</div></div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Receptance Weight
								<HelpPopover id="rkv-receptance-weight" placement="top">
									{`Transforms embedding vectors into Receptance vectors.`}
								</HelpPopover>
							</div>
							<div class="flex gap-0">
								<Matrix
									className="rkv-receptance-weight"
									data={receptanceWeightData}
									showSize={false}
									groupBy={'col'}
									cellHeight={3}
									cellWidth={3}
									rowGap={0}
									colorScale={rColorScale}
									highlightCol={highlightColR}
								/>
							</div>
							<div class="size">({$modelMeta.dimension}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator">
							<div class="symbol equal">=</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								R
								<HelpPopover id="rkv-r" placement="top">
									{`Receptance vectors control attention gating in RWKV.\nThese vectors determine how much information flows through each channel.`}
								</HelpPopover>
							</div>
							<div class="flex">
								<Matrix
									className="rkv-r"
									data={rData}
									showSize={false}
									cellHeight={rootRem * 0.8}
									cellWidth={2}
									rowGap={tokenGap}
									colorScale={rColorScale}
									onMouseOverCell={onMouseOverCellR}
									onMouseOutSvg={onMouseOutSvgR}
									highlightCol={highlightColR}
									highlightRow={highlightRowR}
								/>
							</div>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{:else if subTab3 === 1}
					<!-- K Tab -->
					<div class="flex items-center gap-4">
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xk
								<HelpPopover id="rkv-xk" placement="top">
									{`Mixed embedding input for key projection`}</HelpPopover>
							</div>
							<Matrix
								className="rkv-xk"
								data={xkData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightRow={highlightRowK}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol mul">&times;</div></div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Key Weight
								<HelpPopover id="rkv-key-weight" placement="top">
									{`Transforms embedding vectors into Key vectors.`}
								</HelpPopover>
							</div>
							<div class="flex gap-0">
								<Matrix
									className="rkv-key-weight"
									data={keyWeightData}
									showSize={false}
									groupBy={'col'}
									cellHeight={3}
									cellWidth={3}
									rowGap={0}
									colorScale={kColorScale}
									highlightCol={highlightColK}
								/>
							</div>
							<div class="size">({$modelMeta.dimension}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol equal">=</div></div>
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								K
								<HelpPopover id="rkv-k" placement="top">
									{`Key vectors contain information that can be retrieved.`}
								</HelpPopover>
							</div>
							<div class="flex">
								<Matrix
									className="rkv-k"
									data={kData}
									showSize={false}
									cellHeight={rootRem * 0.8}
									cellWidth={2}
									rowGap={tokenGap}
									colorScale={kColorScale}
									onMouseOverCell={onMouseOverCellK}
									onMouseOutSvg={onMouseOutSvgK}
									highlightCol={highlightColK}
									highlightRow={highlightRowK}
								/>
							</div>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{:else}
					<!-- V Tab -->
					<div class="flex items-center gap-4">
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								xv<HelpPopover id="rkv-xv" placement="top">
									{`Mixed embedding input for value projection`}</HelpPopover>
							</div>
							<Matrix
								className="rkv-xv"
								data={xvData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={embeddingColorScale}
								highlightRow={highlightRowV}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol mul">&times;</div></div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Value Weight
								<HelpPopover id="rkv-value-weight" placement="top">
									{`Transforms mixed embeddings into Value vectors.`}
								</HelpPopover>
							</div>
							<div class="flex gap-0">
								<Matrix
									className="rkv-value-weight"
									data={valueWeightData}
									showSize={false}
									groupBy={'col'}
									cellHeight={3}
									cellWidth={3}
									rowGap={0}
									colorScale={vColorScale}
									highlightCol={highlightColV}
								/>
							</div>
							<div class="size">({$modelMeta.dimension}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol equal">=</div></div>
						<div class="matrix flex flex-col items-center">
							<div class="tokens" style={`gap:${tokenGap}px`}>
								{#each $tokens as token, index}
									<div class="token-label"><span>{token}</span></div>
								{/each}
							</div>
						</div>
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								V
								<HelpPopover id="rkv-v" placement="top">
									{`Value vectors contain the actual information to be retrieved.`}
								</HelpPopover>
							</div>
							<div class="flex">
								<Matrix
									className="rkv-v"
									data={vData}
									showSize={false}
									cellHeight={rootRem * 0.8}
									cellWidth={2}
									rowGap={tokenGap}
									colorScale={vColorScale}
									onMouseOverCell={onMouseOverCellV}
									onMouseOutSvg={onMouseOutSvgV}
									highlightCol={highlightColV}
									highlightRow={highlightRowV}
								/>
							</div>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</WeightPopoverCard>

<style lang="scss">
	.weight-popover-content {
		padding: 3rem 3rem 3rem 1rem;
		gap: 0.2rem;
	}
	.operator {
		position: relative;
	}
	// .symbol.activation {
	// 	font-size: 0.8rem;
	// 	font-weight: 500;
	// }
	.matrix {
		.title {
			line-height: 1.1;
			text-align: center;
		}
	}
	// .formula {
	// 	padding: 0.8rem;
	// }
	.weight-popover-content.popover-vertical {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem 1rem 3rem 1rem;
		gap: 1rem; /* Reduced from 2rem to 1rem */
	}
	.tabs.tabs-horizontal {
		display: flex;
		flex-direction: row;
		gap: 0;
		margin-bottom: 0.2rem;
		width: 100%;
		justify-content: center;
		align-items: center;
	}
	.arrow {
		color: #8b5cf6;
		font-size: 1.2rem;
		font-weight: bold;
		margin: 0 0.75rem;
	}
	.sub-tabs.tabs-horizontal {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		margin-bottom: 2rem; /* Reduced from 1.5rem to 0.5rem */
		width: 100%;
		justify-content: center;
	}
	.sub-tabs.invisible {
		visibility: hidden;
	}
	.tab-btn {
		background: #f3f4f6;
		border: 1px solid #c084fc;
		cursor: pointer;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.85rem;
		text-align: center;
		white-space: nowrap;
		color: #7c3aed;
	}
	.tab-btn.active {
		background: #8b5cf6;
		color: white;
		border-color: #8b5cf6;
	}
	.sub-tab-btn {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.8rem;
		text-align: center;
		white-space: nowrap;
	}
	.sub-tab-btn.r-tab {
	background: #e0e7ff; /* light blue */
	border: 1px solid #8baadb;
	color: #3b82f6;
	}
	.sub-tab-btn.k-tab {
		background: #fef2f2;
		border: 1px solid #fca5a5;
		color: #dc2626;
	}
	.sub-tab-btn.v-tab {
		background: #f0fdf4;
		border: 1px solid #86efac;
		color: #16a34a;
	}
	.sub-tab-btn.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}
	.sub-tab-btn.r-tab.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}
	.sub-tab-btn.k-tab.active {
		background: #dc2626;
		color: white;
		border-color: #dc2626;
	}
	.sub-tab-btn.v-tab.active {
		background: #16a34a;
		color: white;
		border-color: #16a34a;
	}
	.step-content.step-content-vertical {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
