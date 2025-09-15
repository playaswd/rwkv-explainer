<script lang="ts">
	import { 
		modelMeta, 
		tokens, 
		rootRem 
	} from '~/store';
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
	const visibleDimension = 8;

	$: tokenLen = $tokens.length;
	
	// Generate data
	$: srData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: wkvData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: rwkvData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	
	// Color scales
	const srColorScale = (d: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};
	const wkvColorScale = (d: number) => {
		return d3.interpolate(theme.colors['yellow'][100], theme.colors['yellow'][400])(d);
	};
	const rwkvColorScale = (d: number) => {
		return d3.interpolate(theme.colors['indigo'][100], theme.colors['indigo'][400])(d);
	};

	// Animation
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
			draw();
		}, 300);
	});

	onDestroy(() => {
		if (timeline) {
			timeline.kill();
			timeline = null;
		}
	});

	const draw = () => {
		// Animate row-wise highlighting for Sigmoid, WKV, and RWKV matrices, emphasizing the "*" and "=" symbols
		const srRows = d3.selectAll('.weight-popover-content .tmix-sr g.g-row').nodes();
		const wkvRows = d3.selectAll('.weight-popover-content .tmix-wkv g.g-row').nodes();
		const rwkvRows = d3.selectAll('.weight-popover-content .tmix-rwkv g.g-row').nodes();

		const mulSymbol = d3.select('.weight-popover-content .operator .symbol.mul').node();
		const equalSymbol = d3.select('.weight-popover-content .operator .symbol.equal').node();
		timeline.clear();

		const highlight = '#94a3b8';
		srRows.forEach((row, rowIdx) => {
			const srRects = d3.select(row).selectAll('rect').nodes();
			const wkvRects = d3.select(wkvRows[rowIdx]).selectAll('rect').nodes();
			const rwkvRects = d3.select(rwkvRows[rowIdx]).selectAll('rect').nodes();
			// Dim all cells first
			timeline.set(srRects, { opacity: 0.1 });
			timeline.set(wkvRects, { opacity: 0.1 });
			timeline.set(rwkvRects, { opacity: 0.1 });
			if (rowIdx === 0) {
				// First row: highlight elements synchronously
				srRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, wkvRects[i], rwkvRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, wkvRects[i], rwkvRects[i]],
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
				// Highlight the entire row for other rows
				timeline.fromTo(
					[srRects, wkvRects, rwkvRects].flat(),
					{ opacity: 0.1 },
					{ opacity: 1, duration: 0.01 },
					'<'
				);
			}
		});
	};

	// Event handlers
	let highlightCol: number | undefined = undefined;
	let highlightRow: number | undefined = undefined;

	const onMouseOverCell = (e, d) => {
		if (isAnimationActive) return;
		highlightRow = d.rowIndex;
		highlightCol = d.colIndex;
	};
	const onMouseOutSvg = () => {
		highlightCol = undefined;
		highlightRow = undefined;
	};

</script>

<WeightPopoverCard
	id="tmix-rwkv"
	title="RWKV Expansion"
	bind:isAnimationActive
	{timeline}
>
	<div class="rwkv-weight-popover weight-popover-content flex items-center justify-center">
		<!-- Sigmoid Receptance -->
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				Sigmoid Receptance
				<HelpPopover id="tmix-sr" placement="top">
					{`SR matrix gates WKV information for tokens and dimensions.`}
				</HelpPopover>
			</div>
			<!-- <div class="flex gap-0"> -->
				<Matrix
					className="tmix-sr"
					data={srData}
					showSize={false}
					cellHeight={rootRem * 0.8}
					cellWidth={2}
					rowGap={tokenGap}
					colorScale={srColorScale}
					highlightCol={highlightCol}
					highlightRow={highlightRow}
				/>
			<!-- </div> -->
			<div class="size">
				({tokenLen}, {$modelMeta.dimension / $modelMeta.timemix_head_num})
			</div>
		</div>

		<div class="operator">
			<div class="symbol mul">⊙</div>
		</div>

		<!-- WKV -->
		<div class="matrix flex flex-col items-center tmix-wkv">
			<div class="title flex items-center gap-1">
					WKV
					<HelpPopover id="tmix-wkv" placement="top">
						{`WKV matrix represents weighted key-value information.`}
					</HelpPopover>
			</div>
			<div class="flex gap-0">
				<Matrix
					className="tmix-wkv"
					data={wkvData}
					showSize={false}
					cellHeight={rootRem * 0.8}
					cellWidth={2}
					rowGap={tokenGap}
					colorScale={wkvColorScale}
					highlightCol={highlightCol}
					highlightRow={highlightRow}
				/>
			</div>
			<div class="size">
				({tokenLen}, {$modelMeta.dimension / $modelMeta.timemix_head_num})
			</div>
		</div>

		<!-- Equals symbol -->
		<div class="operator">
			<div class="symbol equal">=</div>
		</div>

		<!-- RWKV Result -->
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
					RWKV
					<HelpPopover id="tmix-rwkv" placement="top">
						{`SR multiplied by WKV equals RWKV`}
					</HelpPopover>
			</div>
			<div class="flex gap-0">
				<Matrix
					className="tmix-rwkv"
					data={rwkvData}
					showSize={false}
					cellHeight={rootRem * 0.8}
					cellWidth={2}
					rowGap={tokenGap}
					colorScale={rwkvColorScale}
					onMouseOverCell={onMouseOverCell}
					onMouseOutSvg={onMouseOutSvg}
					highlightCol={highlightCol}
					highlightRow={highlightRow}
				/>
			</div>
			<div class="size">
				({tokenLen}, {$modelMeta.dimension / $modelMeta.timemix_head_num})
			</div>
		</div>
	</div>
</WeightPopoverCard>

<style lang="scss">
	.weight-popover-content {
		/* make horizontal padding symmetric to avoid visual left bias */
		padding: 3rem 5rem 3rem 5rem;
		gap: 3rem;
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
	.formula {
		padding: 0.8rem;
	}
</style>
