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
	import WeightPopoverCard from '../common/WeightPopoverCard.svelte';
	import HelpPopover from '../common/HelpPopover.svelte';

	const { theme } = resolveConfig(tailwindConfig);

	const tokenGap = 6;
	const visibleDimension = 8;
	$: tokenLen = $tokens.length;
	
	// Generate data for receptance and sigmoid receptance
	$: rData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: srData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	
	// Color scales
	const rColorScale = (d: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};
	const srColorScale = (d: number) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
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
		// Row-by-row highlight animation for r and Sigmoid r, emphasizing the "→" symbol
		const rRows = d3.selectAll('.weight-popover-content .tmix-r g.g-row').nodes();
		const srRows = d3.selectAll('.weight-popover-content .tmix-sr g.g-row').nodes();
		
		timeline.clear();
		const highlight = '#94a3b8';
		srRows.forEach((row, rowIdx) => {
			const srRects = d3.select(row).selectAll('rect').nodes();
			const rRects = d3.select(rRows[rowIdx]).selectAll('rect').nodes();

			// Dim all first
			timeline.set(srRects, { opacity: 0.1 });
			timeline.set(rRects, { opacity: 0.1 });
			if (rowIdx === 0) {
				// First row element-wise synchronized highlight
				srRects.forEach((rect, i) => {
					timeline
						.fromTo(
							[rect, rRects[i]],
							{ opacity: 0.1, strokeWidth: 0 },
							{ opacity: 1, duration: 0.05, strokeWidth: 10, stroke: highlight }
						)
						.to(
							[rect, rRects[i]],
							{ strokeWidth: 0, duration: 0.05 },
							'<50%'
						);
				});
				
			} else {
				// Other rows overall highlight
				timeline.fromTo(
					[srRects, rRects].flat(),
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

	const onMouseOverCell = (e: any, d: any) => {
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
	id="tmix-sr"
	title="Sigmoid Receptance"
	bind:isAnimationActive
	{timeline}
>
	<div class="sr-weight-popover weight-popover-content flex items-center justify-center">
		<!-- <div class="flex flex-row items-center gap-8"> -->
			<!-- Receptance -->
			<div class="matrix flex flex-col items-center">
				<div class="title flex items-center gap-1">
					Receptance
					<HelpPopover id="tmix-r" placement="top">
						{`Receptance vectors control attention gating in RWKV.`}
					</HelpPopover>
				</div>
				<!-- <div class="flex gap-0"> -->
					<Matrix
						className="tmix-r"
						data={rData}
						showSize={false}
						cellHeight={rootRem * 0.7}
						cellWidth={2}
						rowGap={tokenGap}
						colorScale={rColorScale}
						{highlightCol}
						{highlightRow}
					/>
				<!-- </div> -->
				<div class="size">
					({tokenLen}, {$modelMeta.dimension / $modelMeta.timemix_head_num})
				</div>
			</div>

			<div class="operator">
				<div class="symbol">→</div>
			</div>

			<!-- Sigmoid Receptance -->
			<div class="matrix flex flex-col items-center tmix-sr">
				<div class="title flex items-center gap-1">
					Sigmoid Receptance
					<HelpPopover id="tmix-sr" placement="top">
						{`Sigmoid Receptance represents the receptance vectors after applying the activation function.`}
					</HelpPopover>
				</div>
				<div class="flex gap-0">
					<Matrix
						className="tmix-sr"
						data={srData}
						showSize={false}
						cellHeight={rootRem * 0.7}
						cellWidth={2}
						rowGap={tokenGap}
						colorScale={srColorScale}
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
		<!-- </div> -->
	</div>
</WeightPopoverCard>

<style lang="scss">
	.weight-popover-content {
		padding: 3rem 5rem 3rem 5rem;
		gap: 3rem;
	}
	
</style>
