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
	const visibleDimension = 18;
	$: tokenLen = $tokens.length;
	
	// Generate data
	$: rwkvData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	const outWeightData = Array(visibleDimension)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	$: rwkvoutData = Array(tokenLen)
		.fill(0)
		.map(() => Array(visibleDimension).fill(0).map(() => Math.random()));
	
	// Color scales
	const rwkvColorScale = (d: number) => {
		return d3.interpolate(theme.colors['indigo'][100], theme.colors['indigo'][400])(d);
	};
	const outWeightColorScale = (d: number) => {
		return d3.interpolate(theme.colors['gray'][100], theme.colors['gray'][400])(d);
	};
	const rwkvoutColorScale = (d: number) => {
		return d3.interpolate(theme.colors['purple'][100], theme.colors['purple'][400])(d);
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
		}
	});

	const draw = () => {
		const rwkvRows = d3.selectAll('.weight-popover-content .tmix-rwkv g.g-row').nodes();
		const outWeightCols = d3.selectAll('.weight-popover-content .tmix-outweight g.g-col').nodes();
		const rwkvoutRows = d3.selectAll('.weight-popover-content .tmix-rwkvout g.g-row').nodes();

		const equalSymbol = d3.select('.weight-popover-content .symbol.equal').node();

		timeline.clear();
		const highlight = '#94a3b8';

		const firstRWKVRowRects = d3.select(rwkvRows[0]).selectAll('rect').nodes();
		const firstRWKVOutRowRects = d3.select(rwkvoutRows[0]).selectAll('rect').nodes();

		firstRWKVOutRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(outWeightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstRWKVRowRects, { opacity: 0.1 });

			firstRWKVRowRects.forEach((rwkvRect, i) => {
				//embedding
				timeline
					.fromTo(
						rwkvRect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						rwkvRect,
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

		// out vectors
		rwkvoutRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const rwkvoutCells = d3.select(row).selectAll('rect').nodes();
			const rwkvRowRects = d3.select(rwkvRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					rwkvRowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const weightColRects = d3
					.selectAll('.weight-popover-content .tmix-outweight g.g-col rect')
					.nodes();
				timeline.set(weightColRects, { opacity: 0.1 });
			}

			rwkvoutCells.forEach((d, colIdx) => {
				const weightColRects = d3.select(outWeightCols[colIdx]).selectAll('rect').nodes();

				timeline.fromTo(
					weightColRects,
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
	id="tmix-rwkvout"
	title="RWKV Output Projection"
	bind:isAnimationActive
	{timeline}
>
	<div class="rwkvout-weight-popover weight-popover-content flex items-center justify-center">
		<!-- RWKV Input -->
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				RWKV<HelpPopover id="tmix-rwkv" placement="top"
				>{``}</HelpPopover
			>
			</div>
			<Matrix
				className="tmix-rwkv"
				data={rwkvData}
				showSize={false}
				cellHeight={rootRem * 0.8}
				cellWidth={2}
				rowGap={tokenGap}
				colorScale={rwkvColorScale}
				highlightRow={highlightRow}
			/>
			<div class="size">
				({tokenLen}, {$modelMeta.dimension / $modelMeta.timemix_head_num})
			</div>
		</div>

		<!-- Multiply symbol -->
		<div class="operator">
			<div class="symbol mul">&times;</div>
		</div>

		<!-- Output Weight -->
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				Out Weight
				<HelpPopover id="tmix-outweight" placement="top">
					{`output projection`}
				</HelpPopover>

			</div>
			
			<Matrix
				className="tmix-outweight"
				data={outWeightData}
				showSize={false}
				groupBy={'col'}
				cellHeight={3}
				cellWidth={3}
				rowGap={0}
				colorScale={outWeightColorScale}
				highlightCol={highlightCol}
			/>
			

			<div class="size">
				({$modelMeta.dimension / $modelMeta.timemix_head_num}, {$modelMeta.dimension})
			</div>
		</div>

		<!-- Equals symbol -->
		<div class="operator">
			<div class="symbol equal">=</div>
		</div>


		<!-- Output matrix -->
		<div class="matrix flex flex-col items-center output-matrix">
			<div class="title">RWKV Output</div>
			<div class="flex">
				<Matrix
					className="tmix-rwkvout"
					data={rwkvoutData}
					showSize={false}
					cellHeight={rootRem * 0.7}
					cellWidth={2}
					rowGap={tokenGap}
					colorScale={rwkvoutColorScale}
					onMouseOverCell={onMouseOverCell}
					onMouseOutSvg={onMouseOutSvg}
					highlightCol={highlightCol}
					highlightRow={highlightRow}
				/>
			</div>
			<div class="size">
				({tokenLen}, {$modelMeta.dimension})
			</div>
		</div>
	</div>
</WeightPopoverCard>

<style lang="scss">
	.weight-popover-content {
		padding: 3rem 5rem 3rem 5rem;
		gap: 2rem;
	}
	// .operator {
	// 	position: relative;
	// }
	// .matrix {
	// 	.title {
	// 		line-height: 1.1;
	// 		text-align: center;
	// 	}
	// }
</style>
