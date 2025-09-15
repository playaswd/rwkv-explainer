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
	const visibleDimension = 15;
	$: tokenLen = $tokens.length;

	// r, k, v data
	$: kReLUData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension * 4).fill(0).map(() => Math.random()));
	const valueWeightData = Array(visibleDimension)
		.fill(0)
		.map((col) =>
			Array(visibleDimension * 4)
				.fill(0)
				.map((d) => Math.random())
		);
	$: kvData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: rData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: rkvData = Array(tokenLen)
		.fill(0)
		.map((col) => Array(visibleDimension).fill(0).map((d) => Math.random()));

	// color scale
	const rColorScale = (d: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};
	const kColorScale = (d: number) => {
		return d3.interpolate(theme.colors['red'][100], theme.colors['red'][400])(d);
	};
	const vColorScale = (d: number) => {
		return d3.interpolate(theme.colors['green'][100], theme.colors['green'][400])(d);
	};
	const kvColorScale = (d: number) => {
		return d3.interpolate(theme.colors['purple'][100], theme.colors['purple'][400])(d);
	};
	const rkvColorScale = (d: number) => {
		return d3.interpolate(theme.colors['indigo'][100], theme.colors['indigo'][400])(d);
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
		}
	});

	// Step animation functions
	const drawStep1 = () => {
		// Step 1: kReLU, Value Weight, kv row-by-row highlight animation
		const kReLURows = d3.selectAll('.weight-popover-content .cmix-kReLU g.g-row').nodes();
		const valueWeightCols = d3.selectAll('.weight-popover-content .cmix-value-weight g.g-col').nodes();
		const kvRows = d3.selectAll('.weight-popover-content .cmix-kv g.g-row').nodes();

		const equalSymbol = d3.selectAll('.weight-popover-content .operator .symbol.equal').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		// First row detail animation
		const firstKReLURowRects = d3.select(kReLURows[0]).selectAll('rect').nodes();
		const firstKVRowRects = d3.select(kvRows[0]).selectAll('rect').nodes();

		firstKVRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(valueWeightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstKReLURowRects, { opacity: 0.1 });

			firstKReLURowRects.forEach((kReLURect, i) => {
				// Embedding
				timeline
					.fromTo(
						kReLURect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						kReLURect,
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);

				// Weights
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

			// Symbol
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

			// Output
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

		// Rest row animation
		let previousRowIdx = 0;

		// Output vectors
		kvRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const kReLURowRects = d3.select(kReLURows[rowIdx]).selectAll('rect').nodes();
			const kvCells = d3.select(row).selectAll('rect').nodes();

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

				const valueWeightColRects = d3
					.selectAll('.weight-popover-content .cmix-value-weight g.g-col rect')
					.nodes();
				timeline.set(valueWeightColRects, { opacity: 0.1 });
			}

			kvCells.forEach((d, colIdx) => {
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

	const drawStep2 = () => {
		// Step 2: r and Sigmoid r row-by-row highlight animation, emphasizing the "→" symbol
		const rRows = d3.selectAll('.weight-popover-content .cmix-r g.g-row').nodes();
		const srRows = d3.selectAll('.weight-popover-content .cmix-sr g.g-row').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';

		// First row animation
		const firstRRowRects = d3.select(rRows[0]).selectAll('rect').nodes();
		const firstSRRowRects = d3.select(srRows[0]).selectAll('rect').nodes();

		// 1. Dim r row and sr row
		timeline.set(firstRRowRects, { opacity: 0.1 });
		timeline.set(firstSRRowRects, { opacity: 0.1 });
		// 2. Highlight each r row rect and synchronize highlight for corresponding sr row rect
		firstRRowRects.forEach((rect, i) => {
			timeline
				.fromTo(
					[rect, firstSRRowRects[i]],
					{ opacity: 0.1, strokeWidth: 0 },
					{ opacity: 1, duration: 0.1, strokeWidth: 10, stroke: highlight }
				)
				.to(
					[rect, firstSRRowRects[i]],
					{ strokeWidth: 0, duration: 0.1 },
					'<50%'
				);
		});

		// 4. Dim sr row
		timeline.set(firstSRRowRects, { opacity: 0.1 });

		// 5. Highlight each sr row rect
		firstSRRowRects.forEach((rect, i) => {
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
		firstSRRowRects.forEach((outputRect, outCellIdx) => {
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
		srRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;
			const outputCells = d3.select(row).selectAll('rect').nodes();
			const embeddingRowRects = d3.select(rRows[rowIdx]).selectAll('rect').nodes();

			// Dim r row
			timeline.set(embeddingRowRects, { opacity: 0.1 });
			// Highlight r row
			embeddingRowRects.forEach((rect, i) => {
				timeline
					.fromTo(rect, { opacity: 0.1, strokeWidth: 0 }, { opacity: 1, duration: 0.01, strokeWidth: 10, stroke: highlight })
					.to(rect, { strokeWidth: 0, duration: 0.01 }, '<50%');
			});
			// Dim sr row
			timeline.set(outputCells, { opacity: 0.1 });
			// Highlight sr row
			outputCells.forEach((rect, i) => {
				timeline
					.fromTo(rect, { opacity: 0.1, strokeWidth: 0 }, { opacity: 1, duration: 0.01, strokeWidth: 10, stroke: highlight }, '<-50%')
					.to(rect, { strokeWidth: 0, duration: 0.01 }, '<50%');
			});
			previousRowIdx = rowIdx;
		});
	};

	const drawStep3 = () => {
		// Step 3: Sigmoid r, kv, rkv row-by-row highlight animation, emphasizing "*" and "=" symbols
		const srRows = d3.selectAll('.weight-popover-content .cmix-sr g.g-row').nodes();
		const kvRows = d3.selectAll('.weight-popover-content .cmix-kv g.g-row').nodes();
		const rkvRows = d3.selectAll('.weight-popover-content .cmix-rkv g.g-row').nodes();
		
		timeline.clear();

		const highlight = '#94a3b8';
		srRows.forEach((row, rowIdx) => {
			const srRects = d3.select(row).selectAll('rect').nodes();
			const kvRects = d3.select(kvRows[rowIdx]).selectAll('rect').nodes();
			const rkvRects = d3.select(rkvRows[rowIdx]).selectAll('rect').nodes();
			// Dim all first
			timeline.set(srRects, { opacity: 0.1 });
			timeline.set(kvRects, { opacity: 0.1 });
			timeline.set(rkvRects, { opacity: 0.1 });
			if (rowIdx === 0) {
				// First row element-wise synchronized highlight
				srRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, kvRects[i], rkvRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, kvRects[i], rkvRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});

			} else {
				// Other rows overall highlight
				timeline.fromTo(
					[srRects, kvRects, rkvRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	// Event handlers
	let highlightColKV: number | undefined = undefined;
	let highlightRowKV: number | undefined = undefined;

	let highlightColsr: number | undefined = undefined;
	let highlightRowsr: number | undefined = undefined;

	let highlightColrkv: number | undefined = undefined;
	let highlightRowrkv: number | undefined = undefined;

	const onMouseOverCellKV = (e, d) => {
		if (isAnimationActive) return;
		highlightRowKV = d.rowIndex;
		highlightColKV = d.colIndex;
	};
	const onMouseOutSvgKV = () => {
		highlightColKV = undefined;
		highlightRowKV = undefined;
	};

	const onMouseOverCellsr = (e, d) => {
		if (isAnimationActive) return;
		highlightRowsr = d.rowIndex;
		highlightColsr = d.colIndex;
	};
	const onMouseOutSvgsr = () => {
		highlightColsr = undefined;
		highlightRowsr = undefined;
	};

	const onMouseOverCellrkv = (e, d) => {
		if (isAnimationActive) return;
		highlightRowrkv = d.rowIndex;
		highlightColrkv = d.colIndex;
	};
	const onMouseOutSvgrkv = () => {
		highlightColrkv = undefined;
		highlightRowrkv = undefined;
	};

	let tab = 0; // 0: Step 1, 1: Step 2, 2: Step 3
	const tabLabels = [
		"Step 1: Value Projection",
		"Step 2: Sigmoid r",
		"Step 3: ChannelMix Output"
	];

	// Trigger animation when switching tabs
	$: if (isAnimationActive) {
		if (tab === 0) drawStep1();
		else if (tab === 1) drawStep2();
		else if (tab === 2) drawStep3();
	}

	function handleTabClick(idx) {
		tab = idx;
		isAnimationActive = true;
		timeline.clear();
		setTimeout(() => {
			if (tab === 0) drawStep1();
			else if (tab === 1) drawStep2();
			else if (tab === 2) drawStep3();
		}, 100);
	}
</script>

<WeightPopoverCard id="cmix-down" title={'ChannelMix Compression'} bind:isAnimationActive {timeline}>
	<div class="cmix-down-popover weight-popover-content popover-vertical items-start justify-start">
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

		<!-- step content -->
		<div class="step-content step-content-vertical">
			{#if tab === 0}
				<!-- Step 1: V(ReLU^2(k)) -->
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
							kReLU<HelpPopover id="cmix-kReLU" placement="top">
								{`Embedding vectors after non-linear transformation (ReLU^2) of k.`}</HelpPopover>
						</div>
						<div class="flex">
							<Matrix
								className="cmix-kReLU"
								data={kReLUData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={kColorScale}
								highlightRow={highlightRowKV}
							/>
						</div>
						<div class="size">({tokenLen}, {$modelMeta.dimension * 4})</div>
					</div>
					<div class="operator">
						<div class="symbol mul">&times;</div>
					</div>
					<div class="matrix flex flex-col items-center">
						<div class="title flex items-center gap-1">
							Value Weight
							<HelpPopover id="cmix-value-weight" placement="top">
								{`Value projection weight matrix that transforms the expanded kReLU features back to the original embedding dimension.`}
							</HelpPopover>
						</div>
						<div class="flex gap-0">
							<Matrix
								className="cmix-value-weight"
								data={valueWeightData}
								showSize={false}
								groupBy={'col'}
								cellHeight={3}
								cellWidth={3}
								rowGap={0}
								colorScale={vColorScale}
								highlightCol={highlightColKV}
							/>
						</div>
						<div class="size">({$modelMeta.dimension * 4}, {$modelMeta.dimension})</div>
					</div>
					<div class="operator">
						<div class="symbol equal px-4">=</div>
					</div>

					<div class="matrix flex flex-col items-center">
						<div class="title flex items-center gap-1">
							kv
							<HelpPopover id="cmix-kv" placement="top">
								{`The resulting key-value representations after applying the value projection to the transformed keys.`}
							</HelpPopover>
						</div>
						<div class="flex">
							<Matrix
								className="cmix-kv"
								data={kvData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={kvColorScale}
								onMouseOverCell={onMouseOverCellKV}
								onMouseOutSvg={onMouseOutSvgKV}
								highlightCol={highlightColKV}
								highlightRow={highlightRowKV}
							/>
						</div>
						<div class="size">
							({tokenLen}, {$modelMeta.dimension})
						</div>
					</div>
				</div>
			{/if}

			{#if tab === 1}
				<!-- Step 2: sigmoid r -->
				<div class="flex items-center gap-4">
					<!-- Tokens -->
					<div class="matrix flex flex-col items-center">
						<div class="tokens" style={`gap:${tokenGap}px`}>
							{#each $tokens as token, index}
								<div class="token-label"><span>{token}</span></div>
							{/each}
						</div>
					</div>

					<!-- r -->
					<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								R
								<HelpPopover id="cmix-r" placement="top">
									{`Embeddings transformed through timemix mechanism.`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-r"
								data={rData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={rColorScale}
								highlightCol={highlightColsr}
								highlightRow={highlightRowsr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
					</div>

					<div class="operator">
						<div class="symbol">→</div>
					</div>

					<div class="matrix flex flex-col items-center">
						<div class="title flex items-center gap-1">
							Sigmoid R
							<HelpPopover id="cmix-sr" placement="top">{``}</HelpPopover>
						</div>
							<Matrix
								className="cmix-sr"
								data={rData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={rColorScale}
								onMouseOverCell={onMouseOverCellsr}
								onMouseOutSvg={onMouseOutSvgsr}
								highlightCol={highlightColsr}
								highlightRow={highlightRowsr}
							/>
							<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>
				
			{/if}

			{#if tab === 2}
				<!-- Step 3: rkv -->
				<div class="flex items-center gap-4">
					<!-- sr -->
					<div class="matrix flex flex-col items-center">
						<div class="tokens" style={`gap:${tokenGap}px`}>
							{#each $tokens as token, index}
								<div class="token-label"><span>{token}</span></div>
							{/each}
						</div>
					</div>
					
					<div class="matrix flex flex-col items-center">
						<div class="title flex items-center gap-1">
							Sigmoid R
							<HelpPopover id="cmix-sr" placement="top">{``}</HelpPopover>
						</div>
						<Matrix
							className="cmix-sr"
							data={rData}
							showSize={false}
							cellHeight={rootRem * 0.8}
							cellWidth={2}
							rowGap={tokenGap}
							colorScale={rColorScale}
							highlightCol={highlightColrkv}
							highlightRow={highlightRowrkv}
						/>
						<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

					<div class="operator"><div class="symbol mul">⊙</div></div>
					
					<!-- kv -->
					<div class="matrix flex flex-col items-center">
						<div class="title flex items-center gap-1">
							kv
							<HelpPopover id="cmix-kv" placement="top">
								{``}
							</HelpPopover>
						</div>
						<Matrix
							className="cmix-kv"
							data={kvData}
							showSize={false}
							cellHeight={rootRem * 0.8}
							cellWidth={2}
							rowGap={tokenGap}
							colorScale={kvColorScale}
							highlightCol={highlightColrkv}
							highlightRow={highlightRowrkv}
						/>
						<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
						</div>

						<div class="operator"><div class="symbol equal">=</div></div>

						<!-- out -->
						<div class="matrix flex flex-col items-center">
							<div class="title flex items-center gap-1">
								rkv
								<HelpPopover id="cmix-rkv" placement="top">
									{`r*kv=rkv`}
								</HelpPopover>
							</div>
							<Matrix
								className="cmix-rkv"
								data={rkvData}
								showSize={false}
								cellHeight={rootRem * 0.8}
								cellWidth={2}
								rowGap={tokenGap}
								colorScale={rkvColorScale}
								onMouseOverCell={onMouseOverCellrkv}
								onMouseOutSvg={onMouseOutSvgrkv}
								highlightCol={highlightColrkv}
								highlightRow={highlightRowrkv}
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
		gap: 3rem; /* Reduced from 2rem to 1rem */
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
	.step-content.step-content-vertical {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
