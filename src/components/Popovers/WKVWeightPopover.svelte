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
	
	// step 1: Pt, Qt
	$: ewData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: ektData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: vtData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	
	$: ptData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	// Pt-1
	$: pt1Data = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));

	$: qtData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	// Qt-1
	$: qt1Data = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));

	// step 2: WKVt
	$: euktData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));

	$: wkvtData = Array(tokenLen)
				.fill(0)
				.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
		
	// color scale for WKV
	const ewColorScale = (d: number) => {
		return d3.interpolate(theme.colors['red'][100], theme.colors['red'][400])(Math.abs(d));
	};
	const ektColorScale = (d: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(Math.abs(d));
	};
	const vtColorScale = (d: number) => {
		return d3.interpolate(theme.colors['green'][100], theme.colors['green'][400])(d);
	};
	
	const ptColorScale = (d: number) => {
		return d3.interpolate(theme.colors['indigo'][100], theme.colors['indigo'][400])(Math.abs(d));
	};
	const qtColorScale = (d: number) => {
		return d3.interpolate(theme.colors['indigo'][100], theme.colors['indigo'][400])(Math.abs(d));
	};	

	const euktColorScale = (d: number) => {
		return d3.interpolate(theme.colors['orange'][100], theme.colors['orange'][400])(Math.abs(d));
	};
	const wkvtColorScale = (d: number) => {
			return d3.interpolate(theme.colors['purple'][100], theme.colors['purple'][400])(d);
		};
		
	// animation
	let isAnimationActive = false;
	let progress = 0;
	// keep timeline non-null to avoid TS narrowing headaches
	let timeline: any = gsap.timeline();

	onMount(() => {
		timeline.eventCallback('onUpdate', () => {
			progress = timeline.progress();
			if (progress === 1) isAnimationActive = false;
		});

		setTimeout(() => {
			isAnimationActive = true;
			drawStep1p();
		}, 300);
	});

	onDestroy(() => {
		if (timeline) {
			// stop and cleanup timeline; keep variable defined to avoid later null checks
			timeline.kill();
		}
	});


	// Animation functions, bind tabs and sub-tabs
	const drawStep1p = () => {
		// Step1 Pt
		const ewRows = d3.selectAll('.weight-popover-content .wkv-ew g.g-row').nodes();
		const ektRows = d3.selectAll('.weight-popover-content .wkv-ekt g.g-row').nodes();
		const vtRows = d3.selectAll('.weight-popover-content .wkv-vt g.g-row').nodes();
		const ptRows = d3.selectAll('.weight-popover-content .wkv-pt g.g-row').nodes();
		const pt1Rows = d3.selectAll('.weight-popover-content .wkv-pt1 g.g-row').nodes();

		const mulSymbols = d3.selectAll('.weight-popover-content .operator .symbol.mul').nodes();
		const equalSymbol = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes()[0]; // [0] indicates the first element
		
		timeline.clear();
		const highlight = '#94a3b8';

		ptRows.forEach((row, rowIdx) => {
			const ewRects = d3.select(ewRows[rowIdx]).selectAll('rect').nodes();
			const ptRects = d3.select(ptRows[rowIdx]).selectAll('rect').nodes();
			const pt1Rects = d3.select(pt1Rows[rowIdx]).selectAll('rect').nodes();
			const ektRects = d3.select(ektRows[rowIdx]).selectAll('rect').nodes();
			const vtRects = d3.select(vtRows[rowIdx]).selectAll('rect').nodes();

			// Dim all elements first
			timeline.set(ewRects, { opacity: 0.1 });
			timeline.set(ptRects, { opacity: 0.1 });
			timeline.set(pt1Rects, { opacity: 0.1 });
			timeline.set(ektRects, { opacity: 0.1 });
			timeline.set(vtRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				ewRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, ptRects[i], pt1Rects[i], ektRects[i], vtRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, ptRects[i], pt1Rects[i], ektRects[i], vtRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				// Highlight operator 
				if (mulSymbols) {
					timeline.from(mulSymbols, { duration: 0.3, opacity: 1 }, '<');
				}
				if (equalSymbol) {
					timeline.from(equalSymbol, { duration: 0.3, opacity: 1 }, '<');
				}
			} else {
				// Highlight all elements in other rows
				timeline.fromTo(
					[ewRects, ptRects, pt1Rects, ektRects, vtRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep1q = () => {
		// Step2 Qt
		const ewRows = d3.selectAll('.weight-popover-content .wkv-ew g.g-row').nodes();
		const qtRows = d3.selectAll('.weight-popover-content .wkv-qt g.g-row').nodes();
		const qt1Rows = d3.selectAll('.weight-popover-content .wkv-qt1 g.g-row').nodes();
		const ektRows = d3.selectAll('.weight-popover-content .wkv-ekt g.g-row').nodes();

		const mulSymbols = d3.selectAll('.weight-popover-content .operator .symbol.mul').nodes();
		const equalSymbol = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes()[0];
        
		timeline.clear();
		const highlight = '#94a3b8';

		qtRows.forEach((row, rowIdx) => {
			const ewRects = d3.select(ewRows[rowIdx]).selectAll('rect').nodes();
			const qtRects = d3.select(qtRows[rowIdx]).selectAll('rect').nodes();
			const qt1Rects = d3.select(qt1Rows[rowIdx]).selectAll('rect').nodes();
			const ektRects = d3.select(ektRows[rowIdx]).selectAll('rect').nodes();

			// Dim all elements first
			timeline.set(ewRects, { opacity: 0.1 });
			timeline.set(qtRects, { opacity: 0.1 });
			timeline.set(qt1Rects, { opacity: 0.1 });
			timeline.set(ektRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				ewRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, qtRects[i], qt1Rects[i], ektRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, qtRects[i], qt1Rects[i], ektRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				// Highlight operator
				if (mulSymbols && mulSymbols.length) {
					timeline.from(mulSymbols, { duration: 0.3, opacity: 1 }, '<');
				}
				if (equalSymbol) {
					timeline.from(equalSymbol, { duration: 0.3, opacity: 1 }, '<');
				}
			} else {
				// Highlight all elements in other rows
				timeline.fromTo(
					[ewRects, qtRects, qt1Rects, ektRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	const drawStep2 = () => {
		// Step 2: WKV
		const ptRows = d3.selectAll('.weight-popover-content .wkv-pt g.g-row').nodes();
		const euktNumRows = d3.selectAll('.weight-popover-content .wkv-eukt-num g.g-row').nodes();
		const euktDenRows = d3.selectAll('.weight-popover-content .wkv-eukt-den g.g-row').nodes();
		const ktRows = d3.selectAll('.weight-popover-content .wkv-kt g.g-row').nodes();
		const qtRows = d3.selectAll('.weight-popover-content .wkv-qt g.g-row').nodes();
		const vtRows = d3.selectAll('.weight-popover-content .wkv-vt g.g-row').nodes();
		const wkvtRows = d3.selectAll('.weight-popover-content .wkv-wkvt g.g-row').nodes();

		const mulSymbol = d3.selectAll('.weight-popover-content .operator .symbol.mul').nodes();
		const equalSymbol = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();

		timeline.clear();
		const highlight = '#94a3b8';

		ptRows.forEach((row, rowIdx) => {
			const ptRects = d3.select(ptRows[rowIdx]).selectAll('rect').nodes();
			const qtRects = d3.select(qtRows[rowIdx])?.selectAll('rect').nodes() ?? [];
			const euktNumRects = d3.select(euktNumRows[rowIdx])?.selectAll('rect').nodes() ?? [];
			const euktDenRects = d3.select(euktDenRows[rowIdx])?.selectAll('rect').nodes() ?? [];
			const vtRects = d3.select(vtRows[rowIdx])?.selectAll('rect').nodes() ?? [];
			const wkvtRects = d3.select(wkvtRows[rowIdx]).selectAll('rect').nodes();

			// Dim all elements first (including two eukt)
			timeline.set(ptRects, { opacity: 0.1 });
			timeline.set(qtRects, { opacity: 0.1 });
			timeline.set([...euktNumRects, ...euktDenRects], { opacity: 0.1 });
			timeline.set(vtRects, { opacity: 0.1 });
			timeline.set(wkvtRects, { opacity: 0.1 });

			if (rowIdx === 0) {
				// Highlight each element in the first row synchronously
				wkvtRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, ptRects[i], euktNumRects[i], euktDenRects[i], qtRects[i], vtRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, ptRects[i], qtRects[i], vtRects[i], euktNumRects[i], euktDenRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				// Highlight operator
				if (mulSymbol) {
					timeline.from(mulSymbol, { duration: 0.3, opacity: 1 }, '<');
				}
				if (equalSymbol) {
					timeline.from(equalSymbol, { duration: 0.3, opacity: 1 }, '<');
				}
			} else {
				// Highlight all elements in other rows (including two eukt)
				timeline.fromTo(
					[ptRects, qtRects, euktNumRects, euktDenRects, vtRects, wkvtRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	// event
	let highlightColPt: number | undefined = undefined;
	let highlightRowPt: number | undefined = undefined;
	let highlightColQt: number | undefined = undefined;
	let highlightRowQt: number | undefined = undefined;
	let highlightColWKVt: number | undefined = undefined;
	let highlightRowWKVt: number | undefined = undefined;

	const onMouseOverCellPt = (e, d) => {
		if (isAnimationActive) return;
		highlightRowPt = d.rowIndex;
		highlightColPt = d.colIndex;
	};
	const onMouseOutSvgPt = () => {
		highlightColPt = undefined;
		highlightRowPt = undefined;
	};

	const onMouseOverCellQt = (e, d) => {
		if (isAnimationActive) return;
		highlightRowQt = d.rowIndex;
		highlightColQt = d.colIndex;
	};
	const onMouseOutSvgQt = () => {
		highlightColQt = undefined;
		highlightRowQt = undefined;
	};
	
	const onMouseOverCellWKVt = (e, d) => {
		if (isAnimationActive) return;
		highlightRowWKVt = d.rowIndex;
		highlightColWKVt = d.colIndex;
	};
	const onMouseOutSvgWKVt = () => {
		highlightColWKVt = undefined;
		highlightRowWKVt = undefined;
	};
	
	// Main tab index: 0 = Accumulate State, 1 = Compute WKV
	let tab = 0;
	// Sub tab index for "Accumulate State": 0 = P, 1 = Q
	let subTab = 0;
	const tabLabels = ["Accumulate State", "Compute WKV"];
	const subTabLabels = ["P", "Q"];

	// Trigger animation when switching tabs
	$: if (isAnimationActive) {
		if (tab === 0) {
			if (subTab === 0) drawStep1p();
				else drawStep1q();
		} else if (tab === 1) {
			drawStep2();
		}
	}

	function handleTabClick(idx: number) {
		// Reset sub-tab when switching to main tab 0
		tab = idx;
		if (tab === 0) subTab = 0; // reset subTab
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (tab === 1) {
				drawStep2();
			} else if (tab === 0) {
				if (subTab === 0) drawStep1p();
				else drawStep1q();
			}
		}, 100);
	}

	function handleSubTabClick(mainTab: number, subIdx: number) {
		// Update sub-tab only when mainTab === 0
		if (mainTab === 0) {
			subTab = subIdx;
		}
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (mainTab === 0) {
				if (subTab === 0) drawStep1p();
				else drawStep1q();
			}
		}, 100);
	}
</script>

<WeightPopoverCard
	id="tmix-wkv"
	title={'WKV Expansion'}
	bind:isAnimationActive
	{timeline}
>
	<div class="wkv-weight-popover weight-popover-content popover-vertical items-start justify-start">
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

		<!-- sub tabs for step 1 -->
		{#if tab === 0}
			<div class="sub-tabs tabs-horizontal">
				{#each subTabLabels as label, idx}
					<button
					class="sub-tab-btn"
					class:active={subTab === idx}
					class:p-tab={label === 'P'}
					class:q-tab={label === 'Q'}
					on:click={() => handleSubTabClick(0, idx)}
					>{label}</button>
				{/each}
			</div>
		{/if}

		<!-- step content -->
		<div class="step-content step-content-vertical">
			{#if tab === 0}
				<!-- Step 1: Accumulate State -->
				{#if subTab === 0}
					<!-- Pt -->
					<div class="flex items-center gap-4">
						<!-- w -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^-w
								<HelpPopover id="wkv-ew" placement="top">
									{`weight decay`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-ew"
								data={ewData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ewColorScale}
								highlightCol={highlightColPt}
								highlightRow={highlightRowPt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- P t-1 -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								P t-1
								<HelpPopover id="wkv-pt1" placement="top">
									{`Previous accumulated state (P at previous time step)`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-pt1"
								data={pt1Data}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ptColorScale}
								highlightCol={highlightColPt}
								highlightRow={highlightRowPt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- e^kt-1 -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^kt-1
								<HelpPopover id="wkv-ekt" placement="top">
									{`Exponential of key at previous time step`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-ekt"
								data={ektData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ektColorScale}
								highlightCol={highlightColPt}
								highlightRow={highlightRowPt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>

						<!-- vt-1 -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								vt-1
								<HelpPopover id="wkv-vt" placement="top">
									{`Value at previous time step`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-vt"
								data={vtData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={vtColorScale}
								highlightCol={highlightColPt}
								highlightRow={highlightRowPt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- Pt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Pt
								<HelpPopover id="wkv-pt" placement="top">
									{`Pt = Weighted sum of previous state and current input`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-pt"
								data={ptData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ptColorScale}
								onMouseOverCell={onMouseOverCellPt}
								onMouseOutSvg={onMouseOutSvgPt}
								highlightCol={highlightColPt}
								highlightRow={highlightRowPt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{:else}
					<!-- Qt -->
					<div class="flex items-center gap-4">
						<!-- w -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^-w
								<HelpPopover id="wkv-ew" placement="top">
									{`weight decay`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-ew"
								data={ewData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ewColorScale}
								highlightCol={highlightColQt}
								highlightRow={highlightRowQt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>
						
						<!-- Q t-1 -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Q t-1
								<HelpPopover id="wkv-qt1" placement="top">
									{`Previous normalization state (Q at previous time step)`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-qt1"
								data={qt1Data}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={qtColorScale}
								highlightCol={highlightColQt}
								highlightRow={highlightRowQt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- e^kt-1 -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^kt-1
								<HelpPopover id="wkv-ekt" placement="top">
									{`Exponential of key at previous time step`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-ekt"
								data={ektData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ektColorScale}
								highlightCol={highlightColQt}
								highlightRow={highlightRowQt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
						
						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- Qt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Qt
								<HelpPopover id="wkv-qt" placement="top">
									{`Qt = Weighted sum of previous normalization state and current input`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-qt"
								data={qtData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={qtColorScale}
								onMouseOverCell={onMouseOverCellQt}
								onMouseOutSvg={onMouseOutSvgQt}
								highlightCol={highlightColQt}
								highlightRow={highlightRowQt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
				{/if}
			{/if}
			{#if tab === 1}
				<!-- Step 2: Compute WKV -->
				 <!-- WKVt -->
					<div class="flex items-center gap-4">
						<!-- (Pt + e^u+kt ⊙ vt) -->
						<div class="operator"><div class="symbol">(</div></div>
						
						<!-- Pt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Pt
								<HelpPopover id="wkv-pt" placement="top">
									{`Previous accumulated state`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-pt"
								data={ptData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={ptColorScale}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>
						
						<!-- e^u+kt (numerator) -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^u+kt
								<HelpPopover id="wkv-eukt-num" placement="top">
									{`Exponential of u+k`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-eukt-num"
								data={euktData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={euktColorScale}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">⊙</div></div>

						<!-- vt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								vt
								<HelpPopover id="wkv-vt" placement="top">
									{`Value at time t`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-vt"
								data={vtData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={vtColorScale}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol">)</div></div>
						
						<div class="operator"><div class="symbol">/</div></div>
						
						<div class="operator"><div class="symbol">(</div></div>

						<!-- Qt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								Qt
								<HelpPopover id="wkv-qt" placement="top">
									{`Normalization state`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-qt"
								data={qtData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={qtColorScale}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol mul">&plus;</div></div>

						<!-- e^u+kt (denominator) -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								e^u+kt
								<HelpPopover id="wkv-eukt-den" placement="top">
									{`Exponential of u+k`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-eukt-den"
								data={euktData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={euktColorScale}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol">)</div></div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- WKVt -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								WKVt
								<HelpPopover id="wkv-wkvt" placement="top">
									{`Final WKV output`}
								</HelpPopover>
							</div>
							<Matrix
								className="wkv-wkvt"
								data={wkvtData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={wkvtColorScale}
								onMouseOverCell={onMouseOverCellWKVt}
								onMouseOutSvg={onMouseOutSvgWKVt}
								highlightCol={highlightColWKVt}
								highlightRow={highlightRowWKVt}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>
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
/* .sub-tabs.invisible { visibility: hidden; } */
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
	.sub-tab-btn.p-tab {
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
	.sub-tab-btn.p-tab.active {
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
/* Increase spacing between tabs and step-content when tab 2 is active */
.tabs.tabs-horizontal + .step-content.step-content-vertical {
	margin-top: 2.5rem;
}
</style>
