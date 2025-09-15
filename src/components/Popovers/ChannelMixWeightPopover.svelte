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
	const visibleDimension = 15;

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

	// Step 2: Mix for r, k
	$: trRow = Array(visibleDimension).fill(0).map(() => Math.random());
	$: trData = Array(tokenLen).fill(trRow);
	$: tr1Data = trData.map(row => row.map(v => 1 - v));

	$: tkRow = Array(visibleDimension).fill(0).map(() => Math.random());
	$: tkData = Array(tokenLen).fill(tkRow);
	$: tk1Data = tkData.map(row => row.map(v => 1 - v));
	
	$: xrData = xData.map((row, i) =>
		row.map((v, j) =>
			v * trData[i][j] + xxData[i][j] * (1 - trData[i][j])
		)
	);
	$: xkData = xData.map((row, i) =>
		row.map((v, j) =>
			v * tkData[i][j] + xxData[i][j] * (1 - tkData[i][j])
		)
	);
	
	// Step 3: Projections
	// r, k weights
	const receptanceWeightData = Array(visibleDimension)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);
	
	const keyWeightData = Array(visibleDimension * 4)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);
	
	// r, k data
	$: rData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: kData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension * 4).fill(0).map(() => Math.random()));
	
	// color scale for embedding
	const embeddingColorScale = (d: number, i: any) => {
		return d3.interpolate(theme.colors['gray'][100], theme.colors['gray'][400])(d);
	};

	// color scales for r, k
	const rColorScale = (d: number, i: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};

	const kColorScale = (d: number, i: number) => {
		return d3.interpolate(theme.colors['red'][100], theme.colors['red'][400])(d);
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
		// Step 1: time_shift(x) - First row element-wise highlight, other rows overall highlight
		const xRows = d3.selectAll('.weight-popover-content .cmix-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .cmix-xx g.g-row').nodes();
		
		timeline.clear();
		
		const highlight = '#94a3b8';

		// First row animation
		const firstXRowRects = d3.select(xRows[0]).selectAll('rect').nodes();
		const firstXXRowRects = d3.select(xxRows[0]).selectAll('rect').nodes();

		// 1. Dim x row and xx row
		timeline.set(firstXRowRects, { opacity: 0.1 });
		timeline.set(firstXXRowRects, { opacity: 0.1 });
		// 2. Highlight each x row rect and synchronize highlight for corresponding xx row rect
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

		// 6. Output rect highlight
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

		// Rest row animation
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
		// Step 2 R: Mix for r - x * time_mix_r + time_shift(x) * (1 - time_mix_r)
		const xRows = d3.selectAll('.weight-popover-content .cmix-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .cmix-xx g.g-row').nodes();
		const trRows = d3.selectAll('.weight-popover-content .cmix-tr g.g-row').nodes();
		const tr1Rows = d3.selectAll('.weight-popover-content .cmix-tr1 g.g-row').nodes();
		const xrRows = d3.selectAll('.weight-popover-content .cmix-xr g.g-row').nodes();
				
		timeline.clear();
		const highlight = '#94a3b8';

		xrRows.forEach((row, rowIdx) => {
			const xRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();
			const xxRects = d3.select(xxRows[rowIdx]).selectAll('rect').nodes();
			const trRects = d3.select(trRows[rowIdx]).selectAll('rect').nodes();
			const tr1Rects = d3.select(tr1Rows[rowIdx]).selectAll('rect').nodes();
			const xrRects = d3.select(xrRows[rowIdx]).selectAll('rect').nodes();

			// Dim all first
			timeline.set(xRects, { opacity: 0.1 });
			timeline.set(xxRects, { opacity: 0.1 });
			timeline.set(trRects, { opacity: 0.1 });
			timeline.set(tr1Rects, { opacity: 0.1 });
			timeline.set(xrRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// First row: highlight each element synchronously
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
				// Other rows: highlight all together
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
		// Step 2 K: Mix for k - x * time_mix_k + time_shift(x) * (1 - time_mix_k)
		const xRows = d3.selectAll('.weight-popover-content .cmix-x g.g-row').nodes();
		const xxRows = d3.selectAll('.weight-popover-content .cmix-xx g.g-row').nodes();
		const tkRows = d3.selectAll('.weight-popover-content .cmix-tk g.g-row').nodes();
		const tk1Rows = d3.selectAll('.weight-popover-content .cmix-tk1 g.g-row').nodes();
		const xkRows = d3.selectAll('.weight-popover-content .cmix-xk g.g-row').nodes();
				
		timeline.clear();
		const highlight = '#94a3b8';

		xkRows.forEach((row, rowIdx) => {
			const xRects = d3.select(xRows[rowIdx]).selectAll('rect').nodes();
			const xxRects = d3.select(xxRows[rowIdx]).selectAll('rect').nodes();
			const tkRects = d3.select(tkRows[rowIdx]).selectAll('rect').nodes();
			const tk1Rects = d3.select(tk1Rows[rowIdx]).selectAll('rect').nodes();
			const xkRects = d3.select(xkRows[rowIdx]).selectAll('rect').nodes();

			// Dim all first
			timeline.set(xRects, { opacity: 0.1 });
			timeline.set(xxRects, { opacity: 0.1 });
			timeline.set(tkRects, { opacity: 0.1 });
			timeline.set(tk1Rects, { opacity: 0.1 });
			timeline.set(xkRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// First row: highlight each element synchronously
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
				// Other rows: highlight all together
				timeline.fromTo(
					[xRects, xxRects, tkRects, tk1Rects, xkRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep3r = () => {
		// Step 3 R: Projections for r - r = Linear(xr)
		const xrRows = d3.selectAll('.weight-popover-content .cmix-xr g.g-row').nodes();
		const receptanceWeightCols = d3.selectAll('.weight-popover-content .cmix-receptance-weight g.g-col').nodes();
		const rRows = d3.selectAll('.weight-popover-content .cmix-r g.g-row').nodes();
		
		const equalSymbol = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		const firstXRRowRects = d3.select(xrRows[0]).selectAll('rect').nodes();
		const firstRRowRects = d3.select(rRows[0]).selectAll('rect').nodes();

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
					equalSymbol,
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

		// Output vectors
		rRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const xrRowRects = d3.select(xrRows[rowIdx]).selectAll('rect').nodes();
			const rCells = d3.select(row).selectAll('rect').nodes();

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
					.selectAll('.weight-popover-content .cmix-receptance-weight g.g-col rect')
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
		const xkRows = d3.selectAll('.weight-popover-content .cmix-xk g.g-row').nodes();
		const keyWeightCols = d3.selectAll('.weight-popover-content .cmix-key-weight g.g-col').nodes();
		const kRows = d3.selectAll('.weight-popover-content .cmix-k g.g-row').nodes();
		
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

		// Output vectors
		kRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const kvCells = d3.select(row).selectAll('rect').nodes();
			const kReLURowRects = d3.select(xkRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					kReLURowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const keyWeightColRects = d3
					.selectAll('.weight-popover-content .cmix-key-weight g.g-col rect')
					.nodes();
				timeline.set(keyWeightColRects, { opacity: 0.1 });
			}

			kvCells.forEach((d, colIdx) => {
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

	// event
	let highlightColxr: number | undefined = undefined;
	let highlightRowxr: number | undefined = undefined;
	let highlightColxk: number | undefined = undefined;
	let highlightRowxk: number | undefined = undefined;

	let highlightColR: number | undefined = undefined;
	let highlightRowR: number | undefined = undefined;
	let highlightColK: number | undefined = undefined;
	let highlightRowK: number | undefined = undefined;

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

	let tab = 0; // 0: Step1, 1: Step2, 2: Step3
	let subTab2 = 0; // 0: R, 1: K for Step 2
	let subTab3 = 0; // 0: R, 1: K for Step 3
	const tabLabels = [
		"Step 1: time_shift(x)",
		"Step 2: Mix for r, k",
		"Step 3: Projections for r, k"
	];
	const subTabLabels2 = ["R", "K"];
	const subTabLabels3 = ["R", "K"];

	// Trigger animation when switching tabs
	$: if (isAnimationActive) {
		if (tab === 0) {
			drawStep1();
		} else if (tab === 1) {
			if (subTab2 === 0) drawStep2r();
			else drawStep2k();
		} else if (tab === 2) {
			if (subTab3 === 0) drawStep3r();
			else drawStep3k();
		}
	}

	// Trigger animation when switching sub-tabs
	$: if (isAnimationActive && (tab === 1 || tab === 2)) {
		if (tab === 1) {
			if (subTab2 === 0) drawStep2r();
			else drawStep2k();
		} else if (tab === 2) {
			if (subTab3 === 0) drawStep3r();
			else drawStep3k();
		}
	}

	function handleTabClick(idx) {
		tab = idx;
		if (tab === 1) subTab2 = 0; // Reset sub-tab
		if (tab === 2) subTab3 = 0; // Reset sub-tab
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (tab === 0) {
				drawStep1();
			} else if (tab === 1) {
				if (subTab2 === 0) drawStep2r();
				else drawStep2k();
			} else if (tab === 2) {
				if (subTab3 === 0) drawStep3r();
				else drawStep3k();
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
				else drawStep2k();
			} else if (mainTab === 3) {
				if (subTab3 === 0) drawStep3r();
				else drawStep3k();
			}
		}, 100);
	}
</script>

<WeightPopoverCard id="cmix-up" title={'ChannelMix Expansion'} bind:isAnimationActive {timeline}>
	<div class="cmix-up-popover weight-popover-content popover-vertical items-start justify-start">
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
					on:click={() => handleSubTabClick(3, idx)}
					>{label}</button>
				{/each}
			</div>
		{/if}

		<!-- step content -->
		<div class="step-content step-content-vertical">
			{#if tab === 0}
				<!-- Step 1: time_shift(x) -->
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

						<!-- Embeddings -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Embeddings
								<HelpPopover id="cmix-x" placement="top">
									{`Embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<!-- (tokenLen, 768) -->
							<Matrix
								className="cmix-x"
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
								<HelpPopover id="cmix-xx" placement="top">
									{`Shifted embeddings transformed through attention mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-xx"
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
			{#if tab === 1}
				<!-- Step 2: Mix for r, k -->
				{#if subTab2 === 0}
					<!-- R Tab -->
					<div class="flex items-center gap-4">
						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								x
								<HelpPopover id="cmix-x" placement="top">
									{`Embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-x"
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
								<HelpPopover id="cmix-tr" placement="top">
									{`balance the mix between x and xx`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-tr"
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
								<HelpPopover id="cmix-xx" placement="top">
									{`Shifted embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-xx"
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
								<HelpPopover id="cmix-tr1" placement="top">
									{`1 - time_mix_r is used to balance the mix between x and xx.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-tr1"
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
								<HelpPopover id="cmix-xr" placement="top">
									{`xr = x * time_mix_r + xx * (1 - time_mix_r)`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-xr"
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
				{:else}
					<!-- K Tab -->
					<div class="flex items-center gap-4">
						<!-- x -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								x
								<HelpPopover id="cmix-x" placement="top">
									{`Embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-x"
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
								<HelpPopover id="cmix-tk" placement="top">
									{`balance the mix between x and xx`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-tk"
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
								<HelpPopover id="cmix-xx" placement="top">
									{`Shifted embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-xx"
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
								<HelpPopover id="cmix-tk1" placement="top">
									{`1 - time_mix_k is used to balance the mix between xk and xx.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-tk1"
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
								<HelpPopover id="cmix-xk" placement="top">
									{`xk = x * time_mix_k + xx * (1 - time_mix_k)`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-xk"
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
				{/if}
			{/if}
			{#if tab === 2}
				<!-- Step 3: Projections for r, k -->
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
								xr<HelpPopover id="cmix-xr" placement="top">
									{`mixed embedding`}</HelpPopover>
							</div>
							<Matrix
								className="cmix-xr"
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
								<HelpPopover id="cmix-receptance-weight" placement="top">
									{`Transforms embedding vectors into Receptance vectors.`}
								</HelpPopover>
							</div>
							<Matrix
									className="cmix-receptance-weight"
									data={receptanceWeightData}
									showSize={false}
									groupBy={'col'}
									cellHeight={3}
									cellWidth={3}
									rowGap={0}
									colorScale={rColorScale}
									highlightCol={highlightColR}
								/>

							<div class="size">({$modelMeta.dimension}, {$modelMeta.dimension})</div>
						</div>
						<div class="operator"><div class="symbol equal">=</div></div>
						
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								R
								<HelpPopover id="cmix-r" placement="top">
									{`R = Linear(xr)`}
								</HelpPopover>
							</div>
							<div class="flex">
								<Matrix
									className="cmix-r"
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
				
				{:else}
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
								<HelpPopover id="cmix-xk" placement="top">
									{`mixed embedding`}</HelpPopover>
							</div>
							<Matrix
								className="cmix-xk"
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
								<HelpPopover id="cmix-key-weight" placement="top">
									{`Transforms embedding vectors into Key vectors.`}
								</HelpPopover>
							</div>
							<div class="flex gap-0">
								<Matrix
									className="cmix-key-weight"
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
							<div class="size">({$modelMeta.dimension}, {$modelMeta.dimension * 4})</div>
						</div>
						<div class="operator"><div class="symbol equal">=</div></div>
						
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								K
								<HelpPopover id="cmix-k" placement="top">
									{`K = Linear(xk)`}
								</HelpPopover>
							</div>
							<div class="flex">
								<Matrix
									className="cmix-k"
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
							<div class="size">({tokenLen}, {$modelMeta.dimension * 4})</div>
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
	.matrix {
		.title {
			line-height: 1.1;
			text-align: center;
		}
	}
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
		background: #e0e7ff; /* Light blue */
		border: 1px solid #8baadb;
		color: #3b82f6;
	}
	.sub-tab-btn.k-tab {
		background: #fef2f2;
		border: 1px solid #fca5a5;
		color: #dc2626;
	}
	.tab-btn.active {
		background: #8b5cf6;
		color: white;
		border-color: #8b5cf6;
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
	.step-content.step-content-vertical {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
